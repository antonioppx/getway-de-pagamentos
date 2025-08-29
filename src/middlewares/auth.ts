import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '@/config/database';
import logger from '@/config/logger';
import { JwtPayload, UserRole } from '@/types';

// Extender a interface Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Middleware para verificar token JWT
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET não configurado');
      res.status(500).json({
        success: false,
        error: 'Erro de configuração do servidor',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verificar token
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Verificar se o usuário ainda existe e está ativo
    const userResult = await query(
      'SELECT id, email, role, status FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado ou inativo',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const user = userResult.rows[0];
    
    // Atualizar dados do token com informações do banco
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
        timestamp: new Date().toISOString()
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expirado',
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('Erro na autenticação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Middleware para verificar se o usuário tem uma role específica
export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acesso não autorizado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: 'Permissão insuficiente',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se o usuário é admin
export const requireAdmin = requireRole(UserRole.ADMIN);

// Middleware para verificar se o usuário é admin ou merchant
export const requireAdminOrMerchant = requireRole([UserRole.ADMIN, UserRole.MERCHANT]);

// Middleware para verificar se o usuário é o próprio ou admin
export const requireOwnershipOrAdmin = (resourceUserIdField: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acesso não autorizado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userRole = req.user.role;
    const userId = req.user.userId;
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    // Admin pode acessar qualquer recurso
    if (userRole === UserRole.ADMIN) {
      next();
      return;
    }

    // Usuário comum só pode acessar seus próprios recursos
    if (userId !== resourceUserId) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado ao recurso',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se o usuário tem KYC aprovado
export const requireKycApproved = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acesso não autorizado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Admin não precisa de KYC
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    const result = await query(
      'SELECT kyc_status FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const kycStatus = result.rows[0].kyc_status;

    if (kycStatus !== 'approved' && kycStatus !== 'not_required') {
      res.status(403).json({
        success: false,
        error: 'KYC não aprovado. Complete a verificação de identidade.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Erro ao verificar KYC:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware para verificar se o usuário tem saldo suficiente
export const requireSufficientBalance = (amountField: string = 'amount') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Acesso não autorizado',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const amount = parseFloat(req.body[amountField] || req.params[amountField]);
      
      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valor inválido',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await query(
        'SELECT balance FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const balance = parseFloat(result.rows[0].balance);

      if (balance < amount) {
        res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erro ao verificar saldo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Middleware para verificar limites de transação
export const checkTransactionLimits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Acesso não autorizado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const amount = parseFloat(req.body.amount);
    
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Valor inválido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await query(
      'SELECT transaction_limit, daily_limit, monthly_limit FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { transaction_limit, daily_limit, monthly_limit } = result.rows[0];

    // Verificar limite por transação
    if (amount > transaction_limit) {
      res.status(400).json({
        success: false,
        error: `Valor excede o limite por transação de R$ ${transaction_limit.toFixed(2)}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verificar limite diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as daily_total FROM transactions WHERE user_id = $1 AND created_at >= $2',
      [req.user.userId, today]
    );

    const dailyTotal = parseFloat(dailyResult.rows[0].daily_total);
    
    if (dailyTotal + amount > daily_limit) {
      res.status(400).json({
        success: false,
        error: `Valor excede o limite diário de R$ ${daily_limit.toFixed(2)}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verificar limite mensal
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthlyResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as monthly_total FROM transactions WHERE user_id = $1 AND created_at >= $2',
      [req.user.userId, monthStart]
    );

    const monthlyTotal = parseFloat(monthlyResult.rows[0].monthly_total);
    
    if (monthlyTotal + amount > monthly_limit) {
      res.status(400).json({
        success: false,
        error: `Valor excede o limite mensal de R$ ${monthly_limit.toFixed(2)}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Erro ao verificar limites:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
};
