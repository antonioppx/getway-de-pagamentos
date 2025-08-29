#!/bin/bash

# Script para iniciar o Sistema de Pagamentos completo
# Inclui backend, frontend, banco de dados e monitoramento

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Função para sucesso
success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
        exit 1
    fi
    
    success "Docker e Docker Compose encontrados"
}

# Verificar se Node.js está instalado (para desenvolvimento)
check_node() {
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        success "Node.js encontrado: $node_version"
        return 0
    else
        warning "Node.js não encontrado. Apenas o modo Docker será usado."
        return 1
    fi
}

# Criar arquivo .env se não existir
setup_env() {
    if [ ! -f .env ]; then
        log "Criando arquivo .env..."
        cp .env.example .env
        
        # Gerar chaves secretas
        local jwt_secret=$(openssl rand -hex 32)
        local jwt_refresh_secret=$(openssl rand -hex 32)
        local redis_password=$(openssl rand -hex 16)
        local webhook_secret=$(openssl rand -hex 32)
        
        # Substituir no .env
        sed -i "s/your-super-secret-jwt-key-change-in-production/$jwt_secret/g" .env
        sed -i "s/your-super-secret-refresh-key-change-in-production/$jwt_refresh_secret/g" .env
        sed -i "s/redis123/$redis_password/g" .env
        sed -i "s/your-webhook-secret-change-in-production/$webhook_secret/g" .env
        
        success "Arquivo .env criado com chaves secretas geradas"
    else
        success "Arquivo .env já existe"
    fi
}

# Criar diretórios necessários
create_directories() {
    log "Criando diretórios necessários..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p ssl
    mkdir -p backups
    mkdir -p frontend/build
    
    success "Diretórios criados"
}

# Gerar certificados SSL para desenvolvimento
generate_ssl() {
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        log "Gerando certificados SSL para desenvolvimento..."
        
        mkdir -p ssl
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=Sao Paulo/O=Sistema de Pagamentos/CN=localhost"
        
        success "Certificados SSL gerados"
    else
        success "Certificados SSL já existem"
    fi
}

# Instalar dependências do frontend (se Node.js estiver disponível)
install_frontend_deps() {
    if check_node; then
        if [ -d "frontend" ]; then
            log "Instalando dependências do frontend..."
            cd frontend
            npm install
            cd ..
            success "Dependências do frontend instaladas"
        fi
    fi
}

# Construir frontend (se Node.js estiver disponível)
build_frontend() {
    if check_node; then
        if [ -d "frontend" ]; then
            log "Construindo frontend..."
            cd frontend
            npm run build
            cd ..
            success "Frontend construído"
        fi
    fi
}

# Iniciar serviços com Docker Compose
start_services() {
    log "Iniciando serviços com Docker Compose..."
    
    # Parar serviços existentes
    docker-compose down 2>/dev/null || true
    
    # Construir e iniciar
    docker-compose up --build -d
    
    success "Serviços iniciados"
}

# Aguardar serviços ficarem prontos
wait_for_services() {
    log "Aguardando serviços ficarem prontos..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
            success "Backend está pronto"
            break
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando backend..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "Backend não ficou pronto no tempo esperado"
        return 1
    fi
    
    # Aguardar frontend
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3001 >/dev/null 2>&1; then
            success "Frontend está pronto"
            break
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando frontend..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        warning "Frontend pode não estar totalmente pronto"
    fi
}

# Executar migrações do banco de dados
run_migrations() {
    log "Executando migrações do banco de dados..."
    
    # Aguardar banco ficar pronto
    sleep 10
    
    # Executar migrações
    docker-compose exec -T backend npm run migrate
    
    success "Migrações executadas"
}

# Executar seeds do banco de dados
run_seeds() {
    log "Executando seeds do banco de dados..."
    
    docker-compose exec -T backend npm run seed
    
    success "Seeds executados"
}

# Mostrar status dos serviços
show_status() {
    log "Verificando status dos serviços..."
    
    echo ""
    echo "=== STATUS DOS SERVIÇOS ==="
    docker-compose ps
    
    echo ""
    echo "=== LOGS RECENTES ==="
    docker-compose logs --tail=10
}

# Mostrar informações de acesso
show_access_info() {
    echo ""
    echo "=== INFORMAÇÕES DE ACESSO ==="
    echo ""
    echo "🌐 Frontend: http://localhost:3001"
    echo "🔧 Backend API: http://localhost:3000"
    echo "📊 Health Check: http://localhost:3000/api/health"
    echo "🗄️  PostgreSQL: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo ""
    echo "=== CREDENCIAIS DE TESTE ==="
    echo ""
    echo "👤 Admin:"
    echo "   Email: admin@pagamentos.com"
    echo "   Senha: admin123"
    echo ""
    echo "👤 Usuário:"
    echo "   Email: user@pagamentos.com"
    echo "   Senha: user123"
    echo ""
    echo "👤 Merchant:"
    echo "   Email: merchant@pagamentos.com"
    echo "   Senha: merchant123"
    echo ""
    echo "=== COMANDOS ÚTEIS ==="
    echo ""
    echo "📋 Ver logs: docker-compose logs -f"
    echo "🛑 Parar serviços: docker-compose down"
    echo "🔄 Reiniciar: docker-compose restart"
    echo "📊 Monitoramento: ./scripts/monitor.sh"
    echo "🧪 Testes: docker-compose exec backend npm test"
    echo ""
}

# Função principal
main() {
    echo ""
    echo "🚀 INICIANDO SISTEMA DE PAGAMENTOS"
    echo "=================================="
    echo ""
    
    # Verificações
    check_docker
    check_node || true
    
    # Setup
    setup_env
    create_directories
    generate_ssl
    install_frontend_deps
    build_frontend
    
    # Iniciar serviços
    start_services
    wait_for_services
    
    # Setup do banco
    run_migrations
    run_seeds
    
    # Mostrar informações
    show_status
    show_access_info
    
    echo ""
    success "🎉 Sistema de Pagamentos iniciado com sucesso!"
    echo ""
    echo "Acesse http://localhost:3001 para começar a usar o sistema."
    echo ""
}

# Verificar argumentos
case "${1:-}" in
    "stop")
        log "Parando serviços..."
        docker-compose down
        success "Serviços parados"
        ;;
    "restart")
        log "Reiniciando serviços..."
        docker-compose restart
        success "Serviços reiniciados"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        show_status
        ;;
    "monitor")
        ./scripts/monitor.sh
        ;;
    "help"|"-h"|"--help")
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos:"
        echo "  start     - Iniciar todos os serviços (padrão)"
        echo "  stop      - Parar todos os serviços"
        echo "  restart   - Reiniciar todos os serviços"
        echo "  logs      - Mostrar logs em tempo real"
        echo "  status    - Mostrar status dos serviços"
        echo "  monitor   - Executar monitoramento"
        echo "  help      - Mostrar esta ajuda"
        echo ""
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
