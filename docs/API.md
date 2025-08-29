# Documentação da API - Sistema de Pagamentos

## Visão Geral

Esta API fornece funcionalidades completas para um sistema de gateway de pagamentos, incluindo autenticação, gestão de usuários, cobranças, payouts, webhooks e painel administrativo.

## Base URL

```
https://localhost/api
```

## Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. A maioria dos endpoints requer um token de acesso válido no header `Authorization`.

```
Authorization: Bearer <access_token>
```

## Endpoints

### Autenticação

#### POST /auth/register
Registra um novo usuário.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "cpf": "12345678901",
  "phone": "+5511999999999",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "cpf": "12345678901",
      "phone": "+5511999999999",
      "role": "user",
      "status": "active",
      "kyc_status": "pending",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /auth/login
Realiza login do usuário.

**Body:**
```json
{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "cpf": "12345678901",
      "phone": "+5511999999999",
      "role": "user",
      "status": "active",
      "kyc_status": "approved",
      "balance": 1000.00,
      "last_login": "2024-01-01T00:00:00Z"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### POST /auth/refresh
Renova o token de acesso usando o refresh token.

**Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

#### POST /auth/logout
Realiza logout do usuário.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

#### POST /auth/forgot-password
Solicita recuperação de senha.

**Body:**
```json
{
  "email": "joao@exemplo.com"
}
```

#### POST /auth/reset-password
Redefine a senha usando token de reset.

**Body:**
```json
{
  "token": "reset_token",
  "new_password": "nova_senha123"
}
```

#### GET /auth/verify
Verifica se o token é válido.

**Headers:** `Authorization: Bearer <token>`

### Usuários

#### GET /users/profile
Obtém o perfil do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

#### PUT /users/profile
Atualiza o perfil do usuário.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "João Silva Atualizado",
  "phone": "+5511888888888"
}
```

#### GET /users/balance
Obtém o saldo atual do usuário.

**Headers:** `Authorization: Bearer <token>`

#### GET /users/transactions
Lista as transações do usuário.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Itens por página
- `type` (string): Tipo de transação (charge, payout)
- `status` (string): Status da transação
- `start_date` (string): Data inicial (YYYY-MM-DD)
- `end_date` (string): Data final (YYYY-MM-DD)

#### POST /users/kyc
Envia documento para KYC.

**Headers:** `Authorization: Bearer <token>`

**Body:** `multipart/form-data`
- `document_type`: Tipo do documento (cpf, cnpj, rg, passport)
- `file`: Arquivo do documento

#### GET /users/kyc
Lista documentos KYC do usuário.

**Headers:** `Authorization: Bearer <token>`

#### GET /users/stats
Obtém estatísticas do usuário.

**Headers:** `Authorization: Bearer <token>`

### Cobranças

#### POST /charges
Cria uma nova cobrança.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "amount": 100.00,
  "description": "Pagamento de serviço",
  "payment_method": "pix",
  "expires_at": "2024-01-02T00:00:00Z",
  "customer": {
    "name": "Cliente Exemplo",
    "email": "cliente@exemplo.com",
    "document": "12345678901"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 100.00,
    "fee_amount": 3.29,
    "total_amount": 103.29,
    "description": "Pagamento de serviço",
    "payment_method": "pix",
    "status": "pending",
    "pix_code": "00020126580014br.gov.bcb.pix0136...",
    "expires_at": "2024-01-02T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### GET /charges
Lista cobranças do usuário.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Itens por página
- `status` (string): Status da cobrança
- `payment_method` (string): Método de pagamento
- `start_date` (string): Data inicial (YYYY-MM-DD)
- `end_date` (string): Data final (YYYY-MM-DD)

#### GET /charges/:id
Obtém detalhes de uma cobrança específica.

**Headers:** `Authorization: Bearer <token>`

#### POST /charges/:id/cancel
Cancela uma cobrança pendente.

**Headers:** `Authorization: Bearer <token>`

### Payouts

#### POST /payouts
Cria um novo payout (saque).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "amount": 500.00,
  "bank_account": {
    "bank_code": "001",
    "agency": "1234",
    "account": "12345678",
    "account_type": "checking"
  },
  "description": "Saque para conta bancária"
}
```

#### GET /payouts
Lista payouts do usuário.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Itens por página
- `status` (string): Status do payout
- `start_date` (string): Data inicial (YYYY-MM-DD)
- `end_date` (string): Data final (YYYY-MM-DD)

#### GET /payouts/:id
Obtém detalhes de um payout específico.

**Headers:** `Authorization: Bearer <token>`

### Webhooks

#### POST /webhooks
Configura um novo webhook.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "url": "https://meusite.com/webhook",
  "events": ["charge.paid", "charge.expired", "payout.completed"],
  "description": "Webhook para notificações"
}
```

#### GET /webhooks
Lista webhooks do usuário.

**Headers:** `Authorization: Bearer <token>`

#### GET /webhooks/:id
Obtém detalhes de um webhook específico.

**Headers:** `Authorization: Bearer <token>`

#### PUT /webhooks/:id
Atualiza um webhook.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "url": "https://meusite.com/webhook-novo",
  "events": ["charge.paid", "payout.completed"],
  "active": true
}
```

#### DELETE /webhooks/:id
Remove um webhook.

**Headers:** `Authorization: Bearer <token>`

#### POST /webhooks/:id/test
Envia um evento de teste para o webhook.

**Headers:** `Authorization: Bearer <token>`

### Painel Administrativo

#### GET /admin/dashboard
Obtém estatísticas do dashboard administrativo.

**Headers:** `Authorization: Bearer <token>`
**Permissão:** Admin

#### GET /admin/users
Lista todos os usuários.

**Headers:** `Authorization: Bearer <token>`
**Permissão:** Admin

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Itens por página
- `status` (string): Status do usuário
- `role` (string): Role do usuário
- `kyc_status` (string): Status KYC
- `search` (string): Busca por nome ou email

#### PUT /admin/users/:id/kyc
Atualiza status KYC de um usuário.

**Headers:** `Authorization: Bearer <token>`
**Permissão:** Admin

**Body:**
```json
{
  "kyc_status": "approved",
  "notes": "Documentos aprovados"
}
```

#### POST /admin/settings/fees
Configura taxas de pagamento.

**Headers:** `Authorization: Bearer <token>`
**Permissão:** Admin

**Body:**
```json
{
  "payment_method": "pix",
  "percentage_fee": 2.99,
  "fixed_fee": 0.30,
  "min_amount": 0.01,
  "max_amount": 10000.00
}
```

#### GET /admin/settings/fees
Lista configurações de taxas.

**Headers:** `Authorization: Bearer <token>`
**Permissão:** Admin

### Health Check

#### GET /health
Health check básico.

#### GET /health/detailed
Health check detalhado com status de todos os serviços.

#### GET /health/ping
Health check simples (pong).

#### GET /health/ready
Verifica se o sistema está pronto para receber tráfego.

#### GET /health/live
Verifica se o processo está vivo.

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autorizado
- `403` - Proibido
- `404` - Não encontrado
- `422` - Dados inválidos
- `429` - Muitas requisições
- `500` - Erro interno do servidor
- `503` - Serviço indisponível

## Rate Limiting

A API implementa rate limiting para proteger contra abuso:

- **Endpoints gerais:** 100 requisições por 15 minutos
- **Autenticação:** 5 requisições por 15 minutos
- **Cobranças:** 50 requisições por 15 minutos
- **Payouts:** 20 requisições por 15 minutos
- **Webhooks:** 100 requisições por 15 minutos

## Webhooks

### Eventos Disponíveis

- `user.registered` - Usuário registrado
- `user.kyc.approved` - KYC aprovado
- `user.kyc.rejected` - KYC rejeitado
- `charge.created` - Cobrança criada
- `charge.paid` - Cobrança paga
- `charge.expired` - Cobrança expirada
- `charge.cancelled` - Cobrança cancelada
- `payout.created` - Payout criado
- `payout.completed` - Payout concluído
- `payout.failed` - Payout falhou

### Formato do Payload

```json
{
  "event": "charge.paid",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "charge_id": "uuid",
    "amount": 100.00,
    "status": "paid",
    "paid_at": "2024-01-01T00:00:00Z"
  },
  "signature": "sha256_signature"
}
```

### Verificação de Assinatura

O webhook inclui uma assinatura HMAC-SHA256 para verificar a autenticidade:

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhook_secret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

## Exemplos de Uso

### Criar uma cobrança PIX

```bash
curl -X POST https://localhost/api/charges \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Pagamento de teste",
    "payment_method": "pix",
    "customer": {
      "name": "João Silva",
      "email": "joao@exemplo.com"
    }
  }'
```

### Listar transações

```bash
curl -X GET "https://localhost/api/users/transactions?page=1&limit=10&type=charge" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Configurar webhook

```bash
curl -X POST https://localhost/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://meusite.com/webhook",
    "events": ["charge.paid", "payout.completed"]
  }'
```

## Suporte

Para suporte técnico, entre em contato através do email: suporte@pagamentos.com
