import express from 'express';

const app = express();

app.use(express.json());

// Armazenamento simples em memória
let transactions: any[] = [
  {
    id: 'TXN_001',
    customer: 'João Silva',
    amount: 15000,
    paymentMethod: 'pix',
    status: 'approved',
    date: '2025-08-29T15:30:00Z',
    email: 'joao@email.com',
    cpf: '123.456.789-00',
    phone: '(11) 99999-9999'
  }
];

// Webhooks simulados
let webhooks: any[] = [
  {
    id: 'webhook_001',
    url: 'https://meusite.com/webhook',
    events: ['charge.created', 'charge.paid'],
    status: 'active',
    lastTriggered: '2025-08-29T15:30:00Z'
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Gateway funcionando!',
    stats: {
      transactions: transactions.length,
      webhooks: webhooks.length,
      uptime: process.uptime()
    }
  });
});

// API para transações
app.get('/api/transactions', (req, res) => {
  res.json({ success: true, data: transactions });
});

// API para webhooks
app.get('/api/webhooks', (req, res) => {
  res.json({ success: true, data: webhooks });
});

// Simular webhook
app.post('/api/webhooks/test', (req, res) => {
  const { event, transactionId } = req.body;
  
  // Simular envio de webhook
  const webhookData = {
    event: event,
    data: {
      id: transactionId,
      timestamp: new Date().toISOString(),
      status: event === 'charge.paid' ? 'paid' : event === 'charge.failed' ? 'failed' : 'pending'
    }
  };
  
  res.json({ 
    success: true, 
    message: `Webhook ${event} simulado com sucesso!`,
    data: webhookData
  });
});

// Checkout endpoint
app.post('/api/checkout', (req, res) => {
  const { name, email, cpf, phone, paymentMethod, amount } = req.body;
  
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let status = 'approved';
  if (paymentMethod === 'boleto') {
    status = 'pending';
  } else if (paymentMethod === 'pix') {
    status = Math.random() > 0.1 ? 'approved' : 'pending';
  } else if (paymentMethod === 'credit') {
    status = Math.random() > 0.05 ? 'approved' : 'failed';
  }
  
  const transaction = {
    id: transactionId,
    customer: name,
    amount: parseInt(amount) || 100,
    paymentMethod: paymentMethod === 'credit' ? 'cartão' : paymentMethod,
    status: status,
    date: new Date().toISOString(),
    email: email,
    cpf: cpf,
    phone: phone
  };
  
  transactions.unshift(transaction);
  
  res.json({
    success: true,
    message: status === 'approved' ? 'Pagamento aprovado!' : 
             status === 'pending' ? 'Pagamento em processamento!' : 'Pagamento recusado!',
    transactionId,
    status: status
  });
});

// Rota principal - Checkout
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - Gateway de Pagamentos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .navbar { background: #1a73e8; color: white; padding: 15px 0; }
        .navbar-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 600; }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav-link:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .checkout-form { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #e8eaed; border-radius: 8px; font-size: 16px; }
        .btn { background: #1a73e8; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; border-radius: 8px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway de Pagamentos</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/docs" class="nav-link">🔗 API</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="checkout-form">
            <h1>💳 Checkout Seguro</h1>
            <form id="checkoutForm">
                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>E-mail</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>CPF</label>
                    <input type="text" name="cpf" required>
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="tel" name="phone" required>
                </div>
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" name="amount" value="100" required>
                </div>
                <div class="form-group">
                    <label>Método de Pagamento</label>
                    <select name="paymentMethod" required>
                        <option value="pix">PIX</option>
                        <option value="credit">Cartão de Crédito</option>
                        <option value="boleto">Boleto</option>
                    </select>
                </div>
                <button type="submit" class="btn">Finalizar Compra</button>
            </form>
            <div id="result"></div>
        </div>
    </div>

    <script>
        document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                const resultDiv = document.getElementById('result');
                resultDiv.className = 'result ' + (result.success ? 'success' : 'error');
                resultDiv.innerHTML = '<strong>' + result.message + '</strong><br>ID: ' + result.transactionId;
            } catch (error) {
                document.getElementById('result').className = 'result error';
                document.getElementById('result').innerHTML = 'Erro ao processar pagamento';
            }
        });
    </script>
</body>
</html>
  `);
});

// Rota do Dashboard
app.get('/admin', (req, res) => {
  const total = transactions.length;
  const approved = transactions.filter(t => t.status === 'approved').length;
  const pending = transactions.filter(t => t.status === 'pending').length;
  const failed = transactions.filter(t => t.status === 'failed').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Gateway de Pagamentos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .navbar { background: #1a73e8; color: white; padding: 15px 0; }
        .navbar-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 600; }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav-link:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 700; color: #1a73e8; margin-bottom: 5px; }
        .stat-label { color: #666; }
        .transactions-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .transactions-table th, .transactions-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e8eaed; }
        .transactions-table th { background: #f8f9fa; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .refresh-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway de Pagamentos</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/docs" class="nav-link">🔗 API</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <h1>📊 Dashboard Administrativo</h1>
        <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total de Transações</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${approved}</div>
                <div class="stat-label">Aprovadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${pending}</div>
                <div class="stat-label">Pendentes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${failed}</div>
                <div class="stat-label">Falharam</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">R$ ${(totalAmount / 100).toFixed(2)}</div>
                <div class="stat-label">Valor Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${successRate}%</div>
                <div class="stat-label">Taxa de Sucesso</div>
            </div>
        </div>

        <h2>🔄 Transações Recentes</h2>
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => `
                    <tr>
                        <td>${t.id}</td>
                        <td>${t.customer}</td>
                        <td>R$ ${(t.amount / 100).toFixed(2)}</td>
                        <td>${t.paymentMethod}</td>
                        <td><span class="status-badge status-${t.status}">${t.status === 'approved' ? 'Aprovado' : t.status === 'pending' ? 'Pendente' : 'Falhou'}</span></td>
                        <td>${new Date(t.date).toLocaleString('pt-BR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
  `);
});

// Rota da API Docs
app.get('/docs', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Docs - Gateway de Pagamentos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .navbar { background: #1a73e8; color: white; padding: 15px 0; }
        .navbar-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 600; }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav-link:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .api-docs { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .endpoint { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1a73e8; }
        .method { background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
        .url { font-family: monospace; color: #1a73e8; font-weight: 500; }
        .code-block { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin: 10px 0; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway de Pagamentos</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/docs" class="nav-link">🔗 API</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="api-docs">
            <h1>🔗 Documentação da API</h1>
            
            <div class="endpoint">
                <div style="margin-bottom: 15px;">
                    <span class="method">POST</span>
                    <span class="url">/api/checkout</span>
                </div>
                <p><strong>Descrição:</strong> Processar pagamento</p>
                <p><strong>Parâmetros:</strong> name, email, cpf, phone, amount, paymentMethod</p>
                <div class="code-block">
curl -X POST /api/checkout \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "phone": "(11) 99999-9999",
    "amount": 10000,
    "paymentMethod": "pix"
  }'
                </div>
                <button onclick="testAPI('checkout')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar API</button>
            </div>
            
            <div class="endpoint">
                <div style="margin-bottom: 15px;">
                    <span class="method">GET</span>
                    <span class="url">/api/transactions</span>
                </div>
                <p><strong>Descrição:</strong> Listar transações</p>
                <div class="code-block">
curl -X GET /api/transactions
                </div>
                <button onclick="testAPI('transactions')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar API</button>
            </div>
            
            <div class="endpoint">
                <div style="margin-bottom: 15px;">
                    <span class="method">GET</span>
                    <span class="url">/api/health</span>
                </div>
                <p><strong>Descrição:</strong> Status da API</p>
                <div class="code-block">
curl -X GET /api/health
                </div>
                <button onclick="testAPI('health')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar API</button>
            </div>
        </div>
    </div>

    <script>
        async function testAPI(endpoint) {
            try {
                let response;
                if (endpoint === 'checkout') {
                    response = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'Teste API',
                            email: 'teste@api.com',
                            cpf: '123.456.789-00',
                            phone: '(11) 99999-9999',
                            amount: 5000,
                            paymentMethod: 'pix'
                        })
                    });
                } else {
                    response = await fetch(\`/api/\${endpoint}\`);
                }
                
                const result = await response.json();
                alert(JSON.stringify(result, null, 2));
            } catch (error) {
                alert('Erro ao testar API');
            }
        }
    </script>
</body>
</html>
  `);
});

// Rota dos Webhooks
app.get('/webhooks', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webhooks - Gateway de Pagamentos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .navbar { background: #1a73e8; color: white; padding: 15px 0; }
        .navbar-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 600; }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav-link:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .webhook-content { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .event-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1a73e8; }
        .event-title { font-weight: 600; color: #1a73e8; margin-bottom: 10px; }
        .code-block { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin: 10px 0; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway de Pagamentos</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/docs" class="nav-link">🔗 API</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="webhook-content">
            <h1>🔔 Webhooks</h1>
            <p>Configure notificações em tempo real para eventos de pagamento</p>
            
            <div class="event-card">
                <div class="event-title">charge.created</div>
                <p>Disparado quando uma nova cobrança é criada</p>
                <div class="code-block">
{
  "event": "charge.created",
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "status": "pending"
  }
}
                </div>
                <button onclick="testWebhook('charge.created')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar Webhook</button>
            </div>
            
            <div class="event-card">
                <div class="event-title">charge.paid</div>
                <p>Disparado quando uma cobrança é paga</p>
                <div class="code-block">
{
  "event": "charge.paid",
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "status": "paid",
    "paid_at": "2025-08-29T15:30:00Z"
  }
}
                </div>
                <button onclick="testWebhook('charge.paid')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar Webhook</button>
            </div>
            
            <div class="event-card">
                <div class="event-title">charge.failed</div>
                <p>Disparado quando uma cobrança falha</p>
                <div class="code-block">
{
  "event": "charge.failed",
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "status": "failed",
    "error": "Insufficient funds"
  }
}
                </div>
                <button onclick="testWebhook('charge.failed')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 10px;">🧪 Testar Webhook</button>
            </div>
        </div>
    </div>

    <script>
        async function testWebhook(event) {
            try {
                const response = await fetch('/api/webhooks/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        event: event, 
                        transactionId: 'ch_' + Date.now() 
                    })
                });
                
                const result = await response.json();
                alert(result.message);
            } catch (error) {
                alert('Erro ao testar webhook');
            }
        }
    </script>
</body>
</html>
  `);
});

// Middleware de erro
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno' });
});

export default app;
