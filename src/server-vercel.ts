import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Armazenamento em memória para demo
let transactions: any[] = [
  {
    id: 'TXN_001',
    customer: 'João Silva',
    amount: 15000,
    paymentMethod: 'pix',
    status: 'approved',
    date: '2025-08-29T15:30:00Z'
  },
  {
    id: 'TXN_002', 
    customer: 'Maria Santos',
    amount: 8990,
    paymentMethod: 'credit',
    status: 'approved',
    date: '2025-08-29T15:25:00Z'
  },
  {
    id: 'TXN_003',
    customer: 'Pedro Costa', 
    amount: 20000,
    paymentMethod: 'boleto',
    status: 'pending',
    date: '2025-08-29T15:20:00Z'
  },
  {
    id: 'TXN_004',
    customer: 'Ana Oliveira',
    amount: 7550,
    paymentMethod: 'pix',
    status: 'failed',
    date: '2025-08-29T15:15:00Z'
  }
];

// API para buscar transações
app.get('/api/transactions', (req, res) => {
  res.json({
    success: true,
    data: transactions
  });
});

// API para estatísticas
app.get('/api/stats', (req, res) => {
  const total = transactions.length;
  const approved = transactions.filter(t => t.status === 'approved').length;
  const pending = transactions.filter(t => t.status === 'pending').length;
  const failed = transactions.filter(t => t.status === 'failed').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  res.json({
    success: true,
    data: {
      total,
      approved,
      pending,
      failed,
      totalAmount,
      successRate: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Gateway de Pagamentos API',
    version: '1.0.0'
  });
});

// Rotas de demonstração
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Demo do Gateway de Pagamentos',
    features: [
      'Autenticação JWT',
      'Gestão de Usuários',
      'Cobranças PIX',
      'Payouts',
      'Webhooks',
      'Dashboard Admin'
    ],
    status: 'Funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Checkout endpoint
app.post('/api/checkout', (req, res) => {
  const { name, email, cpf, phone, paymentMethod, amount, cardNumber, cardName, cardExpiry, cardCvv, installments } = req.body;
  
  // Gerar ID único
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Determinar status baseado no método de pagamento
  let status = 'approved';
  if (paymentMethod === 'boleto') {
    status = 'pending';
  } else if (paymentMethod === 'pix') {
    status = Math.random() > 0.1 ? 'approved' : 'pending'; // 90% aprovado
  } else if (paymentMethod === 'credit') {
    status = Math.random() > 0.05 ? 'approved' : 'failed'; // 95% aprovado
  }
  
  // Criar transação
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
  
  // Salvar transação
  transactions.unshift(transaction); // Adicionar no início
  
  let response = {
    success: true,
    message: status === 'approved' ? 'Pagamento aprovado com sucesso!' : 
             status === 'pending' ? 'Pagamento em processamento!' : 'Pagamento recusado!',
    transactionId,
    paymentMethod,
    amount: parseInt(amount) || 100,
    status: status,
    timestamp: new Date().toISOString(),
    customer: {
      name,
      email,
      cpf,
      phone
    }
  };

  // Adicionar dados específicos do método
  if (paymentMethod === 'pix') {
    response.qrCode = true;
    response.pixKey = 'demo@gateway.com';
  } else if (paymentMethod === 'boleto') {
    response.boletoUrl = 'https://demo.gateway.com/boleto/' + transactionId;
    response.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  } else if (paymentMethod === 'credit') {
    response.installments = installments || 1;
    response.cardLastDigits = cardNumber ? cardNumber.slice(-4) : '****';
  }

  res.json(response);
});

// Rota de teste de pagamento (mantida para compatibilidade)
app.post('/api/demo/payment', (req, res) => {
  const { amount, description } = req.body;
  
  res.json({
    success: true,
    message: 'Pagamento simulado com sucesso!',
    data: {
      id: `demo_${Date.now()}`,
      amount: amount || 100,
      description: description || 'Pagamento de teste',
      status: 'approved',
      timestamp: new Date().toISOString()
    }
  });
});

// Rota do Dashboard Admin (Dinâmico)
app.get('/admin', (req, res) => {
  // Calcular estatísticas
  const total = transactions.length;
  const approved = transactions.filter(t => t.status === 'approved').length;
  const pending = transactions.filter(t => t.status === 'pending').length;
  const failed = transactions.filter(t => t.status === 'failed').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  
  // Pegar transações recentes (últimas 10)
  const recentTransactions = transactions.slice(0, 10);
  
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Admin - Gateway de Pagamentos</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
        }

        .navbar {
            background: #1a73e8;
            color: white;
            padding: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
            font-weight: 600;
        }

        .navbar-nav {
            display: flex;
            gap: 20px;
        }

        .nav-link {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 6px;
            transition: background 0.3s ease;
        }

        .nav-link:hover {
            background: rgba(255,255,255,0.1);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: #1a73e8;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            color: #5f6368;
            font-size: 1.1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1a73e8;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #5f6368;
            font-size: 1rem;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 30px;
        }

        .main-content {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .sidebar {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            height: fit-content;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            color: #202124;
            font-size: 1.5rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #e8eaed;
            padding-bottom: 10px;
        }

        .transactions-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .transactions-table th,
        .transactions-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e8eaed;
        }

        .transactions-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #202124;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .status-approved {
            background: #d4edda;
            color: #155724;
        }

        .status-pending {
            background: #fff3cd;
            color: #856404;
        }

        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }

        .quick-actions {
            display: grid;
            gap: 15px;
        }

        .action-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .action-card:hover {
            background: #e3f2fd;
            transform: translateY(-2px);
        }

        .action-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .action-title {
            font-weight: 600;
            color: #202124;
            margin-bottom: 5px;
        }

        .action-description {
            color: #5f6368;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }

        .btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn:hover {
            background: #1557b0;
            transform: translateY(-1px);
        }

        .refresh-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
        }

        .refresh-btn:hover {
            background: #218838;
            transform: translateY(-1px);
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .navbar-nav {
                flex-direction: column;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">🏦 Gateway de Pagamentos</div>
            <div class="navbar-nav">
                <a href="/" class="nav-link">💳 Checkout</a>
                <a href="/admin" class="nav-link">📊 Dashboard</a>
                <a href="/api" class="nav-link">🔗 API Docs</a>
                <a href="/webhooks" class="nav-link">🔔 Webhooks</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="header">
            <h1>📊 Dashboard Administrativo</h1>
            <p>Controle total do seu gateway de pagamentos</p>
            <button class="refresh-btn" onclick="refreshDashboard()">🔄 Atualizar Dados</button>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">💳</div>
                <div class="stat-value" id="totalTransactions">${total}</div>
                <div class="stat-label">Total de Transações</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value" id="approvedTransactions">${approved}</div>
                <div class="stat-label">Aprovadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-value" id="pendingTransactions">${pending}</div>
                <div class="stat-label">Pendentes</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">❌</div>
                <div class="stat-value" id="failedTransactions">${failed}</div>
                <div class="stat-label">Falharam</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value" id="totalAmount">R$ ${(totalAmount / 100).toFixed(2)}</div>
                <div class="stat-label">Valor Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-value" id="successRate">${successRate}%</div>
                <div class="stat-label">Taxa de Sucesso</div>
            </div>
        </div>

        <div class="content-grid">
            <div class="main-content">
                <div class="section">
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
                        <tbody id="transactionsTable">
                            ${recentTransactions.map(t => \`
                                <tr>
                                    <td>\${t.id}</td>
                                    <td>\${t.customer}</td>
                                    <td>R$ \${(t.amount / 100).toFixed(2)}</td>
                                    <td>\${t.paymentMethod}</td>
                                    <td><span class="status-badge status-\${t.status}">\${t.status === 'approved' ? 'Aprovado' : t.status === 'pending' ? 'Pendente' : 'Falhou'}</span></td>
                                    <td>\${new Date(t.date).toLocaleString('pt-BR')}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="sidebar">
                <div class="section">
                    <h2>⚡ Ações Rápidas</h2>
                    <div class="quick-actions">
                        <div class="action-card">
                            <div class="action-icon">👤</div>
                            <div class="action-title">Gestão de Usuários</div>
                            <div class="action-description">Adicionar, editar e gerenciar usuários</div>
                            <a href="#" class="btn">Gerenciar</a>
                        </div>
                        
                        <div class="action-card">
                            <div class="action-icon">🔔</div>
                            <div class="action-title">Webhooks</div>
                            <div class="action-description">Configurar notificações</div>
                            <a href="/webhooks" class="btn">Configurar</a>
                        </div>
                        
                        <div class="action-card">
                            <div class="action-icon">📊</div>
                            <div class="action-title">Relatórios</div>
                            <div class="action-description">Gerar relatórios detalhados</div>
                            <a href="#" class="btn">Gerar</a>
                        </div>
                        
                        <div class="action-card">
                            <div class="action-icon">⚙️</div>
                            <div class="action-title">Configurações</div>
                            <div class="action-description">Configurar gateway</div>
                            <a href="#" class="btn">Configurar</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function refreshDashboard() {
            location.reload();
        }
        
        // Auto-refresh a cada 30 segundos
        setInterval(() => {
            refreshDashboard();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// Middleware de erro
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Demo: http://localhost:${PORT}/api/demo`);
  console.log(`🛒 Checkout: http://localhost:${PORT}/`);
});

export default app;
