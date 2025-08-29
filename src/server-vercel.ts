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

// Rota principal - Checkout completo
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - Gateway de Pagamentos</title>
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

        .checkout-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 30px;
        }

        .checkout-main {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .checkout-sidebar {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            height: fit-content;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f1f3f4;
        }

        .header h1 {
            color: #1a73e8;
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .header p {
            color: #5f6368;
            font-size: 1.1rem;
        }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            color: #202124;
            font-size: 1.3rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .payment-methods {
            display: grid;
            gap: 15px;
        }

        .payment-option {
            border: 2px solid #e8eaed;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }

        .payment-option:hover {
            border-color: #1a73e8;
            background: #f8f9ff;
        }

        .payment-option.selected {
            border-color: #1a73e8;
            background: #f8f9ff;
        }

        .payment-option input[type="radio"] {
            position: absolute;
            opacity: 0;
        }

        .payment-option label {
            display: flex;
            align-items: center;
            gap: 15px;
            cursor: pointer;
            font-weight: 500;
            color: #202124;
        }

        .payment-icon {
            width: 40px;
            height: 40px;
            background: #f1f3f4;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .payment-details {
            flex: 1;
        }

        .payment-title {
            font-weight: 600;
            margin-bottom: 5px;
        }

        .payment-description {
            color: #5f6368;
            font-size: 0.9rem;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #202124;
        }

        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e8eaed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: #1a73e8;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .card-inputs {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 15px;
        }

        .pix-qr {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 20px;
        }

        .qr-code {
            width: 200px;
            height: 200px;
            background: #e8eaed;
            border-radius: 8px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: #5f6368;
        }

        .order-summary {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .order-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e8eaed;
        }

        .order-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .order-total {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1a73e8;
            border-top: 2px solid #e8eaed;
            padding-top: 15px;
            margin-top: 15px;
        }

        .btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }

        .btn:hover {
            background: #1557b0;
            transform: translateY(-1px);
        }

        .btn:disabled {
            background: #c2c2c2;
            cursor: not-allowed;
            transform: none;
        }

        .security-badges {
            display: flex;
            gap: 15px;
            margin-top: 20px;
            justify-content: center;
        }

        .security-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #5f6368;
            font-size: 0.9rem;
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

        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #1a73e8;
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
            .checkout-container {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .form-row, .card-inputs {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="checkout-container">
        <div class="checkout-main">
            <div class="header">
                <h1>💳 Checkout Seguro</h1>
                <p>Escolha sua forma de pagamento preferida</p>
            </div>

            <form id="checkoutForm">
                <div class="section">
                    <h2>📋 Informações Pessoais</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="name">Nome Completo</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="email">E-mail</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cpf">CPF</label>
                            <input type="text" id="cpf" name="cpf" placeholder="000.000.000-00" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Telefone</label>
                            <input type="tel" id="phone" name="phone" placeholder="(11) 99999-9999" required>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>💳 Forma de Pagamento</h2>
                    <div class="payment-methods">
                        <div class="payment-option" data-method="pix">
                            <input type="radio" id="pix" name="paymentMethod" value="pix">
                            <label for="pix">
                                <div class="payment-icon">📱</div>
                                <div class="payment-details">
                                    <div class="payment-title">PIX</div>
                                    <div class="payment-description">Pagamento instantâneo via QR Code</div>
                                </div>
                            </label>
                        </div>

                        <div class="payment-option" data-method="credit">
                            <input type="radio" id="credit" name="paymentMethod" value="credit">
                            <label for="credit">
                                <div class="payment-icon">💳</div>
                                <div class="payment-details">
                                    <div class="payment-title">Cartão de Crédito</div>
                                    <div class="payment-description">Visa, Mastercard, Elo e outros</div>
                                </div>
                            </label>
                        </div>

                        <div class="payment-option" data-method="boleto">
                            <input type="radio" id="boleto" name="paymentMethod" value="boleto">
                            <label for="boleto">
                                <div class="payment-icon">📄</div>
                                <div class="payment-details">
                                    <div class="payment-title">Boleto Bancário</div>
                                    <div class="payment-description">Pagamento em até 3 dias úteis</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Campos do Cartão de Crédito -->
                    <div id="creditFields" style="display: none;">
                        <div class="form-group">
                            <label for="cardNumber">Número do Cartão</label>
                            <input type="text" id="cardNumber" name="cardNumber" placeholder="0000 0000 0000 0000">
                        </div>
                        <div class="card-inputs">
                            <div class="form-group">
                                <label for="cardName">Nome no Cartão</label>
                                <input type="text" id="cardName" name="cardName">
                            </div>
                            <div class="form-group">
                                <label for="cardExpiry">Validade</label>
                                <input type="text" id="cardExpiry" name="cardExpiry" placeholder="MM/AA">
                            </div>
                            <div class="form-group">
                                <label for="cardCvv">CVV</label>
                                <input type="text" id="cardCvv" name="cardCvv" placeholder="123">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="installments">Parcelas</label>
                            <select id="installments" name="installments">
                                <option value="1">1x sem juros</option>
                                <option value="2">2x sem juros</option>
                                <option value="3">3x sem juros</option>
                                <option value="4">4x sem juros</option>
                                <option value="5">5x sem juros</option>
                                <option value="6">6x sem juros</option>
                            </select>
                        </div>
                    </div>

                    <!-- QR Code PIX -->
                    <div id="pixFields" style="display: none;">
                        <div class="pix-qr">
                            <div class="qr-code">📱</div>
                            <p><strong>Escaneie o QR Code com seu app bancário</strong></p>
                            <p>Pagamento processado instantaneamente</p>
                        </div>
                    </div>

                    <!-- Boleto -->
                    <div id="boletoFields" style="display: none;">
                        <div class="pix-qr">
                            <div class="qr-code">📄</div>
                            <p><strong>Boleto será gerado após confirmação</strong></p>
                            <p>Prazo de vencimento: 3 dias úteis</p>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn" id="submitBtn">Finalizar Compra</button>

                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <p>Processando pagamento...</p>
                </div>

                <div class="result" id="result"></div>
            </form>
        </div>

        <div class="checkout-sidebar">
            <div class="section">
                <h2>🛒 Resumo do Pedido</h2>
                <div class="order-summary">
                    <div class="order-item">
                        <span>Produto Demo</span>
                        <span>R$ 100,00</span>
                    </div>
                    <div class="order-item">
                        <span>Frete</span>
                        <span>Grátis</span>
                    </div>
                    <div class="order-item order-total">
                        <span>Total</span>
                        <span>R$ 100,00</span>
                    </div>
                </div>
            </div>

            <div class="security-badges">
                <div class="security-badge">
                    <span>🔒</span>
                    <span>SSL Seguro</span>
                </div>
                <div class="security-badge">
                    <span>🛡️</span>
                    <span>PCI DSS</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Seleção de método de pagamento
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', function() {
                // Remover seleção anterior
                document.querySelectorAll('.payment-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Selecionar atual
                this.classList.add('selected');
                
                // Mostrar campos específicos
                const method = this.dataset.method;
                hideAllFields();
                
                if (method === 'credit') {
                    document.getElementById('creditFields').style.display = 'block';
                } else if (method === 'pix') {
                    document.getElementById('pixFields').style.display = 'block';
                } else if (method === 'boleto') {
                    document.getElementById('boletoFields').style.display = 'block';
                }
            });
        });

        function hideAllFields() {
            document.getElementById('creditFields').style.display = 'none';
            document.getElementById('pixFields').style.display = 'none';
            document.getElementById('boletoFields').style.display = 'none';
        }

        // Processar checkout
        document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const paymentData = {
                name: formData.get('name'),
                email: formData.get('email'),
                cpf: formData.get('cpf'),
                phone: formData.get('phone'),
                paymentMethod: formData.get('paymentMethod'),
                amount: 100,
                cardNumber: formData.get('cardNumber'),
                cardName: formData.get('cardName'),
                cardExpiry: formData.get('cardExpiry'),
                cardCvv: formData.get('cardCvv'),
                installments: formData.get('installments')
            };

            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');

            // Mostrar loading
            submitBtn.disabled = true;
            loading.style.display = 'block';
            result.style.display = 'none';

            try {
                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(paymentData)
                });

                const data = await response.json();
                
                result.className = 'result success';
                result.innerHTML = \`
                    <h4>✅ Pagamento Processado com Sucesso!</h4>
                    <p><strong>ID da Transação:</strong> \${data.transactionId}</p>
                    <p><strong>Método:</strong> \${data.paymentMethod}</p>
                    <p><strong>Valor:</strong> R$ \${data.amount.toFixed(2)}</p>
                    <p><strong>Status:</strong> \${data.status}</p>
                    <p><strong>Data:</strong> \${new Date(data.timestamp).toLocaleString('pt-BR')}</p>
                    \${data.qrCode ? '<p><strong>QR Code PIX gerado com sucesso!</strong></p>' : ''}
                    \${data.boletoUrl ? '<p><strong>Boleto gerado! Verifique seu e-mail.</strong></p>' : ''}
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

// Checkout endpoint
app.post('/api/checkout', (req, res) => {
  const { name, email, cpf, phone, paymentMethod, amount, cardNumber, cardName, cardExpiry, cardCvv, installments } = req.body;
  
  // Simular processamento
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let response = {
    success: true,
    message: 'Pagamento processado com sucesso!',
    transactionId,
    paymentMethod,
    amount: amount || 100,
    status: 'approved',
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
