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

// Rota principal - HTML inline
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gateway de Pagamentos - Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .status-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
        }

        .status-indicator {
            display: inline-block;
            width: 20px;
            height: 20px;
            background: #4CAF50;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .feature-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }

        .feature-card:hover {
            transform: translateY(-5px);
        }

        .feature-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }

        .feature-card p {
            color: #666;
            line-height: 1.6;
        }

        .demo-section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .demo-section h2 {
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
        }

        .payment-form {
            max-width: 400px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: 500;
        }

        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }

        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s ease;
            width: 100%;
        }

        .btn:hover {
            transform: translateY(-2px);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .result {
            margin-top: 20px;
            padding: 20px;
            border-radius: 8px;
            display: none;
        }

        .result.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .result.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .api-endpoints {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }

        .api-endpoints h3 {
            color: #333;
            margin-bottom: 15px;
        }

        .endpoint {
            background: white;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            font-family: 'Courier New', monospace;
            border-left: 4px solid #667eea;
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
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏦 Gateway de Pagamentos</h1>
            <p>Demo da API de Pagamentos - Solução Completa de Fintech</p>
        </div>

        <div class="status-card">
            <h2>
                <span class="status-indicator"></span>
                Status da API: <span id="apiStatus">Verificando...</span>
            </h2>
            <p id="apiInfo">Carregando informações...</p>
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <h3>🔐 Autenticação JWT</h3>
                <p>Sistema seguro de autenticação com tokens JWT, refresh tokens e controle de sessões.</p>
            </div>
            <div class="feature-card">
                <h3>👥 Gestão de Usuários</h3>
                <p>Cadastro, edição e gerenciamento completo de usuários com diferentes níveis de acesso.</p>
            </div>
            <div class="feature-card">
                <h3>💳 Cobranças PIX</h3>
                <p>Geração de cobranças PIX instantâneas com QR Code e integração bancária.</p>
            </div>
            <div class="feature-card">
                <h3>💰 Payouts</h3>
                <p>Sistema de transferências e pagamentos para terceiros com controle de status.</p>
            </div>
            <div class="feature-card">
                <h3>🔔 Webhooks</h3>
                <p>Notificações automáticas em tempo real para eventos de pagamento e status.</p>
            </div>
            <div class="feature-card">
                <h3>📊 Dashboard Admin</h3>
                <p>Interface administrativa completa com relatórios, métricas e controle total.</p>
            </div>
        </div>

        <div class="demo-section">
            <h2>🧪 Teste de Pagamento</h2>
            <form class="payment-form" id="paymentForm">
                <div class="form-group">
                    <label for="amount">Valor (R$)</label>
                    <input type="number" id="amount" name="amount" value="100" min="1" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="description">Descrição</label>
                    <textarea id="description" name="description" rows="3" placeholder="Descrição do pagamento">Pagamento de teste - Demo Gateway</textarea>
                </div>
                <button type="submit" class="btn" id="submitBtn">Processar Pagamento</button>
            </form>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Processando pagamento...</p>
            </div>

            <div class="result" id="result"></div>
        </div>

        <div class="api-endpoints">
            <h3>🔗 Endpoints da API</h3>
            <div class="endpoint">GET / - Página principal</div>
            <div class="endpoint">GET /api/health - Status da API</div>
            <div class="endpoint">GET /api/demo - Informações da demo</div>
            <div class="endpoint">POST /api/demo/payment - Teste de pagamento</div>
        </div>
    </div>

    <script>
        // Verificar status da API
        async function checkApiStatus() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                document.getElementById('apiStatus').textContent = 'Online';
                document.getElementById('apiInfo').textContent = \`Versão \${data.version} - \${data.service}\`;
            } catch (error) {
                document.getElementById('apiStatus').textContent = 'Offline';
                document.getElementById('apiInfo').textContent = 'Erro ao conectar com a API';
            }
        }

        // Processar pagamento
        async function processPayment(amount, description) {
            try {
                const response = await fetch('/api/demo/payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ amount, description })
                });

                const data = await response.json();
                return data;
            } catch (error) {
                throw new Error('Erro ao processar pagamento');
            }
        }

        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            checkApiStatus();

            document.getElementById('paymentForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const amount = parseFloat(document.getElementById('amount').value);
                const description = document.getElementById('description').value;
                const submitBtn = document.getElementById('submitBtn');
                const loading = document.getElementById('loading');
                const result = document.getElementById('result');

                // Mostrar loading
                submitBtn.disabled = true;
                loading.style.display = 'block';
                result.style.display = 'none';

                try {
                    const paymentResult = await processPayment(amount, description);
                    
                    result.className = 'result success';
                    result.innerHTML = \`
                        <h4>✅ Pagamento Processado com Sucesso!</h4>
                        <p><strong>ID:</strong> \${paymentResult.data.id}</p>
                        <p><strong>Valor:</strong> R$ \${paymentResult.data.amount.toFixed(2)}</p>
                        <p><strong>Descrição:</strong> \${paymentResult.data.description}</p>
                        <p><strong>Status:</strong> \${paymentResult.data.status}</p>
                        <p><strong>Data:</strong> \${new Date(paymentResult.data.timestamp).toLocaleString('pt-BR')}</p>
                    \`;
                    result.style.display = 'block';
                } catch (error) {
                    result.className = 'result error';
                    result.innerHTML = \`
                        <h4>❌ Erro ao Processar Pagamento</h4>
                        <p>\${error.message}</p>
                    \`;
                    result.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    loading.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>
  `);
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

// Rota de teste de pagamento
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
  console.log(`🌐 Interface: http://localhost:${PORT}/`);
});

export default app;
