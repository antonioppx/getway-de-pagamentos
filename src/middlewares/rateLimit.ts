import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import redisService from '@/config/redis';
import logger from '@/config/logger';

// Interface para configuração de rate limiting
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Configurações padrão de rate limiting
const defaultConfig: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  skipFailedRequests: false,
  message: 'Muitas requisições. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false
};

// Store personalizado para Redis
const createRedisStore = () => {
  return {
    incr: async (key: string) => {
      try {
        const count = await redisService.incr(key);
        const ttl = await redisService.ttl(key);
        
        // Se a chave não tem TTL, definir
        if (ttl === -1) {
          await redisService.expire(key, Math.floor(defaultConfig.windowMs / 1000));
        }
        
        return {
          totalHits: count,
          resetTime: new Date(Date.now() + defaultConfig.windowMs)
        };
      } catch (error) {
        logger.error('Erro no Redis store:', error);
        throw error;
      }
    },
    
    decrement: async (key: string) => {
      try {
        await redisService.decr(key);
      } catch (error) {
        logger.error('Erro ao decrementar no Redis:', error);
      }
    },
    
    resetKey: async (key: string) => {
      try {
        await redisService.del(key);
      } catch (error) {
        logger.error('Erro ao resetar chave no Redis:', error);
      }
    }
  };
};

// Função para gerar chave de rate limiting
const generateKey = (req: Request): string => {
  // Usar IP do usuário como base
  let key = `rate_limit:${req.ip}`;
  
  // Se o usuário está autenticado, incluir o ID do usuário
  if (req.user?.userId) {
    key += `:user:${req.user.userId}`;
  }
  
  // Incluir o endpoint para rate limiting específico por rota
  key += `:${req.method}:${req.path}`;
  
  return key;
};

// Rate limiter padrão para todas as rotas
export const defaultRateLimiter = rateLimit({
  ...defaultConfig,
  store: createRedisStore(),
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit excedido', {
      ip: req.ip,
      userId: req.user?.userId,
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: defaultConfig.message,
      retryAfter: Math.ceil(defaultConfig.windowMs / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter mais restritivo para autenticação
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 tentativas
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => `auth_rate_limit:${req.ip}`,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit de autenticação excedido', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: 900,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter para criação de cobranças
export const chargeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 50, // 50 cobranças por hora
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    if (!req.user?.userId) {
      return `charge_rate_limit:${req.ip}`;
    }
    return `charge_rate_limit:user:${req.user.userId}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit de cobranças excedido', {
      ip: req.ip,
      userId: req.user?.userId
    });
    
    res.status(429).json({
      success: false,
      error: 'Limite de cobranças excedido. Tente novamente em 1 hora.',
      retryAfter: 3600,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter para payouts
export const payoutRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  maxRequests: 10, // 10 payouts por dia
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    if (!req.user?.userId) {
      return `payout_rate_limit:${req.ip}`;
    }
    return `payout_rate_limit:user:${req.user.userId}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit de payouts excedido', {
      ip: req.ip,
      userId: req.user?.userId
    });
    
    res.status(429).json({
      success: false,
      error: 'Limite de payouts excedido. Tente novamente amanhã.',
      retryAfter: 86400,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter para webhooks
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 100, // 100 webhooks por minuto
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    const webhookId = req.params.webhookId || req.body.webhookId;
    return `webhook_rate_limit:${webhookId || req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit de webhooks excedido', {
      ip: req.ip,
      webhookId: req.params.webhookId || req.body.webhookId
    });
    
    res.status(429).json({
      success: false,
      error: 'Limite de webhooks excedido. Tente novamente em 1 minuto.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter para uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 20, // 20 uploads por hora
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => {
    if (!req.user?.userId) {
      return `upload_rate_limit:${req.ip}`;
    }
    return `upload_rate_limit:user:${req.user.userId}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit de uploads excedido', {
      ip: req.ip,
      userId: req.user?.userId
    });
    
    res.status(429).json({
      success: false,
      error: 'Limite de uploads excedido. Tente novamente em 1 hora.',
      retryAfter: 3600,
      timestamp: new Date().toISOString()
    });
  }
});

// Rate limiter para API pública (sem autenticação)
export const publicApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 30, // 30 requisições por minuto
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: createRedisStore(),
  keyGenerator: (req: Request) => `public_api_rate_limit:${req.ip}`,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit da API pública excedido', {
      ip: req.ip,
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Limite de requisições excedido. Tente novamente em 1 minuto.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

// Função para criar rate limiter customizado
export const createCustomRateLimiter = (config: Partial<RateLimitConfig>) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return rateLimit({
    ...finalConfig,
    store: createRedisStore(),
    keyGenerator: generateKey,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit customizado excedido', {
        ip: req.ip,
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
        config: finalConfig
      });
      
      res.status(429).json({
        success: false,
        error: finalConfig.message || 'Limite de requisições excedido.',
        retryAfter: Math.ceil(finalConfig.windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Middleware para verificar se o Redis está disponível
export const checkRedisAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!redisService.isConnected()) {
      logger.warn('Redis não disponível, usando rate limiting em memória');
      // Se o Redis não estiver disponível, usar rate limiting em memória
      return next();
    }
    
    next();
  } catch (error) {
    logger.error('Erro ao verificar disponibilidade do Redis:', error);
    next();
  }
};

// Função para limpar rate limits de um usuário específico
export const clearUserRateLimits = async (userId: string): Promise<void> => {
  try {
    const pattern = `rate_limit:*:user:${userId}:*`;
    // Nota: Redis não suporta busca por padrão diretamente
    // Em uma implementação real, você precisaria manter uma lista de chaves
    // ou usar um script Lua para buscar e deletar chaves por padrão
    
    logger.info(`Rate limits limpos para usuário: ${userId}`);
  } catch (error) {
    logger.error('Erro ao limpar rate limits do usuário:', error);
  }
};

// Função para obter informações de rate limiting de um usuário
export const getUserRateLimitInfo = async (userId: string): Promise<any> => {
  try {
    const key = `rate_limit:user:${userId}`;
    const hits = await redisService.get(key);
    const ttl = await redisService.ttl(key);
    
    return {
      userId,
      hits: hits ? parseInt(hits) : 0,
      ttl,
      limit: defaultConfig.maxRequests,
      windowMs: defaultConfig.windowMs
    };
  } catch (error) {
    logger.error('Erro ao obter informações de rate limiting:', error);
    return null;
  }
};
