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

// Rota do Dashboard Admin
app.get('/admin', (req, res) => {
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
        }

        .stat-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #5f6368;
            font-size: 0.9rem;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
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

        .section h2 {
            color: #202124;
            font-size: 1.3rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
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

        .btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 10px 20px;
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

        .btn-secondary {
            background: #6c757d;
        }

        .btn-secondary:hover {
            background: #545b62;
        }

        .quick-actions {
            display: grid;
            gap: 15px;
        }

        .action-card {
            padding: 20px;
            border: 2px solid #e8eaed;
            border-radius: 8px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .action-card:hover {
            border-color: #1a73e8;
            background: #f8f9ff;
        }

        .action-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .action-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #202124;
        }

        .action-description {
            color: #5f6368;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
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
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value">R$ 45.250,00</div>
                <div class="stat-label">Volume Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-value">1.247</div>
                <div class="stat-label">Transações</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">98.5%</div>
                <div class="stat-label">Taxa de Sucesso</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value">156</div>
                <div class="stat-label">Usuários Ativos</div>
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
                        <tbody>
                            <tr>
                                <td>TXN_001</td>
                                <td>João Silva</td>
                                <td>R$ 150,00</td>
                                <td>PIX</td>
                                <td><span class="status-badge status-approved">Aprovado</span></td>
                                <td>29/08/2025 15:30</td>
                            </tr>
                            <tr>
                                <td>TXN_002</td>
                                <td>Maria Santos</td>
                                <td>R$ 89,90</td>
                                <td>Cartão</td>
                                <td><span class="status-badge status-approved">Aprovado</span></td>
                                <td>29/08/2025 15:25</td>
                            </tr>
                            <tr>
                                <td>TXN_003</td>
                                <td>Pedro Costa</td>
                                <td>R$ 200,00</td>
                                <td>Boleto</td>
                                <td><span class="status-badge status-pending">Pendente</span></td>
                                <td>29/08/2025 15:20</td>
                            </tr>
                            <tr>
                                <td>TXN_004</td>
                                <td>Ana Oliveira</td>
                                <td>R$ 75,50</td>
                                <td>PIX</td>
                                <td><span class="status-badge status-failed">Falhou</span></td>
                                <td>29/08/2025 15:15</td>
                            </tr>
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
</body>
</html>
  `);
});

// Rota da Documentação da API
app.get('/api', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - Gateway de Pagamentos</title>
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

        .api-grid {
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

        .endpoint {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #1a73e8;
        }

        .endpoint-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .method {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            color: white;
        }

        .method-get {
            background: #28a745;
        }

        .method-post {
            background: #007bff;
        }

        .method-put {
            background: #ffc107;
            color: #333;
        }

        .method-delete {
            background: #dc3545;
        }

        .endpoint-url {
            font-family: 'Courier New', monospace;
            font-size: 1rem;
            color: #1a73e8;
            font-weight: 500;
        }

        .endpoint-description {
            color: #5f6368;
            margin-bottom: 15px;
        }

        .code-block {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            overflow-x: auto;
            margin: 10px 0;
        }

        .response-example {
            background: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 6px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            margin: 10px 0;
        }

        .param-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        .param-table th,
        .param-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e8eaed;
        }

        .param-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #202124;
        }

        .required {
            background: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7rem;
        }

        .optional {
            background: #6c757d;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7rem;
        }

        .quick-links {
            display: grid;
            gap: 15px;
        }

        .quick-link {
            padding: 15px;
            border: 2px solid #e8eaed;
            border-radius: 8px;
            text-decoration: none;
            color: #202124;
            transition: all 0.3s ease;
        }

        .quick-link:hover {
            border-color: #1a73e8;
            background: #f8f9ff;
        }

        .quick-link h3 {
            color: #1a73e8;
            margin-bottom: 5px;
        }

        .quick-link p {
            color: #5f6368;
            font-size: 0.9rem;
        }

        .auth-section {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .auth-section h3 {
            color: #856404;
            margin-bottom: 10px;
        }

        .auth-section p {
            color: #856404;
        }

        @media (max-width: 768px) {
            .api-grid {
                grid-template-columns: 1fr;
                gap: 20px;
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
            <h1>🔗 Documentação da API</h1>
            <p>Integre o Gateway de Pagamentos em sua aplicação</p>
        </div>

        <div class="api-grid">
            <div class="main-content">
                <div class="auth-section">
                    <h3>🔐 Autenticação</h3>
                    <p>Todas as requisições devem incluir o header de autorização:</p>
                    <div class="code-block">Authorization: Bearer YOUR_API_KEY</div>
                </div>

                <div class="section">
                    <h2>💳 Pagamentos</h2>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method method-post">POST</span>
                            <span class="endpoint-url">/api/charges</span>
                        </div>
                        <div class="endpoint-description">Criar uma nova cobrança</div>
                        
                        <h4>Parâmetros:</h4>
                        <table class="param-table">
                            <thead>
                                <tr>
                                    <th>Campo</th>
                                    <th>Tipo</th>
                                    <th>Obrigatório</th>
                                    <th>Descrição</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>amount</td>
                                    <td>number</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>Valor em centavos</td>
                                </tr>
                                <tr>
                                    <td>description</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>Descrição da cobrança</td>
                                </tr>
                                <tr>
                                    <td>payment_method</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>pix, credit_card, boleto</td>
                                </tr>
                                <tr>
                                    <td>customer</td>
                                    <td>object</td>
                                    <td><span class="optional">Não</span></td>
                                    <td>Dados do cliente</td>
                                </tr>
                            </tbody>
                        </table>

                        <h4>Exemplo de Requisição:</h4>
                        <div class="code-block">
curl -X POST https://api.gateway.com/charges \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "description": "Pagamento de teste",
    "payment_method": "pix",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com",
      "cpf": "123.456.789-00"
    }
  }'
                        </div>

                        <h4>Resposta de Sucesso:</h4>
                        <div class="response-example">
{
  "success": true,
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "description": "Pagamento de teste",
    "status": "pending",
    "payment_method": "pix",
    "pix_qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "pix_code": "00020126580014br.gov.bcb.pix0136...",
    "created_at": "2025-08-29T15:30:00Z"
  }
}
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method method-get">GET</span>
                            <span class="endpoint-url">/api/charges/{id}</span>
                        </div>
                        <div class="endpoint-description">Consultar status de uma cobrança</div>
                        
                        <h4>Resposta:</h4>
                        <div class="response-example">
{
  "success": true,
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "description": "Pagamento de teste",
    "status": "approved",
    "payment_method": "pix",
    "paid_at": "2025-08-29T15:35:00Z",
    "created_at": "2025-08-29T15:30:00Z"
  }
}
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>👥 Usuários</h2>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method method-post">POST</span>
                            <span class="endpoint-url">/api/users</span>
                        </div>
                        <div class="endpoint-description">Criar novo usuário</div>
                        
                        <h4>Parâmetros:</h4>
                        <table class="param-table">
                            <thead>
                                <tr>
                                    <th>Campo</th>
                                    <th>Tipo</th>
                                    <th>Obrigatório</th>
                                    <th>Descrição</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>name</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>Nome completo</td>
                                </tr>
                                <tr>
                                    <td>email</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>E-mail válido</td>
                                </tr>
                                <tr>
                                    <td>password</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>Senha (mín. 8 caracteres)</td>
                                </tr>
                                <tr>
                                    <td>cpf</td>
                                    <td>string</td>
                                    <td><span class="required">Sim</span></td>
                                    <td>CPF válido</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="section">
                    <h2>🔔 Webhooks</h2>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method method-post">POST</span>
                            <span class="endpoint-url">/api/webhooks</span>
                        </div>
                        <div class="endpoint-description">Configurar webhook para notificações</div>
                        
                        <h4>Eventos Disponíveis:</h4>
                        <ul style="margin: 15px 0; padding-left: 20px;">
                            <li><strong>charge.created</strong> - Cobrança criada</li>
                            <li><strong>charge.paid</strong> - Cobrança paga</li>
                            <li><strong>charge.failed</strong> - Cobrança falhou</li>
                            <li><strong>charge.expired</strong> - Cobrança expirada</li>
                            <li><strong>payout.created</strong> - Payout criado</li>
                            <li><strong>payout.completed</strong> - Payout concluído</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <div class="section">
                    <h2>📚 Links Rápidos</h2>
                    <div class="quick-links">
                        <a href="#authentication" class="quick-link">
                            <h3>🔐 Autenticação</h3>
                            <p>Como autenticar suas requisições</p>
                        </a>
                        <a href="#payments" class="quick-link">
                            <h3>💳 Pagamentos</h3>
                            <p>Criar e gerenciar cobranças</p>
                        </a>
                        <a href="#users" class="quick-link">
                            <h3>👥 Usuários</h3>
                            <p>Gestão de usuários</p>
                        </a>
                        <a href="#webhooks" class="quick-link">
                            <h3>🔔 Webhooks</h3>
                            <p>Configurar notificações</p>
                        </a>
                    </div>
                </div>

                <div class="section">
                    <h2>🛠️ SDKs</h2>
                    <div class="quick-links">
                        <a href="#" class="quick-link">
                            <h3>📱 Node.js</h3>
                            <p>SDK oficial para Node.js</p>
                        </a>
                        <a href="#" class="quick-link">
                            <h3>🐍 Python</h3>
                            <p>SDK oficial para Python</p>
                        </a>
                        <a href="#" class="quick-link">
                            <h3>☕ Java</h3>
                            <p>SDK oficial para Java</p>
                        </a>
                        <a href="#" class="quick-link">
                            <h3>🔵 C#</h3>
                            <p>SDK oficial para .NET</p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
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

        .content-grid {
            display: grid;
            grid-template-columns: 1fr 400px;
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

        .webhook-form {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
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

        .btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn:hover {
            background: #1557b0;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: #6c757d;
        }

        .btn-secondary:hover {
            background: #545b62;
        }

        .events-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .event-card {
            background: white;
            border: 2px solid #e8eaed;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
        }

        .event-card:hover {
            border-color: #1a73e8;
            box-shadow: 0 4px 12px rgba(26, 115, 232, 0.1);
        }

        .event-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .event-icon {
            width: 40px;
            height: 40px;
            background: #e3f2fd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: #1a73e8;
        }

        .event-title {
            font-weight: 600;
            color: #202124;
            font-size: 1.1rem;
        }

        .event-description {
            color: #5f6368;
            margin-bottom: 15px;
        }

        .event-example {
            background: #f8f9fa;
            border: 1px solid #e8eaed;
            border-radius: 6px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            margin-top: 10px;
        }

        .webhook-list {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
        }

        .webhook-item {
            background: white;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #1a73e8;
        }

        .webhook-item:last-child {
            margin-bottom: 0;
        }

        .webhook-url {
            font-family: 'Courier New', monospace;
            color: #1a73e8;
            font-weight: 500;
            margin-bottom: 5px;
        }

        .webhook-events {
            color: #5f6368;
            font-size: 0.9rem;
        }

        .webhook-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-top: 10px;
        }

        .status-active {
            background: #d4edda;
            color: #155724;
        }

        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }

        .test-section {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }

        .test-section h3 {
            color: #856404;
            margin-bottom: 15px;
        }

        .test-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .test-btn {
            background: #ffc107;
            color: #333;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .test-btn:hover {
            background: #e0a800;
            transform: translateY(-1px);
        }

        .logs-section {
            background: #2d3748;
            color: #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }

        .log-entry {
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
        }

        .log-time {
            color: #a0aec0;
            font-size: 0.8rem;
        }

        .log-event {
            color: #68d391;
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .form-row {
                grid-template-columns: 1fr;
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
            <h1>🔔 Webhooks</h1>
            <p>Configure notificações em tempo real para eventos de pagamento</p>
        </div>

        <div class="content-grid">
            <div class="main-content">
                <div class="section">
                    <h2>➕ Adicionar Webhook</h2>
                    <form class="webhook-form" id="webhookForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="webhookUrl">URL do Webhook</label>
                                <input type="url" id="webhookUrl" name="webhookUrl" placeholder="https://sua-api.com/webhook" required>
                            </div>
                            <div class="form-group">
                                <label for="webhookName">Nome do Webhook</label>
                                <input type="text" id="webhookName" name="webhookName" placeholder="Meu Webhook" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="webhookEvents">Eventos</label>
                            <select id="webhookEvents" name="webhookEvents" multiple>
                                <option value="charge.created">Cobrança Criada</option>
                                <option value="charge.paid">Cobrança Paga</option>
                                <option value="charge.failed">Cobrança Falhou</option>
                                <option value="charge.expired">Cobrança Expirada</option>
                                <option value="payout.created">Payout Criado</option>
                                <option value="payout.completed">Payout Concluído</option>
                                <option value="user.created">Usuário Criado</option>
                                <option value="user.updated">Usuário Atualizado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="webhookSecret">Secret Key (Opcional)</label>
                            <input type="text" id="webhookSecret" name="webhookSecret" placeholder="sua-secret-key">
                        </div>
                        <button type="submit" class="btn">Adicionar Webhook</button>
                    </form>
                </div>

                <div class="section">
                    <h2>📋 Webhooks Configurados</h2>
                    <div class="webhook-list">
                        <div class="webhook-item">
                            <div class="webhook-url">https://minha-api.com/webhook/payments</div>
                            <div class="webhook-events">Eventos: charge.created, charge.paid, charge.failed</div>
                            <span class="webhook-status status-active">Ativo</span>
                        </div>
                        <div class="webhook-item">
                            <div class="webhook-url">https://sistema.com/notifications</div>
                            <div class="webhook-events">Eventos: payout.created, payout.completed</div>
                            <span class="webhook-status status-active">Ativo</span>
                        </div>
                        <div class="webhook-item">
                            <div class="webhook-url">https://old-api.com/webhook</div>
                            <div class="webhook-events">Eventos: charge.created</div>
                            <span class="webhook-status status-inactive">Inativo</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>🧪 Testar Webhooks</h2>
                    <div class="test-section">
                        <h3>Enviar eventos de teste para seus webhooks:</h3>
                        <div class="test-buttons">
                            <button class="test-btn" onclick="testWebhook('charge.created')">Testar Cobrança Criada</button>
                            <button class="test-btn" onclick="testWebhook('charge.paid')">Testar Cobrança Paga</button>
                            <button class="test-btn" onclick="testWebhook('charge.failed')">Testar Cobrança Falhou</button>
                            <button class="test-btn" onclick="testWebhook('payout.created')">Testar Payout Criado</button>
                            <button class="test-btn" onclick="testWebhook('user.created')">Testar Usuário Criado</button>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>📊 Logs de Webhook</h2>
                    <div class="logs-section" id="webhookLogs">
                        <div class="log-entry">
                            <div class="log-time">2025-08-29 15:30:45</div>
                            <div class="log-event">charge.paid</div>
                            <div>Webhook enviado para: https://minha-api.com/webhook/payments</div>
                            <div>Status: 200 OK</div>
                        </div>
                        <div class="log-entry">
                            <div class="log-time">2025-08-29 15:25:12</div>
                            <div class="log-event">charge.created</div>
                            <div>Webhook enviado para: https://minha-api.com/webhook/payments</div>
                            <div>Status: 200 OK</div>
                        </div>
                        <div class="log-entry">
                            <div class="log-time">2025-08-29 15:20:33</div>
                            <div class="log-event">payout.completed</div>
                            <div>Webhook enviado para: https://sistema.com/notifications</div>
                            <div>Status: 200 OK</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <div class="section">
                    <h2>📚 Eventos Disponíveis</h2>
                    <div class="events-grid">
                        <div class="event-card">
                            <div class="event-header">
                                <div class="event-icon">💳</div>
                                <div class="event-title">charge.created</div>
                            </div>
                            <div class="event-description">Disparado quando uma nova cobrança é criada</div>
                            <div class="event-example">
{
  "event": "charge.created",
  "data": {
    "id": "ch_123456789",
    "amount": 10000,
    "status": "pending"
  }
}
                            </div>
                        </div>

                        <div class="event-card">
                            <div class="event-header">
                                <div class="event-icon">✅</div>
                                <div class="event-title">charge.paid</div>
                            </div>
                            <div class="event-description">Disparado quando uma cobrança é paga</div>
                            <div class="event-example">
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
                        </div>

                        <div class="event-card">
                            <div class="event-header">
                                <div class="event-icon">❌</div>
                                <div class="event-title">charge.failed</div>
                            </div>
                            <div class="event-description">Disparado quando uma cobrança falha</div>
                            <div class="event-example">
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
                        </div>

                        <div class="event-card">
                            <div class="event-header">
                                <div class="event-icon">💰</div>
                                <div class="event-title">payout.created</div>
                            </div>
                            <div class="event-description">Disparado quando um payout é criado</div>
                            <div class="event-example">
{
  "event": "payout.created",
  "data": {
    "id": "po_123456789",
    "amount": 50000,
    "status": "pending"
  }
}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>🔐 Segurança</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h3 style="margin-bottom: 15px; color: #202124;">Verificação de Assinatura</h3>
                        <p style="color: #5f6368; margin-bottom: 15px;">Todos os webhooks incluem uma assinatura para verificar a autenticidade:</p>
                        <div style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
X-Gateway-Signature: sha256=abc123...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Adicionar webhook
        document.getElementById('webhookForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Webhook adicionado com sucesso!');
        });

        // Testar webhook
        function testWebhook(event) {
            const logs = document.getElementById('webhookLogs');
            const now = new Date().toLocaleString('pt-BR');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = \`
                <div class="log-time">\${now}</div>
                <div class="log-event">\${event}</div>
                <div>Webhook de teste enviado</div>
                <div>Status: 200 OK</div>
            \`;
            logs.insertBefore(logEntry, logs.firstChild);
        }
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
