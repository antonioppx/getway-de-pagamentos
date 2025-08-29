# 🚀 Deploy no Railway.app - Gateway de Pagamentos

## 📋 Visão Geral

O Railway.app é uma plataforma excelente para deploy de aplicações Node.js com suporte nativo a PostgreSQL e Redis. Este guia mostra como fazer o deploy completo do sistema de gateway de pagamentos.

## 🎯 Vantagens do Railway

- ✅ **Deploy automático** via GitHub
- ✅ **PostgreSQL e Redis** nativos
- ✅ **SSL automático** (HTTPS)
- ✅ **Domínio personalizado** gratuito
- ✅ **Escalabilidade** automática
- ✅ **Logs em tempo real**
- ✅ **Variáveis de ambiente** seguras

## 🛠️ Pré-requisitos

- Conta no [Railway.app](https://railway.app)
- Conta no [GitHub](https://github.com)
- Repositório do projeto no GitHub
- Cartão de crédito (para serviços pagos)

## 📦 Estrutura do Projeto para Railway

### 1. Configuração do Backend

O Railway detectará automaticamente o `Dockerfile` e o `railway.json` para configurar o deploy.

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no painel do Railway:

```bash
# Configurações do Servidor
NODE_ENV=production
PORT=8000
API_URL=https://seu-app.railway.app
FRONTEND_URL=https://seu-frontend.railway.app

# Banco de dados (configurado automaticamente pelo Railway)
DB_HOST=${DATABASE_HOST}
DB_PORT=${DATABASE_PORT}
DB_NAME=${DATABASE_NAME}
DB_USER=${DATABASE_USER}
DB_PASSWORD=${DATABASE_PASSWORD}
DATABASE_URL=${DATABASE_URL}

# Redis (configurado automaticamente pelo Railway)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=${REDIS_URL}

# JWT (gerar chaves seguras)
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_2024
JWT_REFRESH_SECRET=sua_chave_refresh_jwt_super_secreta_aqui_2024
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (configurar SMTP real)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app
EMAIL_FROM=noreply@seu-dominio.com

# Segurança
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info

# Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# Webhook
WEBHOOK_SECRET=seu_webhook_secret_aqui
WEBHOOK_TIMEOUT=30000

# Pagamento
DEFAULT_CURRENCY=BRL
MIN_CHARGE_AMOUNT=0.01
MAX_CHARGE_AMOUNT=100000.00
DEFAULT_FEE_PERCENTAGE=2.99
DEFAULT_FEE_FIXED=0.30

# KYC
KYC_REQUIRED=true
KYC_DOCUMENT_TYPES=cpf,cnpj,rg,comprovante_residencia

# Limites
DEFAULT_DAILY_LIMIT=10000.00
DEFAULT_MONTHLY_LIMIT=100000.00
DEFAULT_TRANSACTION_LIMIT=5000.00

# Monitoramento
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# Cache
CACHE_TTL=3600
SESSION_TTL=86400
```

## 🚀 Passos para Deploy

### 1. Preparar o Repositório

1. **Faça push do código para o GitHub:**
```bash
git add .
git commit -m "Configuração para deploy no Railway"
git push origin main
```

2. **Verifique se os arquivos estão presentes:**
- ✅ `Dockerfile`
- ✅ `railway.json`
- ✅ `package.json`
- ✅ `src/server.ts`

### 2. Conectar ao Railway

1. **Acesse [Railway.app](https://railway.app)**
2. **Faça login com sua conta GitHub**
3. **Clique em "New Project"**
4. **Selecione "Deploy from GitHub repo"**
5. **Escolha seu repositório**

### 3. Configurar Serviços

#### 3.1 Backend (API)

1. **O Railway detectará automaticamente o Dockerfile**
2. **Configure as variáveis de ambiente** (lista acima)
3. **Adicione os plugins necessários:**

```bash
# Adicionar PostgreSQL
railway add

# Adicionar Redis
railway add
```

#### 3.2 Frontend (Opcional)

Se quiser deployar o frontend separadamente:

1. **Crie um novo serviço**
2. **Configure como serviço estático**
3. **Configure o build:**

```bash
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/build
```

### 4. Configurar Domínio

1. **Vá em "Settings" > "Domains"**
2. **Adicione um domínio personalizado** (opcional)
3. **O Railway fornecerá um domínio gratuito** automaticamente

### 5. Configurar Banco de Dados

1. **Adicione o plugin PostgreSQL:**
```bash
railway add
```

2. **Configure as variáveis de ambiente** para conectar ao banco
3. **Execute as migrações:**

```bash
# Via Railway CLI
railway run npm run migrate
railway run npm run seed
```

### 6. Configurar Redis

1. **Adicione o plugin Redis:**
```bash
railway add
```

2. **O Railway configurará automaticamente** as variáveis de ambiente

## 🔧 Configurações Avançadas

### Health Check

O Railway usará automaticamente o endpoint `/api/health` para verificar se a aplicação está funcionando.

### Logs

Acesse os logs em tempo real:
```bash
railway logs
```

### Variáveis de Ambiente

Configure via CLI:
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=sua_chave_secreta
```

### Deploy Manual

```bash
railway up
```

## 📊 Monitoramento

### Métricas Disponíveis

- **Uptime** da aplicação
- **Logs** em tempo real
- **Uso de recursos** (CPU, RAM)
- **Requisições** por minuto
- **Tempo de resposta**

### Alertas

Configure alertas para:
- **Downtime** da aplicação
- **Erros** de deploy
- **Uso alto** de recursos

## 🔒 Segurança

### SSL/HTTPS

- ✅ **Automático** no Railway
- ✅ **Certificados** renovados automaticamente
- ✅ **HSTS** habilitado

### Variáveis de Ambiente

- ✅ **Criptografadas** no Railway
- ✅ **Não expostas** nos logs
- ✅ **Backup** automático

## 💰 Custos

### Plano Gratuito
- **$5 de crédito** mensal
- **Adequado** para demos e testes
- **Limite** de uso

### Plano Pago
- **$20/mês** para uso ilimitado
- **Recursos** dedicados
- **Suporte** prioritário

## 🚀 Deploy Automático

### GitHub Actions (Opcional)

Crie `.github/workflows/railway-deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: railway/deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📱 URLs da Demo

Após o deploy, você terá:

- **API**: `https://seu-app.railway.app`
- **Frontend**: `https://seu-frontend.railway.app`
- **Health Check**: `https://seu-app.railway.app/api/health`
- **Docs**: `https://seu-app.railway.app/api/docs`

## 🧪 Testando o Deploy

### 1. Health Check
```bash
curl https://seu-app.railway.app/api/health
```

### 2. Teste de Cadastro
```bash
curl -X POST https://seu-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Railway",
    "email": "teste@railway.com",
    "password": "teste123",
    "cpf": "12345678901",
    "phone": "+5511999999999"
  }'
```

### 3. Teste de Login
```bash
curl -X POST https://seu-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@railway.com",
    "password": "teste123"
  }'
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Build Falha
```bash
# Verificar logs
railway logs

# Verificar Dockerfile
cat Dockerfile
```

#### 2. Banco não Conecta
```bash
# Verificar variáveis de ambiente
railway variables

# Testar conexão
railway run npm run migrate
```

#### 3. Redis não Conecta
```bash
# Verificar se o plugin está ativo
railway plugins

# Verificar variáveis
railway variables | grep REDIS
```

### Comandos Úteis

```bash
# Ver status
railway status

# Ver logs
railway logs

# Executar comando
railway run npm run migrate

# Abrir no navegador
railway open

# Ver variáveis
railway variables
```

## 🎯 Próximos Passos

### Para Produção

1. **Configurar domínio personalizado**
2. **Implementar integrações reais** de pagamento
3. **Configurar backup** automático do banco
4. **Implementar monitoramento** avançado
5. **Configurar CI/CD** completo

### Para Demo

1. **Compartilhar URL** com clientes
2. **Configurar credenciais** de teste
3. **Documentar** funcionalidades
4. **Preparar apresentação**

---

**🎉 Deploy no Railway concluído!**

Sua aplicação estará disponível em `https://seu-app.railway.app` com todas as funcionalidades do gateway de pagamentos funcionando perfeitamente.
