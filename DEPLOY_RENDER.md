# 🚀 Deploy no Render.com - Gateway de Pagamentos

## 📋 Visão Geral

O Render.com é uma plataforma moderna para deploy de aplicações com suporte nativo a PostgreSQL, Redis e serviços estáticos. Este guia mostra como fazer o deploy completo do sistema de gateway de pagamentos.

## 🎯 Vantagens do Render

- ✅ **Deploy automático** via GitHub
- ✅ **PostgreSQL e Redis** nativos
- ✅ **SSL automático** (HTTPS)
- ✅ **Domínio personalizado** gratuito
- ✅ **Escalabilidade** automática
- ✅ **Logs em tempo real**
- ✅ **Variáveis de ambiente** seguras
- ✅ **Plano gratuito** generoso

## 🛠️ Pré-requisitos

- Conta no [Render.com](https://render.com)
- Conta no [GitHub](https://github.com)
- Repositório do projeto no GitHub
- Cartão de crédito (para serviços pagos)

## 📦 Estrutura do Projeto para Render

### 1. Configuração do Backend

O Render detectará automaticamente o `render.yaml` e configurará os serviços.

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no painel do Render:

```bash
# Configurações do Servidor
NODE_ENV=production
PORT=10000
API_URL=https://gateway-pagamentos-api.onrender.com
FRONTEND_URL=https://gateway-pagamentos-frontend.onrender.com

# Banco de dados (configurado automaticamente pelo Render)
DB_HOST=${DATABASE_HOST}
DB_PORT=${DATABASE_PORT}
DB_NAME=${DATABASE_NAME}
DB_USER=${DATABASE_USER}
DB_PASSWORD=${DATABASE_PASSWORD}
DATABASE_URL=${DATABASE_URL}

# Redis (configurado automaticamente pelo Render)
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
git commit -m "Configuração para deploy no Render"
git push origin main
```

2. **Verifique se os arquivos estão presentes:**
- ✅ `render.yaml`
- ✅ `package.json`
- ✅ `src/server.ts`
- ✅ `frontend/package.json` (se aplicável)

### 2. Conectar ao Render

1. **Acesse [Render.com](https://render.com)**
2. **Faça login com sua conta GitHub**
3. **Clique em "New +"**
4. **Selecione "Blueprint"**
5. **Conecte seu repositório GitHub**

### 3. Configurar Blueprint

O Render detectará automaticamente o `render.yaml` e criará:

- **Web Service** para a API
- **Static Site** para o frontend
- **PostgreSQL Database**
- **Redis Instance**

### 4. Configurar Serviços

#### 4.1 Backend (API)

1. **O Render criará automaticamente** o serviço web
2. **Configure as variáveis de ambiente** (lista acima)
3. **Verifique as configurações:**

```yaml
# render.yaml já configurado
- type: web
  name: gateway-pagamentos-api
  env: node
  plan: starter
  buildCommand: npm install && npm run build
  startCommand: npm run start:prod
  healthCheckPath: /api/health
```

#### 4.2 Frontend

1. **O Render criará automaticamente** o site estático
2. **Configure o build:**

```yaml
# render.yaml já configurado
- type: web
  name: gateway-pagamentos-frontend
  env: static
  plan: starter
  buildCommand: cd frontend && npm install && npm run build
  staticPublishPath: frontend/build
```

#### 4.3 Banco de Dados

1. **O Render criará automaticamente** o PostgreSQL
2. **Configure as variáveis de ambiente** para conectar ao banco
3. **Execute as migrações:**

```bash
# Via Render Shell
render shell gateway-pagamentos-api
npm run migrate
npm run seed
```

#### 4.4 Redis

1. **O Render criará automaticamente** a instância Redis
2. **As variáveis de ambiente** serão configuradas automaticamente

### 5. Configurar Domínio

1. **Vá em "Settings" > "Custom Domains"**
2. **Adicione um domínio personalizado** (opcional)
3. **O Render fornecerá um domínio gratuito** automaticamente

## 🔧 Configurações Avançadas

### Health Check

O Render usará automaticamente o endpoint `/api/health` para verificar se a aplicação está funcionando.

### Logs

Acesse os logs em tempo real:
- **Via Dashboard**: Logs em tempo real
- **Via CLI**: `render logs gateway-pagamentos-api`

### Variáveis de Ambiente

Configure via Dashboard:
1. **Vá em "Environment"**
2. **Adicione as variáveis** da lista acima
3. **Clique em "Save Changes"**

### Deploy Manual

```bash
# Via Dashboard
# Clique em "Manual Deploy"

# Via CLI
render deploy gateway-pagamentos-api
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

- ✅ **Automático** no Render
- ✅ **Certificados** renovados automaticamente
- ✅ **HSTS** habilitado

### Variáveis de Ambiente

- ✅ **Criptografadas** no Render
- ✅ **Não expostas** nos logs
- ✅ **Backup** automático

## 💰 Custos

### Plano Gratuito
- **$0/mês** para serviços básicos
- **750 horas** de runtime por mês
- **Adequado** para demos e testes

### Plano Pago
- **$7/mês** por serviço web
- **$7/mês** por banco PostgreSQL
- **$7/mês** por Redis
- **Recursos** dedicados

## 🚀 Deploy Automático

### GitHub Integration

O Render se conecta automaticamente ao GitHub e faz deploy a cada push:

1. **Push para main** → Deploy automático
2. **Pull Request** → Preview deployment
3. **Merge** → Deploy para produção

### Branch Deployments

Configure branches específicas:
```yaml
# render.yaml
branch: main  # Branch para deploy
```

## 📱 URLs da Demo

Após o deploy, você terá:

- **API**: `https://gateway-pagamentos-api.onrender.com`
- **Frontend**: `https://gateway-pagamentos-frontend.onrender.com`
- **Health Check**: `https://gateway-pagamentos-api.onrender.com/api/health`
- **Docs**: `https://gateway-pagamentos-api.onrender.com/api/docs`

## 🧪 Testando o Deploy

### 1. Health Check
```bash
curl https://gateway-pagamentos-api.onrender.com/api/health
```

### 2. Teste de Cadastro
```bash
curl -X POST https://gateway-pagamentos-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Render",
    "email": "teste@render.com",
    "password": "teste123",
    "cpf": "12345678901",
    "phone": "+5511999999999"
  }'
```

### 3. Teste de Login
```bash
curl -X POST https://gateway-pagamentos-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@render.com",
    "password": "teste123"
  }'
```

### 4. Teste de Cobrança PIX
```bash
# Primeiro faça login para obter o token
TOKEN=$(curl -s -X POST https://gateway-pagamentos-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@render.com", "password": "teste123"}' | \
  grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Criar cobrança PIX
curl -X POST https://gateway-pagamentos-api.onrender.com/api/charges \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Teste de cobrança PIX no Render",
    "payment_method": "pix"
  }'
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Build Falha
```bash
# Verificar logs
render logs gateway-pagamentos-api

# Verificar package.json
cat package.json
```

#### 2. Banco não Conecta
```bash
# Verificar variáveis de ambiente
render env gateway-pagamentos-api

# Testar conexão
render shell gateway-pagamentos-api
npm run migrate
```

#### 3. Redis não Conecta
```bash
# Verificar se o serviço está ativo
render ps

# Verificar variáveis
render env gateway-pagamentos-api | grep REDIS
```

#### 4. Frontend não Carrega
```bash
# Verificar build
render logs gateway-pagamentos-frontend

# Verificar configuração
cat render.yaml
```

### Comandos Úteis

```bash
# Ver status
render ps

# Ver logs
render logs gateway-pagamentos-api

# Executar comando
render shell gateway-pagamentos-api

# Abrir no navegador
render open gateway-pagamentos-api

# Ver variáveis
render env gateway-pagamentos-api
```

### Logs Detalhados

```bash
# Logs em tempo real
render logs gateway-pagamentos-api --follow

# Logs de build
render logs gateway-pagamentos-api --build

# Logs de deploy
render logs gateway-pagamentos-api --deploy
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

## 📋 Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Código no GitHub
- [ ] `render.yaml` configurado
- [ ] `package.json` com scripts corretos
- [ ] Variáveis de ambiente preparadas

### ✅ Deploy
- [ ] Blueprint criado no Render
- [ ] Serviços configurados
- [ ] Banco de dados criado
- [ ] Redis configurado
- [ ] Variáveis de ambiente definidas

### ✅ Pós-Deploy
- [ ] Health check funcionando
- [ ] Migrações executadas
- [ ] Dados de seed inseridos
- [ ] API respondendo
- [ ] Frontend carregando
- [ ] Testes básicos passando

---

**🎉 Deploy no Render concluído!**

Sua aplicação estará disponível em `https://gateway-pagamentos-api.onrender.com` com todas as funcionalidades do gateway de pagamentos funcionando perfeitamente.
