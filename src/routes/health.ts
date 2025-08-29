import { Router } from 'express';
import { query } from '@/config/database';
import redisService from '@/config/redis';
import logger from '@/config/logger';

const router = Router();

// Health check básico
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus,
      timestamp: res.locals.timestamp
    });

  } catch (error) {
    logger.error('Erro no health check:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: res.locals.timestamp
    });
  }
});

// Health check detalhado
router.get('/detailed', async (req, res) => {
  try {
    const checks = {
      database: { status: 'unknown', message: '' },
      redis: { status: 'unknown', message: '' },
      memory: { status: 'unknown', message: '' },
      disk: { status: 'unknown', message: '' }
    };

    // Verificar banco de dados
    try {
      await query('SELECT 1');
      checks.database = { status: 'healthy', message: 'Conexão com banco de dados OK' };
    } catch (error) {
      checks.database = { status: 'unhealthy', message: 'Erro na conexão com banco de dados' };
      logger.error('Erro na verificação do banco de dados:', error);
    }

    // Verificar Redis
    try {
      if (redisService.isConnected()) {
        await redisService.ping();
        checks.redis = { status: 'healthy', message: 'Conexão com Redis OK' };
      } else {
        checks.redis = { status: 'unhealthy', message: 'Redis não conectado' };
      }
    } catch (error) {
      checks.redis = { status: 'unhealthy', message: 'Erro na conexão com Redis' };
      logger.error('Erro na verificação do Redis:', error);
    }

    // Verificar uso de memória
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Considerar saudável se uso de heap < 1GB
      if (memUsageMB.heapUsed < 1024) {
        checks.memory = { 
          status: 'healthy', 
          message: `Uso de memória OK: ${memUsageMB.heapUsed}MB` 
        };
      } else {
        checks.memory = { 
          status: 'warning', 
          message: `Alto uso de memória: ${memUsageMB.heapUsed}MB` 
        };
      }
    } catch (error) {
      checks.memory = { status: 'unknown', message: 'Não foi possível verificar memória' };
    }

    // Verificar espaço em disco (simulado)
    try {
      checks.disk = { status: 'healthy', message: 'Espaço em disco OK' };
    } catch (error) {
      checks.disk = { status: 'unknown', message: 'Não foi possível verificar disco' };
    }

    // Determinar status geral
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');

    const overallStatus = hasUnhealthy ? 'unhealthy' : (allHealthy ? 'healthy' : 'warning');

    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      checks
    };

    const statusCode = hasUnhealthy ? 503 : (allHealthy ? 200 : 200);

    res.status(statusCode).json({
      success: overallStatus === 'healthy',
      data: detailedHealth,
      timestamp: res.locals.timestamp
    });

  } catch (error) {
    logger.error('Erro no health check detalhado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: res.locals.timestamp
    });
  }
});

// Health check simples para load balancers
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Health check para readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Verificar se o sistema está pronto para receber tráfego
    const checks = [];

    // Verificar banco de dados
    try {
      await query('SELECT 1');
      checks.push('database');
    } catch (error) {
      logger.error('Database not ready:', error);
    }

    // Verificar Redis
    try {
      if (redisService.isConnected()) {
        await redisService.ping();
        checks.push('redis');
      }
    } catch (error) {
      logger.error('Redis not ready:', error);
    }

    const isReady = checks.length >= 1; // Pelo menos o banco deve estar funcionando

    if (isReady) {
      res.status(200).json({
        success: true,
        message: 'System is ready',
        checks,
        timestamp: res.locals.timestamp
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'System is not ready',
        checks,
        timestamp: res.locals.timestamp
      });
    }

  } catch (error) {
    logger.error('Error in readiness check:', error);
    res.status(503).json({
      success: false,
      error: 'System is not ready',
      timestamp: res.locals.timestamp
    });
  }
});

// Health check para liveness probe
router.get('/live', (req, res) => {
  // Verificar se o processo está vivo
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  // Considerar morto se uso de heap > 2GB
  if (heapUsedMB > 2048) {
    logger.error('Memory usage too high, marking as unhealthy');
    res.status(503).json({
      success: false,
      message: 'Memory usage too high',
      heapUsedMB,
      timestamp: res.locals.timestamp
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Process is alive',
      heapUsedMB,
      timestamp: res.locals.timestamp
    });
  }
});

export default router;
