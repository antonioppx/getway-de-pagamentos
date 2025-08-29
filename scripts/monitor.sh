#!/bin/bash

# Script de monitoramento do Sistema de Pagamentos
# Verifica saúde dos serviços, logs e métricas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_URL="${API_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
LOG_FILE="/var/log/pagamentos/monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@pagamentos.com}"

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para sucesso
success() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1" | tee -a "$LOG_FILE"
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para verificar saúde da API
check_api_health() {
    log "Verificando saúde da API..."
    
    if curl -f -s "$API_URL/api/health" >/dev/null 2>&1; then
        success "API está respondendo"
        return 0
    else
        error "API não está respondendo"
        return 1
    fi
}

# Função para verificar saúde detalhada da API
check_detailed_health() {
    log "Verificando saúde detalhada da API..."
    
    local response
    response=$(curl -s "$API_URL/api/health/detailed" 2>/dev/null || echo "{}")
    
    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local status=$(echo "$response" | jq -r '.data.status')
        local database=$(echo "$response" | jq -r '.data.database')
        local redis=$(echo "$response" | jq -r '.data.redis')
        
        if [ "$status" = "healthy" ]; then
            success "API está saudável"
        else
            warning "API com problemas: $status"
        fi
        
        if [ "$database" = "connected" ]; then
            success "Database conectado"
        else
            error "Database desconectado"
        fi
        
        if [ "$redis" = "connected" ]; then
            success "Redis conectado"
        else
            error "Redis desconectado"
        fi
    else
        error "Não foi possível obter dados de saúde da API"
    fi
}

# Função para verificar containers Docker
check_docker_containers() {
    log "Verificando containers Docker..."
    
    if ! command_exists docker; then
        warning "Docker não está instalado"
        return 0
    fi
    
    local containers=("pagamentos_postgres" "pagamentos_redis" "pagamentos_backend" "pagamentos_frontend" "pagamentos_nginx")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container"; then
            local status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container" | awk '{print $2}')
            if [[ "$status" == *"healthy"* ]] || [[ "$status" == *"Up"* ]]; then
                success "Container $container está rodando"
            else
                error "Container $container com problemas: $status"
                all_healthy=false
            fi
        else
            error "Container $container não está rodando"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        success "Todos os containers estão saudáveis"
    else
        return 1
    fi
}

# Função para verificar uso de recursos
check_system_resources() {
    log "Verificando recursos do sistema..."
    
    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage < 80" | bc -l) )); then
        success "CPU: ${cpu_usage}%"
    else
        warning "CPU: ${cpu_usage}% (alto uso)"
    fi
    
    # Memória
    local mem_total=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    local mem_used=$(free -m | awk 'NR==2{printf "%.0f", $3}')
    local mem_percent=$((mem_used * 100 / mem_total))
    
    if [ "$mem_percent" -lt 80 ]; then
        success "Memória: ${mem_percent}% (${mem_used}MB/${mem_total}MB)"
    else
        warning "Memória: ${mem_percent}% (${mem_used}MB/${mem_total}MB) - alto uso"
    fi
    
    # Disco
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        success "Disco: ${disk_usage}%"
    else
        warning "Disco: ${disk_usage}% - pouco espaço"
    fi
}

# Função para verificar logs de erro
check_error_logs() {
    log "Verificando logs de erro..."
    
    local log_dir="./logs"
    local error_count=0
    
    if [ -d "$log_dir" ]; then
        # Conta erros nas últimas 24 horas
        error_count=$(find "$log_dir" -name "*.log" -type f -mtime -1 -exec grep -l "ERROR\|FATAL" {} \; | wc -l)
        
        if [ "$error_count" -eq 0 ]; then
            success "Nenhum erro encontrado nos logs das últimas 24h"
        else
            warning "Encontrados $error_count arquivos de log com erros nas últimas 24h"
            
            # Mostra últimos erros
            echo "Últimos erros encontrados:"
            find "$log_dir" -name "*.log" -type f -mtime -1 -exec grep -H "ERROR\|FATAL" {} \; | tail -5
        fi
    else
        warning "Diretório de logs não encontrado: $log_dir"
    fi
}

# Função para verificar conectividade de rede
check_network() {
    log "Verificando conectividade de rede..."
    
    # Testa conectividade com internet
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        success "Conectividade com internet OK"
    else
        error "Problemas de conectividade com internet"
    fi
    
    # Testa DNS
    if nslookup google.com >/dev/null 2>&1; then
        success "DNS funcionando"
    else
        error "Problemas com DNS"
    fi
}

# Função para verificar portas
check_ports() {
    log "Verificando portas dos serviços..."
    
    local ports=("3000" "3001" "5432" "6379" "80" "443")
    local all_open=true
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            success "Porta $port está aberta"
        else
            error "Porta $port não está aberta"
            all_open=false
        fi
    done
    
    if [ "$all_open" = true ]; then
        success "Todas as portas necessárias estão abertas"
    else
        return 1
    fi
}

# Função para verificar backups
check_backups() {
    log "Verificando backups..."
    
    local backup_dir="./backups"
    local latest_backup
    
    if [ -d "$backup_dir" ]; then
        latest_backup=$(find "$backup_dir" -name "*.sql" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
        
        if [ -n "$latest_backup" ]; then
            local backup_age=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600 ))
            
            if [ "$backup_age" -lt 24 ]; then
                success "Backup recente encontrado: $(basename "$latest_backup") (${backup_age}h atrás)"
            else
                warning "Backup antigo: $(basename "$latest_backup") (${backup_age}h atrás)"
            fi
        else
            warning "Nenhum backup encontrado"
        fi
    else
        warning "Diretório de backups não encontrado: $backup_dir"
    fi
}

# Função para gerar relatório
generate_report() {
    log "Gerando relatório de monitoramento..."
    
    local report_file="./monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== RELATÓRIO DE MONITORAMENTO - $(date) ==="
        echo ""
        echo "=== SAÚDE DOS SERVIÇOS ==="
        check_api_health
        check_detailed_health
        check_docker_containers
        echo ""
        echo "=== RECURSOS DO SISTEMA ==="
        check_system_resources
        echo ""
        echo "=== REDE E CONECTIVIDADE ==="
        check_network
        check_ports
        echo ""
        echo "=== LOGS E BACKUPS ==="
        check_error_logs
        check_backups
        echo ""
        echo "=== FIM DO RELATÓRIO ==="
    } > "$report_file"
    
    success "Relatório gerado: $report_file"
}

# Função para enviar alerta por email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command_exists mail; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "Alerta enviado para $ALERT_EMAIL"
    else
        warning "Comando 'mail' não encontrado. Não foi possível enviar alerta."
    fi
}

# Função principal
main() {
    log "Iniciando monitoramento do Sistema de Pagamentos..."
    
    local exit_code=0
    
    # Verificações básicas
    check_api_health || exit_code=1
    check_docker_containers || exit_code=1
    check_ports || exit_code=1
    
    # Verificações detalhadas
    check_detailed_health
    check_system_resources
    check_network
    check_error_logs
    check_backups
    
    # Gerar relatório
    generate_report
    
    # Enviar alerta se necessário
    if [ $exit_code -ne 0 ]; then
        send_alert "ALERTA: Problemas detectados no Sistema de Pagamentos" \
                   "Foram detectados problemas durante o monitoramento. Verifique o relatório gerado."
    fi
    
    log "Monitoramento concluído com código de saída: $exit_code"
    exit $exit_code
}

# Verificar argumentos
case "${1:-}" in
    "health")
        check_api_health
        ;;
    "detailed")
        check_detailed_health
        ;;
    "docker")
        check_docker_containers
        ;;
    "resources")
        check_system_resources
        ;;
    "logs")
        check_error_logs
        ;;
    "network")
        check_network
        ;;
    "ports")
        check_ports
        ;;
    "backups")
        check_backups
        ;;
    "report")
        generate_report
        ;;
    "help"|"-h"|"--help")
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos:"
        echo "  health     - Verificar saúde básica da API"
        echo "  detailed   - Verificar saúde detalhada da API"
        echo "  docker     - Verificar containers Docker"
        echo "  resources  - Verificar recursos do sistema"
        echo "  logs       - Verificar logs de erro"
        echo "  network    - Verificar conectividade de rede"
        echo "  ports      - Verificar portas dos serviços"
        echo "  backups    - Verificar backups"
        echo "  report     - Gerar relatório completo"
        echo "  help       - Mostrar esta ajuda"
        echo ""
        echo "Sem argumentos: executa todas as verificações"
        ;;
    "")
        main
        ;;
    *)
        error "Comando desconhecido: $1"
        echo "Use '$0 help' para ver os comandos disponíveis"
        exit 1
        ;;
esac
