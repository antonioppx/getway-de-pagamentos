import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/config/database';
import redisService from '@/config/redis';
import logger from '@/config/logger';
import { User, JwtPayload, RefreshToken } from '@/types';

export class AuthController {
  // Registrar novo usuário
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, cpf, phone, role = 'user' } = req.body;

      // Verificar se email já existe
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email já cadastrado',
          timestamp: res.locals.timestamp
        });
      }

      // Verificar se CPF já existe
      if (cpf) {
        const existingCpf = await query(
          'SELECT id FROM users WHERE cpf = $1',
          [cpf]
        );

        if (existingCpf.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'CPF já cadastrado',
            timestamp: res.locals.timestamp
          });
        }
      }

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Criar usuário
      const userId = uuidv4();
      const result = await query(
        `INSERT INTO users (id, name, email, password, cpf, phone, role, status, kyc_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, email, cpf, phone, role, status, kyc_status, created_at`,
        [userId, name, email, hashedPassword, cpf, phone, role, 'active', 'pending']
      );

      const user = result.rows[0];

      // Gerar tokens
      const accessToken = AuthController.generateAccessToken(user);
      const refreshToken = await AuthController.generateRefreshToken(user.id);

      // Log de auditoria
      logger.info(`Novo usuário registrado: ${user.email}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
            role: user.role,
            status: user.status,
            kyc_status: user.kyc_status,
            created_at: user.created_at
          },
          access_token: accessToken,
          refresh_token: refreshToken.token,
          expires_in: parseInt(process.env.JWT_EXPIRES_IN || '3600')
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro no registro:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Login do usuário
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas',
          timestamp: res.locals.timestamp
        });
      }

      const user = result.rows[0];

      // Verificar se usuário está ativo
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Conta desativada',
          timestamp: res.locals.timestamp
        });
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas',
          timestamp: res.locals.timestamp
        });
      }

      // Atualizar último login
      await query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Gerar tokens
      const accessToken = AuthController.generateAccessToken(user);
      const refreshToken = await AuthController.generateRefreshToken(user.id);

      // Log de auditoria
      logger.info(`Login realizado: ${user.email}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
            role: user.role,
            status: user.status,
            kyc_status: user.kyc_status,
            balance: user.balance,
            last_login: user.last_login
          },
          access_token: accessToken,
          refresh_token: refreshToken.token,
          expires_in: parseInt(process.env.JWT_EXPIRES_IN || '3600')
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Renovar token de acesso
  static async refresh(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token é obrigatório',
          timestamp: res.locals.timestamp
        });
      }

      // Verificar refresh token no banco
      const result = await query(
        `SELECT rt.*, u.* FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1 AND rt.expires_at > NOW() AND rt.revoked = false`,
        [refresh_token]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido ou expirado',
          timestamp: res.locals.timestamp
        });
      }

      const refreshTokenData = result.rows[0];
      const user = {
        id: refreshTokenData.user_id,
        name: refreshTokenData.name,
        email: refreshTokenData.email,
        role: refreshTokenData.role,
        status: refreshTokenData.status
      };

      // Gerar novo access token
      const accessToken = AuthController.generateAccessToken(user);

      // Log de auditoria
      logger.info(`Token renovado para: ${user.email}`, {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          access_token: accessToken,
          expires_in: parseInt(process.env.JWT_EXPIRES_IN || '3600')
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro na renovação do token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Logout
  static async logout(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      const userId = (req.user as JwtPayload).id;

      if (refresh_token) {
        // Revogar refresh token
        await query(
          'UPDATE refresh_tokens SET revoked = true WHERE token = $1 AND user_id = $2',
          [refresh_token, userId]
        );
      }

      // Log de auditoria
      logger.info(`Logout realizado: ${(req.user as JwtPayload).email}`, {
        userId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Esqueci minha senha
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      // Verificar se usuário existe
      const result = await query(
        'SELECT id, name FROM users WHERE email = $1 AND status = $2',
        [email, 'active']
      );

      if (result.rows.length === 0) {
        // Por segurança, não revelar se o email existe ou não
        return res.json({
          success: true,
          message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação',
          timestamp: res.locals.timestamp
        });
      }

      const user = result.rows[0];

      // Gerar token de reset
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Salvar token no Redis
      await redisService.set(
        `reset_password:${resetToken}`,
        user.id,
        parseInt(process.env.RESET_TOKEN_TTL || '86400')
      );

      // TODO: Enviar email com link de reset
      // Por enquanto, apenas simular
      logger.info(`Solicitação de reset de senha para: ${email}`, {
        userId: user.id,
        resetToken,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro na solicitação de reset de senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Resetar senha
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, new_password } = req.body;

      // Verificar token no Redis
      const userId = await redisService.get(`reset_password:${token}`);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Token inválido ou expirado',
          timestamp: res.locals.timestamp
        });
      }

      // Verificar se usuário existe e está ativo
      const result = await query(
        'SELECT id, email FROM users WHERE id = $1 AND status = $2',
        [userId, 'active']
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Usuário não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const user = result.rows[0];

      // Hash da nova senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // Atualizar senha
      await query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      // Remover token do Redis
      await redisService.del(`reset_password:${token}`);

      // Revogar todos os refresh tokens do usuário
      await query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [userId]
      );

      // Log de auditoria
      logger.info(`Senha resetada para: ${user.email}`, {
        userId: user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro no reset de senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Verificar token
  static async verifyToken(req: Request, res: Response) {
    try {
      const user = req.user as JwtPayload;

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro na verificação do token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }

  // Gerar access token
  private static generateAccessToken(user: any): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
  }

  // Gerar refresh token
  private static async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800000')); // 7 dias

    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [token, userId, expiresAt]
    );

    return {
      token,
      user_id: userId,
      expires_at: expiresAt,
      revoked: false,
      created_at: new Date()
    };
  }
}
