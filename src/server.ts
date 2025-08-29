import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Importar configurações
import { query } from '@/config/database';
import redisService from '@/config/redis';
import logger, { logRequest } from '@/config/logger';

// Importar middlewares
import { defaultRateLimiter } from '@/middlewares/rateLimit';

// Importar rotas
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import chargeRoutes from '@/routes/charges';
import payoutRoutes from '@/routes/payouts';
import adminRoutes from '@/routes/admin';
import webhookRoutes from '@/routes/webhooks';
import healthRoutes from '@/routes/health';

// Configurações do servidor
const app = express();
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middlewares de segurança e configuração
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parser de JSON com limite
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logs
app.use(logRequest);

// Rate limiting
app.use(defaultRateLimiter);

// Middleware para adicionar timestamp em todas as respostas
app.use((req, res, next) => {
  res.locals.timestamp = new Date().toISOString();
  next();
});

// Middleware para tratamento de erros assíncronos
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId
  });

  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
    timestamp: res.locals.timestamp
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/health', healthRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Gateway de Pagamentos API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: res.locals.timestamp,
    documentation: '/api/docs'
  });
});

// Rota para documentação da API
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Documentação da API',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Registrar novo usuário',
        'POST /api/auth/login': 'Fazer login',
        'POST /api/auth/refresh': 'Renovar token',
        'POST /api/auth/forgot-password': 'Recuperar senha',
        'POST /api/auth/reset-password': 'Redefinir senha'
      },
      users: {
        'GET /api/users/profile': 'Obter perfil do usuário',
        'PUT /api/users/profile': 'Atualizar perfil',
        'GET /api/users/balance': 'Obter saldo',
        'GET /api/users/transactions': 'Listar transações',
        'POST /api/users/kyc': 'Enviar documento KYC'
      },
      charges: {
        'POST /api/charges': 'Criar cobrança',
        'GET /api/charges': 'Listar cobranças',
        'GET /api/charges/:id': 'Obter cobrança',
        'POST /api/charges/:id/cancel': 'Cancelar cobrança'
      },
      payouts: {
        'POST /api/payouts': 'Criar payout',
        'GET /api/payouts': 'Listar payouts',
        'GET /api/payouts/:id': 'Obter payout'
      },
      admin: {
        'GET /api/admin/users': 'Listar usuários (admin)',
        'PUT /api/admin/users/:id/kyc': 'Aprovar KYC (admin)',
        'GET /api/admin/dashboard': 'Dashboard admin',
        'POST /api/admin/settings': 'Configurar taxas (admin)'
      },
      webhooks: {
        'POST /api/webhooks': 'Configurar webhook',
        'GET /api/webhooks': 'Listar webhooks',
        'DELETE /api/webhooks/:id': 'Remover webhook'
      },
      health: {
        'GET /api/health': 'Status da API'
      }
    },
    timestamp: res.locals.timestamp
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: res.locals.timestamp
  });
});

// Função para inicializar conexões
async function initializeConnections(): Promise<void> {
  try {
    // Testar conexão com banco de dados
    await query('SELECT 1');
    logger.info('Conexão com banco de dados estabelecida');

    // Conectar ao Redis
    await redisService.connect();
    logger.info('Conexão com Redis estabelecida');

  } catch (error) {
    logger.error('Erro ao inicializar conexões:', error);
    throw error;
  }
}

// Função para encerrar conexões
async function closeConnections(): Promise<void> {
  try {
    // Fechar conexão com Redis
    await redisService.disconnect();
    logger.info('Conexão com Redis encerrada');

    // Fechar pool de conexões do banco
    await query('SELECT 1'); // Teste simples
    logger.info('Conexões encerradas com sucesso');

  } catch (error) {
    logger.error('Erro ao encerrar conexões:', error);
  }
}

// Função para iniciar o servidor
async function startServer(): Promise<void> {
  try {
    // Inicializar conexões
    await initializeConnections();

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado na porta ${PORT}`);
      logger.info(`📊 Ambiente: ${NODE_ENV}`);
      logger.info(`🌐 URL: http://localhost:${PORT}`);
      logger.info(`📚 Documentação: http://localhost:${PORT}/api/docs`);
    });

    // Configurar graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Recebido sinal ${signal}. Iniciando graceful shutdown...`);
      
      server.close(async () => {
        logger.info('Servidor HTTP fechado');
        
        await closeConnections();
        
        logger.info('Graceful shutdown concluído');
        process.exit(0);
      });

      // Forçar shutdown após 30 segundos
      setTimeout(() => {
        logger.error('Forçando shutdown após timeout');
        process.exit(1);
      }, 30000);
    };

    // Capturar sinais de interrupção
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Capturar erros não tratados
    process.on('uncaughtException', (error) => {
      logger.error('Erro não capturado:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promise rejeitada não tratada:', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor se executado diretamente
if (require.main === module) {
  startServer();
}

export default app;
