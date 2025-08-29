import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(helmet({
  contentSecurityPolicy: false // Permitir recursos externos para demo
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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rota principal - servir a página HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
