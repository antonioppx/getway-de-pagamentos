import { Router } from 'express';
import { query } from '@/config/database';
import logger, { logAudit } from '@/config/logger';
import { authenticateToken, AuthRequest, requireKycApproved, requireSufficientBalance } from '@/middlewares/auth';
import { validate, createPayoutSchema, paginationSchema } from '@/middlewares/validation';
import { validateQuery } from '@/middlewares/validation';
import { payoutRateLimiter } from '@/middlewares/rateLimit';
import { TransactionStatus } from '@/types';

const router = Router();

// Criar payout
router.post('/',
  authenticateToken,
  requireKycApproved,
  payoutRateLimiter,
  requireSufficientBalance('amount'),
  validate(createPayoutSchema),
  async (req: AuthRequest, res) => {
    try {
      const { 
        amount, bankCode, bankName, agency, account, accountType, 
        beneficiaryName, beneficiaryDocument, currency = 'BRL' 
      } = req.body;

      // Calcular taxa
      const feeResult = await query(
        'SELECT percentage, fixed FROM fee_settings WHERE payment_method = $1 AND active = true',
        ['bank_transfer']
      );

      let fee = 0;
      if (feeResult.rows.length > 0) {
        const feeSettings = feeResult.rows[0];
        fee = (amount * parseFloat(feeSettings.percentage) / 100) + parseFloat(feeSettings.fixed);
      }

      const netAmount = amount - fee;

      // Verificar se o usuário tem saldo suficiente
      const balanceResult = await query(
        'SELECT balance FROM users WHERE id = $1',
        [req.user!.userId]
      );

      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      if (currentBalance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Saldo insuficiente',
          timestamp: res.locals.timestamp
        });
      }

      // Inserir payout
      const result = await query(
        `INSERT INTO payouts (
          user_id, amount, fee, net_amount, currency, bank_code, bank_name,
          agency, account, account_type, beneficiary_name, beneficiary_document, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, amount, fee, net_amount, currency, bank_code, bank_name,
                  agency, account, account_type, beneficiary_name, beneficiary_document,
                  status, created_at`,
        [
          req.user!.userId, amount, fee, netAmount, currency, bankCode, bankName,
          agency, account, accountType, beneficiaryName, beneficiaryDocument, TransactionStatus.PENDING
        ]
      );

      const payout = result.rows[0];

      // Deduzir valor do saldo
      await query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount, req.user!.userId]
      );

      // Log de auditoria
      logAudit('payout_created', req.user!.userId, {
        payoutId: payout.id,
        amount,
        bankCode,
        ip: req.ip
      });

      logger.info('Payout criado com sucesso', { 
        userId: req.user!.userId, 
        payoutId: payout.id,
        amount 
      });

      res.status(201).json({
        success: true,
        message: 'Payout criado com sucesso',
        data: {
          payout: {
            id: payout.id,
            amount: parseFloat(payout.amount),
            fee: parseFloat(payout.fee),
            netAmount: parseFloat(payout.net_amount),
            currency: payout.currency,
            bankCode: payout.bank_code,
            bankName: payout.bank_name,
            agency: payout.agency,
            account: payout.account,
            accountType: payout.account_type,
            beneficiaryName: payout.beneficiary_name,
            beneficiaryDocument: payout.beneficiary_document,
            status: payout.status,
            createdAt: payout.created_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao criar payout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar payouts
router.get('/',
  authenticateToken,
  validateQuery(paginationSchema),
  async (req: AuthRequest, res) => {
    try {
      const { page = 1, limit = 20, sort = 'desc', orderBy = 'created_at' } = req.query;
      const offset = (page - 1) * limit;

      // Construir query com filtros
      let whereClause = 'WHERE user_id = $1';
      const queryParams = [req.user!.userId];
      let paramCount = 2;

      // Adicionar filtros se fornecidos
      if (req.query.status) {
        whereClause += ` AND status = $${paramCount++}`;
        queryParams.push(req.query.status as string);
      }

      if (req.query.startDate) {
        whereClause += ` AND created_at >= $${paramCount++}`;
        queryParams.push(new Date(req.query.startDate as string));
      }

      if (req.query.endDate) {
        whereClause += ` AND created_at <= $${paramCount++}`;
        queryParams.push(new Date(req.query.endDate as string));
      }

      // Query para contar total
      const countResult = await query(
        `SELECT COUNT(*) as total FROM payouts ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Query para buscar payouts
      const payoutsResult = await query(
        `SELECT 
          id, amount, fee, net_amount, currency, bank_code, bank_name,
          agency, account, account_type, beneficiary_name, beneficiary_document,
          status, external_id, processed_at, created_at, updated_at
        FROM payouts 
        ${whereClause}
        ORDER BY ${orderBy} ${sort}
        LIMIT $${paramCount++} OFFSET $${paramCount++}`,
        [...queryParams, limit, offset]
      );

      const payouts = payoutsResult.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        fee: parseFloat(row.fee),
        netAmount: parseFloat(row.net_amount),
        currency: row.currency,
        bankCode: row.bank_code,
        bankName: row.bank_name,
        agency: row.agency,
        account: row.account,
        accountType: row.account_type,
        beneficiaryName: row.beneficiary_name,
        beneficiaryDocument: row.beneficiary_document,
        status: row.status,
        externalId: row.external_id,
        processedAt: row.processed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          payouts,
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
      logger.error('Erro ao listar payouts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Obter payout específico
router.get('/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT 
          id, user_id, amount, fee, net_amount, currency, bank_code, bank_name,
          agency, account, account_type, beneficiary_name, beneficiary_document,
          status, external_id, processed_at, created_at, updated_at
        FROM payouts 
        WHERE id = $1 AND user_id = $2`,
        [id, req.user!.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Payout não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const payout = result.rows[0];

      res.json({
        success: true,
        data: {
          payout: {
            id: payout.id,
            amount: parseFloat(payout.amount),
            fee: parseFloat(payout.fee),
            netAmount: parseFloat(payout.net_amount),
            currency: payout.currency,
            bankCode: payout.bank_code,
            bankName: payout.bank_name,
            agency: payout.agency,
            account: payout.account,
            accountType: payout.account_type,
            beneficiaryName: payout.beneficiary_name,
            beneficiaryDocument: payout.beneficiary_document,
            status: payout.status,
            externalId: payout.external_id,
            processedAt: payout.processed_at,
            createdAt: payout.created_at,
            updatedAt: payout.updated_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao obter payout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

export default router;
