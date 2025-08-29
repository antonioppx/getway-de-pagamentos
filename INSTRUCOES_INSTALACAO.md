# 🚀 INSTRUÇÕES DE INSTALAÇÃO - SISTEMA DE PAGAMENTOS

## 📋 Pré-requisitos

### Para Deploy com Docker (Recomendado):
- Docker Desktop instalado
- Docker Compose instalado
- Mínimo 4GB RAM disponível

### Para Deploy Manual:
- Node.js 18+ instalado
- PostgreSQL 13+ instalado
- Redis 6+ instalado
- NPM ou Yarn

---

## 🐳 INSTALAÇÃO COM DOCKER (RECOMENDADO)

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd pagamentos
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 3. Execute o script de inicialização
```bash
# No Windows (PowerShell)
./scripts/start.sh

# No Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh
```

### 4. Acesse o sistema
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

---

## 🔧 INSTALAÇÃO MANUAL

### 1. Configure o banco de dados PostgreSQL
```sql
CREATE DATABASE pagamentos;
CREATE USER pagamentos_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE pagamentos TO pagamentos_user;
```

### 2. Configure o Redis
```bash
# Instale o Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Inicie o Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Instale as dependências
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 5. Execute as migrações
```bash
npm run migrate
npm run seed
```

### 6. Inicie os serviços
```bash
# Backend
npm run dev

# Frontend (em outro terminal)
cd frontend
npm start
```

---

## 🔐 CREDENCIAIS DE TESTE

### Admin
- **Email**: admin@pagamentos.com
- **Senha**: admin123

### Usuário
- **Email**: user@pagamentos.com
- **Senha**: user123

### Merchant
- **Email**: merchant@pagamentos.com
- **Senha**: merchant123

---

## 📡 ENDPOINTS PRINCIPAIS

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout

### Usuários
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil
- `GET /api/users/balance` - Saldo da carteira
- `GET /api/users/dashboard` - Dashboard

### Cobranças
- `POST /api/charges` - Criar cobrança PIX
- `GET /api/charges/:id` - Consultar cobrança
- `GET /api/charges` - Listar cobranças
- `POST /api/charges/:id/cancel` - Cancelar

### Payouts
- `POST /api/payouts` - Criar payout
- `GET /api/payouts/:id` - Consultar payout
- `GET /api/payouts` - Listar payouts

### Admin
- `GET /api/admin/users` - Listar usuários
- `PUT /api/admin/users/:id/kyc` - Aprovar KYC
- `GET /api/admin/dashboard` - Dashboard admin

### Webhooks
- `POST /webhooks/charge-status` - Status de cobrança
- `POST /webhooks/payout-status` - Status de payout

---

## 🛠️ COMANDOS ÚTEIS

### Docker
```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild
docker-compose up --build -d
```

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes
npm test

# Executar migrações
npm run migrate

# Executar seeds
npm run seed
```

---

## 🔧 CONFIGURAÇÕES IMPORTANTES

### Variáveis de Ambiente (.env)
```bash
# Configurações do Servidor
NODE_ENV=production
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pagamentos
DB_USER=pagamentos_user
DB_PASSWORD=sua_senha_segura

# Configurações do Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Configurações de Autenticação
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_jwt_super_secreta_aqui

# Configurações PIX
PIX_KEY=sua_chave_pix_aqui
PIX_MERCHANT_NAME=Seu Nome
PIX_MERCHANT_CITY=SUA CIDADE
```

---

## 🚨 TROUBLESHOOTING

### Problema: Docker não inicia
```bash
# Verifique se o Docker está rodando
docker --version
docker-compose --version

# Reinicie o Docker Desktop
# No Windows: Reinicie o Docker Desktop
# No Linux: sudo systemctl restart docker
```

### Problema: Banco de dados não conecta
```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql

# Verifique as credenciais no .env
# Teste a conexão
psql -h localhost -U pagamentos_user -d pagamentos
```

### Problema: Redis não conecta
```bash
# Verifique se o Redis está rodando
redis-cli ping

# Deve retornar: PONG
```

### Problema: Portas ocupadas
```bash
# Verifique portas em uso
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Mate processos se necessário
kill -9 <PID>
```

---

## 📞 SUPORTE

Se encontrar problemas durante a instalação:

1. Verifique se todos os pré-requisitos estão instalados
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique os logs dos serviços
4. Consulte a documentação completa em `docs/`

---

## 🎯 PRÓXIMOS PASSOS

Após a instalação bem-sucedida:

1. **Configure SSL/HTTPS** para produção
2. **Configure backups** do banco de dados
3. **Configure monitoramento** e alertas
4. **Personalize** a interface conforme sua marca
5. **Integre** com gateways de pagamento reais
6. **Configure** webhooks para seu sistema

---

**✅ Sistema pronto para uso em produção!**
