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
    <title>Checkout Seguro - Gateway de Pagamentos</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .navbar { 
            background: rgba(255,255,255,0.95); 
            backdrop-filter: blur(10px);
            color: #333; 
            padding: 15px 0; 
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
        }
        .navbar-container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 0 20px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .navbar-brand { 
            font-size: 1.5rem; 
            font-weight: 700; 
            color: #667eea;
        }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { 
            color: #333; 
            text-decoration: none; 
            padding: 8px 16px; 
            border-radius: 8px; 
            transition: all 0.3s ease;
            font-weight: 500;
        }
        .nav-link:hover { 
            background: #667eea; 
            color: white;
            transform: translateY(-2px);
        }
        .container { 
            max-width: 900px; 
            margin: 100px auto 20px; 
            padding: 20px; 
        }
        .checkout-form { 
            background: rgba(255,255,255,0.95); 
            backdrop-filter: blur(10px);
            border-radius: 20px; 
            padding: 40px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .header-section {
            text-align: center;
            margin-bottom: 40px;
        }
        .header-section h1 {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header-section p {
            color: #666;
            font-size: 1.1rem;
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .form-group { margin-bottom: 25px; }
        .form-group.full-width {
            grid-column: 1 / -1;
        }
        .form-group label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600;
            color: #333;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .form-group input, .form-group select { 
            width: 100%; 
            padding: 15px; 
            border: 2px solid #e1e5e9; 
            border-radius: 12px; 
            font-size: 16px; 
            transition: all 0.3s ease;
            background: white;
        }
        .form-group input:focus, .form-group select:focus { 
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
        }
        .payment-methods {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        .payment-option {
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        }
        .payment-option:hover {
            border-color: #667eea;
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
        }
        .payment-option.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .payment-option i {
            font-size: 2rem;
            margin-bottom: 10px;
            display: block;
        }
        .btn { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            border: none; 
            padding: 18px 40px; 
            border-radius: 12px; 
            font-size: 18px; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.3s ease;
            width: 100%;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .result { 
            margin-top: 30px; 
            padding: 20px; 
            border-radius: 12px; 
            text-align: center;
            animation: slideIn 0.5s ease;
        }
        .success { 
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
            color: white; 
        }
        .error { 
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); 
            color: white; 
        }
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .security-badges {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #e1e5e9;
        }
        .security-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #666;
            font-size: 0.9rem;
        }
        .security-badge i {
            color: #4CAF50;
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway Pro</div>
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
            <div class="header-section">
                <h1>💳 Checkout Seguro</h1>
                <p>Processamento rápido e seguro de pagamentos</p>
            </div>
            
            <form id="checkoutForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Nome Completo</label>
                        <input type="text" name="name" required placeholder="Digite seu nome completo">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-envelope"></i> E-mail</label>
                        <input type="email" name="email" required placeholder="seu@email.com">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-id-card"></i> CPF</label>
                        <input type="text" name="cpf" required placeholder="000.000.000-00">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-phone"></i> Telefone</label>
                        <input type="tel" name="phone" required placeholder="(11) 99999-9999">
                    </div>
                </div>
                
                <div class="form-group full-width">
                    <label><i class="fas fa-dollar-sign"></i> Valor (R$)</label>
                    <input type="number" name="amount" value="100" required min="1" step="0.01">
                </div>
                
                <div class="form-group full-width">
                    <label><i class="fas fa-credit-card"></i> Método de Pagamento</label>
                    <div class="payment-methods">
                        <div class="payment-option" data-method="pix">
                            <i class="fas fa-qrcode"></i>
                            <div>PIX</div>
                            <small>Pagamento instantâneo</small>
                        </div>
                        <div class="payment-option" data-method="credit">
                            <i class="fas fa-credit-card"></i>
                            <div>Cartão</div>
                            <small>Crédito ou débito</small>
                        </div>
                        <div class="payment-option" data-method="boleto">
                            <i class="fas fa-barcode"></i>
                            <div>Boleto</div>
                            <small>Pagamento bancário</small>
                        </div>
                    </div>
                    <input type="hidden" name="paymentMethod" id="paymentMethod" value="pix" required>
                </div>
                
                <button type="submit" class="btn" id="submitBtn">
                    <i class="fas fa-lock"></i> Finalizar Compra Segura
                </button>
            </form>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Processando pagamento...</p>
            </div>
            
            <div id="result"></div>
            
            <div class="security-badges">
                <div class="security-badge">
                    <i class="fas fa-shield-alt"></i>
                    <span>SSL Seguro</span>
                </div>
                <div class="security-badge">
                    <i class="fas fa-lock"></i>
                    <span>Criptografia 256-bit</span>
                </div>
                <div class="security-badge">
                    <i class="fas fa-check-circle"></i>
                    <span>PCI Compliant</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Seleção de método de pagamento
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('paymentMethod').value = this.dataset.method;
            });
        });
        
        // Selecionar PIX por padrão
        document.querySelector('[data-method="pix"]').classList.add('selected');
        
        document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');
            
            // Mostrar loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            loading.style.display = 'block';
            result.innerHTML = '';
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const resultData = await response.json();
                result.className = 'result ' + (resultData.success ? 'success' : 'error');
                
                if (resultData.success) {
                    result.innerHTML = \`
                        <h3><i class="fas fa-check-circle"></i> \${resultData.message}</h3>
                        <p><strong>ID da Transação:</strong> \${resultData.transactionId}</p>
                        <p><strong>Status:</strong> \${resultData.status === 'approved' ? 'Aprovado' : resultData.status === 'pending' ? 'Pendente' : 'Recusado'}</p>
                        <div style="margin-top: 20px;">
                            <a href="/admin" style="background: white; color: #4CAF50; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 10px;">
                                <i class="fas fa-chart-bar"></i> Ver no Dashboard
                            </a>
                        </div>
                    \`;
                } else {
                    result.innerHTML = \`
                        <h3><i class="fas fa-exclamation-triangle"></i> \${resultData.message}</h3>
                    \`;
                }
            } catch (error) {
                result.className = 'result error';
                result.innerHTML = '<h3><i class="fas fa-exclamation-triangle"></i> Erro ao processar pagamento</h3>';
            } finally {
                // Esconder loading
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-lock"></i> Finalizar Compra Segura';
                loading.style.display = 'none';
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
    <title>Dashboard Pro - Gateway de Pagamentos</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .navbar { 
            background: rgba(255,255,255,0.95); 
            backdrop-filter: blur(10px);
            color: #333; 
            padding: 15px 0; 
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
        }
        .navbar-container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 0 20px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .navbar-brand { 
            font-size: 1.5rem; 
            font-weight: 700; 
            color: #667eea;
        }
        .navbar-nav { display: flex; gap: 20px; }
        .nav-link { 
            color: #333; 
            text-decoration: none; 
            padding: 8px 16px; 
            border-radius: 8px; 
            transition: all 0.3s ease;
            font-weight: 500;
        }
        .nav-link:hover { 
            background: #667eea; 
            color: white;
            transform: translateY(-2px);
        }
        .container { 
            max-width: 1400px; 
            margin: 100px auto 20px; 
            padding: 20px; 
        }
        .dashboard-header {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .dashboard-header h1 {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .dashboard-header p {
            color: #666;
            font-size: 1.1rem;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 25px; 
            margin-bottom: 40px; 
        }
        .stat-card { 
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px; 
            padding: 30px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            text-align: center;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        }
        .stat-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            color: #667eea;
        }
        .stat-value { 
            font-size: 2.5rem; 
            font-weight: 700; 
            color: #333; 
            margin-bottom: 10px; 
        }
        .stat-label { 
            color: #666;
            font-size: 1rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .transactions-section {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        .section-header h2 {
            font-size: 1.8rem;
            color: #333;
            font-weight: 700;
        }
        .refresh-btn { 
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
            color: white; 
            border: none; 
            padding: 12px 25px; 
            border-radius: 12px; 
            font-size: 16px; 
            font-weight: 600; 
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(40, 167, 69, 0.4);
        }
        .transactions-table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white; 
            border-radius: 15px; 
            overflow: hidden; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .transactions-table th, .transactions-table td { 
            padding: 15px; 
            text-align: left; 
            border-bottom: 1px solid #e8eaed; 
        }
        .transactions-table th { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.9rem;
        }
        .transactions-table tr:hover {
            background: #f8f9fa;
        }
        .status-badge { 
            padding: 8px 12px; 
            border-radius: 20px; 
            font-size: 0.8rem; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-approved { 
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
            color: white; 
        }
        .status-pending { 
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); 
            color: white; 
        }
        .status-failed { 
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); 
            color: white; 
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-state i {
            font-size: 4rem;
            color: #ddd;
            margin-bottom: 20px;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .stat-card, .transactions-section {
            animation: fadeIn 0.6s ease;
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway Pro</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/docs" class="nav-link">🔗 API</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="dashboard-header">
            <h1><i class="fas fa-chart-line"></i> Dashboard Administrativo</h1>
            <p>Visão geral completa das transações e métricas de performance</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-receipt"></i></div>
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total de Transações</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-value">${approved}</div>
                <div class="stat-label">Aprovadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${pending}</div>
                <div class="stat-label">Pendentes</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                <div class="stat-value">${failed}</div>
                <div class="stat-label">Falharam</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="stat-value">R$ ${(totalAmount / 100).toFixed(2)}</div>
                <div class="stat-label">Valor Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                <div class="stat-value">${successRate}%</div>
                <div class="stat-label">Taxa de Sucesso</div>
            </div>
        </div>

        <div class="transactions-section">
            <div class="section-header">
                <h2><i class="fas fa-list"></i> Transações Recentes</h2>
                <button class="refresh-btn" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Atualizar
                </button>
            </div>
            
            ${transactions.length > 0 ? `
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th><i class="fas fa-hashtag"></i> ID</th>
                            <th><i class="fas fa-user"></i> Cliente</th>
                            <th><i class="fas fa-dollar-sign"></i> Valor</th>
                            <th><i class="fas fa-credit-card"></i> Método</th>
                            <th><i class="fas fa-info-circle"></i> Status</th>
                            <th><i class="fas fa-calendar"></i> Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(t => `
                            <tr>
                                <td><strong>${t.id}</strong></td>
                                <td>${t.customer}</td>
                                <td><strong>R$ ${(t.amount / 100).toFixed(2)}</strong></td>
                                <td>${t.paymentMethod}</td>
                                <td><span class="status-badge status-${t.status}">${t.status === 'approved' ? 'Aprovado' : t.status === 'pending' ? 'Pendente' : 'Falhou'}</span></td>
                                <td>${new Date(t.date).toLocaleString('pt-BR')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma transação encontrada</h3>
                    <p>Faça uma transação no checkout para ver os dados aqui</p>
                </div>
            `}
        </div>
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
