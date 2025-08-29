# Guia de Instalação Manual - Ubuntu

Este guia fornece instruções passo a passo para instalar o sistema de pagamentos em um servidor Ubuntu 20.04 LTS ou superior.

## Pré-requisitos

- Ubuntu 20.04 LTS ou superior
- Acesso root ou usuário com privilégios sudo
- Mínimo 2GB RAM
- Mínimo 20GB espaço em disco
- Conexão com internet

## 1. Atualizar o Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Instalar Dependências do Sistema

```bash
# Instalar dependências básicas
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versões
node --version
npm --version
```

## 3. Instalar PostgreSQL

```bash
# Adicionar repositório oficial do PostgreSQL
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Instalar PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql
```

## 4. Configurar PostgreSQL

```bash
# Mudar para usuário postgres
sudo -u postgres psql

# Criar banco de dados e usuário
CREATE DATABASE pagamentos;
CREATE USER pagamentos_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE pagamentos TO pagamentos_user;
ALTER USER pagamentos_user CREATEDB;

# Sair do PostgreSQL
\q
```

## 5. Instalar Redis

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis
sudo sed -i 's/# requirepass foobared/requirepass sua_senha_redis/g' /etc/redis/redis.conf
sudo sed -i 's/bind 127.0.0.1/bind 127.0.0.1 ::1/g' /etc/redis/redis.conf

# Iniciar e habilitar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server
```

## 6. Instalar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

## 7. Instalar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 8. Configurar Firewall

```bash
# Instalar UFW se não estiver instalado
sudo apt install -y ufw

# Configurar regras básicas
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

## 9. Clonar e Configurar o Projeto

```bash
# Criar diretório para o projeto
sudo mkdir -p /opt/pagamentos
sudo chown $USER:$USER /opt/pagamentos
cd /opt/pagamentos

# Clonar o repositório (substitua pela URL do seu repositório)
git clone https://github.com/seu-usuario/pagamentos.git .

# Instalar dependências
npm install

# Criar arquivo de ambiente
cp .env.example .env
```

## 10. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```bash
nano .env
```

Configure as seguintes variáveis:

```env
# Servidor
NODE_ENV=production
PORT=3000
API_URL=https://seu-dominio.com
FRONTEND_URL=https://seu-dominio.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pagamentos
DB_USER=pagamentos_user
DB_PASSWORD=sua_senha_segura
DATABASE_URL=postgresql://pagamentos_user:sua_senha_segura@localhost:5432/pagamentos

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha_redis
REDIS_URL=redis://:sua_senha_redis@localhost:6379

# JWT (gerar chaves seguras)
JWT_SECRET=sua_chave_jwt_super_secreta
JWT_REFRESH_SECRET=sua_chave_refresh_super_secreta
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (configurar SMTP real)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua_senha_app
EMAIL_FROM=noreply@seu-dominio.com

# Segurança
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info
LOG_FILE_PATH=/opt/pagamentos/logs

# Upload
UPLOAD_PATH=/opt/pagamentos/uploads
MAX_FILE_SIZE=5242880

# Webhook
WEBHOOK_SECRET=sua_chave_webhook_secreta
WEBHOOK_TIMEOUT=10000

# Pagamento
DEFAULT_CURRENCY=BRL
MIN_CHARGE_AMOUNT=0.01
MAX_CHARGE_AMOUNT=100000
DEFAULT_FEE_PERCENTAGE=2.99
DEFAULT_FEE_FIXED=0.30

# KYC
KYC_REQUIRED=true
KYC_DOCUMENT_TYPES=cpf,cnpj,rg,passport

# Limites
DEFAULT_DAILY_LIMIT=10000
DEFAULT_MONTHLY_LIMIT=100000
DEFAULT_TRANSACTION_LIMIT=5000

# Monitoramento
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# Cache
CACHE_TTL=3600
SESSION_TTL=86400
```

## 11. Criar Diretórios Necessários

```bash
# Criar diretórios
mkdir -p logs uploads ssl

# Definir permissões
chmod 755 logs uploads ssl
```

## 12. Gerar Certificados SSL

### Opção A: Certificados Auto-assinados (Desenvolvimento)

```bash
# Gerar certificados auto-assinados
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=Pagamentos/OU=IT/CN=seu-dominio.com"

# Definir permissões
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

### Opção B: Certificados Let's Encrypt (Produção)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 13. Configurar Nginx

Criar arquivo de configuração:

```bash
sudo nano /etc/nginx/sites-available/pagamentos
```

Conteúdo:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    # SSL
    ssl_certificate /opt/pagamentos/ssl/cert.pem;
    ssl_certificate_key /opt/pagamentos/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Authentication routes
    location /api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /api/health/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 10s;
        proxy_connect_timeout 5s;
    }

    # Frontend (quando implementado)
    location / {
        root /opt/pagamentos/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

Habilitar o site:

```bash
sudo ln -s /etc/nginx/sites-available/pagamentos /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 14. Compilar e Executar Migrações

```bash
# Compilar TypeScript
npm run build

# Executar migrações
npm run migrate

# Executar seeds
npm run seed
```

## 15. Iniciar a Aplicação com PM2

```bash
# Iniciar aplicação
pm2 start dist/server.js --name "pagamentos-api"

# Salvar configuração do PM2
pm2 save

# Verificar status
pm2 status
pm2 logs pagamentos-api
```

## 16. Configurar Logs

```bash
# Configurar rotação de logs
sudo nano /etc/logrotate.d/pagamentos
```

Conteúdo:

```
/opt/pagamentos/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 17. Configurar Backup Automático

```bash
# Criar script de backup
nano /opt/pagamentos/scripts/backup.sh
```

Conteúdo:

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/pagamentos"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do banco de dados
pg_dump -h localhost -U pagamentos_user -d pagamentos > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /opt/pagamentos uploads/

# Backup dos logs
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz -C /opt/pagamentos logs/

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: $DATE"
```

Tornar executável e agendar:

```bash
chmod +x /opt/pagamentos/scripts/backup.sh

# Agendar backup diário às 2h da manhã
crontab -e
# Adicionar linha: 0 2 * * * /opt/pagamentos/scripts/backup.sh
```

## 18. Configurar Monitoramento

```bash
# Instalar ferramentas de monitoramento
sudo apt install -y htop iotop nethogs

# Configurar alertas de disco
sudo apt install -y smartmontools
```

## 19. Testar a Instalação

```bash
# Testar health check
curl -k https://seu-dominio.com/api/health

# Testar login
curl -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pagamentos.com","password":"admin123"}'
```

## 20. Configurações de Segurança Adicional

```bash
# Configurar fail2ban
sudo apt install -y fail2ban

# Configurar SSH
sudo nano /etc/ssh/sshd_config
# Alterar: PermitRootLogin no
# Alterar: PasswordAuthentication no (se usar chaves SSH)

# Reiniciar SSH
sudo systemctl restart ssh
```

## Comandos Úteis

### Verificar Status dos Serviços

```bash
# Verificar status de todos os serviços
sudo systemctl status postgresql redis-server nginx

# Verificar logs da aplicação
pm2 logs pagamentos-api

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Manutenção

```bash
# Parar aplicação
pm2 stop pagamentos-api

# Reiniciar aplicação
pm2 restart pagamentos-api

# Atualizar código
git pull
npm install
npm run build
pm2 restart pagamentos-api

# Executar migrações
npm run migrate

# Backup manual
/opt/pagamentos/scripts/backup.sh
```

### Troubleshooting

```bash
# Verificar portas em uso
sudo netstat -tlnp

# Verificar uso de disco
df -h

# Verificar uso de memória
free -h

# Verificar processos
ps aux | grep node
```

## Próximos Passos

1. **Configurar domínio real** e certificados SSL válidos
2. **Implementar frontend** React/Vue.js
3. **Configurar monitoramento** (Prometheus, Grafana)
4. **Implementar backup** em nuvem
5. **Configurar CDN** para melhor performance
6. **Implementar testes automatizados**
7. **Configurar CI/CD** para deploy automático

## Suporte

Para suporte técnico, consulte:
- Documentação da API: `/docs/API.md`
- Logs da aplicação: `pm2 logs pagamentos-api`
- Logs do sistema: `sudo journalctl -u nginx`
