import { Router } from 'express';
import { query } from '@/config/database';
import logger, { logAudit } from '@/config/logger';
import { authenticateToken, AuthRequest, requireAdmin } from '@/middlewares/auth';
import { validate, paginationSchema } from '@/middlewares/validation';
import { validateQuery } from '@/middlewares/validation';

const router = Router();

// Aplicar middleware de admin em todas as rotas
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard administrativo
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    // Estatísticas gerais
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN kyc_status = 'approved' THEN 1 END) as kyc_approved_users
      FROM users
    `);

    const transactionsResult = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_volume
      FROM transactions
    `);

    const chargesResult = await query(`
      SELECT 
        COUNT(*) as total_charges,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_charges,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_charges_amount
      FROM charges
    `);

    const payoutsResult = await query(`
      SELECT 
        COUNT(*) as total_payouts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payouts,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_payouts_amount
      FROM payouts
    `);

    const stats = {
      users: {
        total: parseInt(statsResult.rows[0].total_users),
        active: parseInt(statsResult.rows[0].active_users),
        kycApproved: parseInt(statsResult.rows[0].kyc_approved_users)
      },
      transactions: {
        total: parseInt(transactionsResult.rows[0].total_transactions),
        completed: parseInt(transactionsResult.rows[0].completed_transactions),
        pending: parseInt(transactionsResult.rows[0].pending_transactions),
        totalVolume: parseFloat(transactionsResult.rows[0].total_volume)
      },
      charges: {
        total: parseInt(chargesResult.rows[0].total_charges),
        completed: parseInt(chargesResult.rows[0].completed_charges),
        totalAmount: parseFloat(chargesResult.rows[0].total_charges_amount)
      },
      payouts: {
        total: parseInt(payoutsResult.rows[0].total_payouts),
        completed: parseInt(payoutsResult.rows[0].completed_payouts),
        totalAmount: parseFloat(payoutsResult.rows[0].total_payouts_amount)
      }
    };

    res.json({
      success: true,
      data: {
        stats
      },
      timestamp: res.locals.timestamp
    });

  } catch (error) {
    logger.error('Erro ao obter dashboard admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: res.locals.timestamp
    });
  }
});

// Listar usuários
router.get('/users',
  validateQuery(paginationSchema),
  async (req: AuthRequest, res) => {
    try {
      const { page = 1, limit = 20, sort = 'desc', orderBy = 'created_at' } = req.query;
      const offset = (page - 1) * limit;

      // Construir query com filtros
      let whereClause = '';
      const queryParams = [];
      let paramCount = 1;

      // Adicionar filtros se fornecidos
      if (req.query.status) {
        whereClause += `WHERE status = $${paramCount++}`;
        queryParams.push(req.query.status as string);
      }

      if (req.query.role) {
        whereClause += whereClause ? ` AND role = $${paramCount++}` : `WHERE role = $${paramCount++}`;
        queryParams.push(req.query.role as string);
      }

      if (req.query.kycStatus) {
        whereClause += whereClause ? ` AND kyc_status = $${paramCount++}` : `WHERE kyc_status = $${paramCount++}`;
        queryParams.push(req.query.kycStatus as string);
      }

      // Query para contar total
      const countResult = await query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Query para buscar usuários
      const usersResult = await query(
        `SELECT 
          id, email, first_name, last_name, document, document_type, phone,
          role, status, kyc_status, balance, daily_limit, monthly_limit,
          transaction_limit, last_login_at, created_at, updated_at
        FROM users 
        ${whereClause}
        ORDER BY ${orderBy} ${sort}
        LIMIT $${paramCount++} OFFSET $${paramCount++}`,
        [...queryParams, limit, offset]
      );

      const users = usersResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        document: row.document,
        documentType: row.document_type,
        phone: row.phone,
        role: row.role,
        status: row.status,
        kycStatus: row.kyc_status,
        balance: parseFloat(row.balance),
        dailyLimit: parseFloat(row.daily_limit),
        monthlyLimit: parseFloat(row.monthly_limit),
        transactionLimit: parseFloat(row.transaction_limit),
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Aprovar KYC
router.put('/users/:id/kyc',
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // Verificar se o usuário existe
      const userResult = await query(
        'SELECT id, email FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      // Atualizar status KYC
      await query(
        'UPDATE users SET kyc_status = $1 WHERE id = $2',
        [status, id]
      );

      // Log de auditoria
      logAudit('kyc_status_updated', req.user!.userId, {
        targetUserId: id,
        status,
        reason,
        ip: req.ip
      });

      logger.info('Status KYC atualizado', { 
        adminId: req.user!.userId, 
        userId: id, 
        status 
      });

      res.json({
        success: true,
        message: 'Status KYC atualizado com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao atualizar status KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Configurar taxas
router.post('/settings/fees',
  async (req: AuthRequest, res) => {
    try {
      const { paymentMethod, percentage, fixed, minAmount, maxAmount, active } = req.body;

      // Verificar se a configuração já existe
      const existingResult = await query(
        'SELECT id FROM fee_settings WHERE payment_method = $1',
        [paymentMethod]
      );

      if (existingResult.rows.length > 0) {
        // Atualizar configuração existente
        await query(
          `UPDATE fee_settings 
           SET percentage = $1, fixed = $2, min_amount = $3, max_amount = $4, active = $5
           WHERE payment_method = $6`,
          [percentage, fixed, minAmount, maxAmount, active, paymentMethod]
        );
      } else {
        // Inserir nova configuração
        await query(
          `INSERT INTO fee_settings (
            payment_method, percentage, fixed, min_amount, max_amount, active
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [paymentMethod, percentage, fixed, minAmount, maxAmount, active]
        );
      }

      // Log de auditoria
      logAudit('fee_settings_updated', req.user!.userId, {
        paymentMethod,
        percentage,
        fixed,
        minAmount,
        maxAmount,
        active,
        ip: req.ip
      });

      logger.info('Configurações de taxa atualizadas', { 
        adminId: req.user!.userId, 
        paymentMethod 
      });

      res.json({
        success: true,
        message: 'Configurações de taxa atualizadas com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao atualizar configurações de taxa:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar configurações de taxa
router.get('/settings/fees',
  async (req: AuthRequest, res) => {
    try {
      const result = await query(
        'SELECT * FROM fee_settings ORDER BY payment_method'
      );

      const fees = result.rows.map(row => ({
        id: row.id,
        paymentMethod: row.payment_method,
        percentage: parseFloat(row.percentage),
        fixed: parseFloat(row.fixed),
        minAmount: parseFloat(row.min_amount),
        maxAmount: parseFloat(row.max_amount),
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          fees
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao listar configurações de taxa:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

export default router;
