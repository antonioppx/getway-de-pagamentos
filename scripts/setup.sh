#!/bin/bash

# Script de setup para o sistema de pagamentos
# Este script configura o ambiente de desenvolvimento/produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar se Docker está instalado
check_docker() {
    print_message "Verificando se o Docker está instalado..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
        exit 1
    fi
    
    print_message "Docker e Docker Compose encontrados!"
}

# Verificar se Node.js está instalado (para desenvolvimento)
check_node() {
    print_message "Verificando se o Node.js está instalado..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js não está instalado. Será usado apenas o Docker."
        return 1
    fi
    
    NODE_VERSION=$(node --version)
    print_message "Node.js encontrado: $NODE_VERSION"
    return 0
}

# Criar arquivo .env se não existir
create_env_file() {
    if [ ! -f .env ]; then
        print_message "Criando arquivo .env..."
        cp .env.example .env
        
        # Gerar chaves secretas
        JWT_SECRET=$(openssl rand -base64 32)
        JWT_REFRESH_SECRET=$(openssl rand -base64 32)
        WEBHOOK_SECRET=$(openssl rand -base64 32)
        REDIS_PASSWORD=$(openssl rand -base64 16)
        
        # Substituir valores no .env
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/g" .env
        sed -i "s/your-super-secret-refresh-key-change-in-production/$JWT_REFRESH_SECRET/g" .env
        sed -i "s/your-webhook-secret-change-in-production/$WEBHOOK_SECRET/g" .env
        sed -i "s/redis123/$REDIS_PASSWORD/g" .env
        
        print_message "Arquivo .env criado com chaves secretas geradas automaticamente!"
    else
        print_message "Arquivo .env já existe!"
    fi
}

# Criar diretórios necessários
create_directories() {
    print_message "Criando diretórios necessários..."
    mkdir -p logs
    mkdir -p uploads
    mkdir -p ssl
    mkdir -p scripts
    
    print_message "Diretórios criados!"
}

# Gerar certificados SSL auto-assinados para desenvolvimento
generate_ssl_certificates() {
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        print_message "Gerando certificados SSL auto-assinados..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=BR/ST=SP/L=Sao Paulo/O=Pagamentos/OU=IT/CN=localhost"
        
        print_message "Certificados SSL gerados!"
    else
        print_message "Certificados SSL já existem!"
    fi
}

# Instalar dependências do Node.js (se disponível)
install_node_dependencies() {
    if check_node; then
        print_message "Instalando dependências do Node.js..."
        npm install
        
        print_message "Dependências instaladas!"
    fi
}

# Construir e iniciar containers
start_containers() {
    print_message "Construindo e iniciando containers..."
    docker-compose up -d --build
    
    print_message "Containers iniciados!"
}

# Aguardar serviços ficarem prontos
wait_for_services() {
    print_message "Aguardando serviços ficarem prontos..."
    
    # Aguardar PostgreSQL
    print_message "Aguardando PostgreSQL..."
    until docker-compose exec -T postgres pg_isready -U postgres; do
        sleep 2
    done
    
    # Aguardar Redis
    print_message "Aguardando Redis..."
    until docker-compose exec -T redis redis-cli ping; do
        sleep 2
    done
    
    # Aguardar Backend
    print_message "Aguardando Backend..."
    until curl -f http://localhost:3000/api/health/ping > /dev/null 2>&1; do
        sleep 5
    done
    
    print_message "Todos os serviços estão prontos!"
}

# Executar migrações do banco de dados
run_migrations() {
    print_message "Executando migrações do banco de dados..."
    docker-compose exec backend npm run migrate
    
    print_message "Migrações executadas!"
}

# Executar seeds do banco de dados
run_seeds() {
    print_message "Executando seeds do banco de dados..."
    docker-compose exec backend npm run seed
    
    print_message "Seeds executados!"
}

# Mostrar informações finais
show_final_info() {
    print_header "Setup Concluído!"
    
    echo -e "${GREEN}✅ Sistema de Pagamentos configurado com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📋 Informações importantes:${NC}"
    echo -e "  • API Backend: ${GREEN}http://localhost:3000${NC}"
    echo -e "  • Nginx Proxy: ${GREEN}https://localhost${NC}"
    echo -e "  • PostgreSQL: ${GREEN}localhost:5432${NC}"
    echo -e "  • Redis: ${GREEN}localhost:6379${NC}"
    echo ""
    echo -e "${BLUE}🔑 Credenciais de teste:${NC}"
    echo -e "  • Admin: ${GREEN}admin@pagamentos.com${NC} / ${GREEN}admin123${NC}"
    echo -e "  • User: ${GREEN}user@pagamentos.com${NC} / ${GREEN}user123${NC}"
    echo -e "  • Merchant: ${GREEN}merchant@pagamentos.com${NC} / ${GREEN}merchant123${NC}"
    echo ""
    echo -e "${BLUE}📚 Comandos úteis:${NC}"
    echo -e "  • Ver logs: ${GREEN}docker-compose logs -f${NC}"
    echo -e "  • Parar serviços: ${GREEN}docker-compose down${NC}"
    echo -e "  • Reiniciar: ${GREEN}docker-compose restart${NC}"
    echo -e "  • Executar migrações: ${GREEN}docker-compose exec backend npm run migrate${NC}"
    echo -e "  • Executar seeds: ${GREEN}docker-compose exec backend npm run seed${NC}"
    echo ""
    echo -e "${BLUE}🔗 Endpoints principais:${NC}"
    echo -e "  • Health Check: ${GREEN}https://localhost/api/health${NC}"
    echo -e "  • API Docs: ${GREEN}https://localhost/api/health/detailed${NC}"
    echo -e "  • Login: ${GREEN}https://localhost/api/auth/login${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "  • Este é um ambiente de desenvolvimento"
    echo -e "  • Certificados SSL são auto-assinados"
    echo -e "  • Altere as senhas e chaves secretas em produção"
    echo -e "  • Configure variáveis de ambiente adequadamente"
}

# Função principal
main() {
    print_header "Setup do Sistema de Pagamentos"
    
    check_docker
    create_env_file
    create_directories
    generate_ssl_certificates
    install_node_dependencies
    start_containers
    wait_for_services
    run_migrations
    run_seeds
    show_final_info
}

# Executar função principal
main "$@"
