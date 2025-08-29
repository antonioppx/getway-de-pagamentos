import { Router } from 'express';
import { query } from '@/config/database';
import logger, { logAudit } from '@/config/logger';
import { authenticateToken, AuthRequest, requireKycApproved, checkTransactionLimits } from '@/middlewares/auth';
import { validate, createChargeSchema, paginationSchema } from '@/middlewares/validation';
import { validateQuery } from '@/middlewares/validation';
import { chargeRateLimiter } from '@/middlewares/rateLimit';
import { TransactionStatus, PaymentMethod } from '@/types';

const router = Router();

// Criar cobrança
router.post('/',
  authenticateToken,
  requireKycApproved,
  chargeRateLimiter,
  checkTransactionLimits,
  validate(createChargeSchema),
  async (req: AuthRequest, res) => {
    try {
      const { amount, description, paymentMethod, currency = 'BRL', expiresAt, metadata } = req.body;

      // Calcular taxa baseada no método de pagamento
      const feeResult = await query(
        'SELECT percentage, fixed FROM fee_settings WHERE payment_method = $1 AND active = true',
        [paymentMethod]
      );

      let fee = 0;
      if (feeResult.rows.length > 0) {
        const feeSettings = feeResult.rows[0];
        fee = (amount * parseFloat(feeSettings.percentage) / 100) + parseFloat(feeSettings.fixed);
      }

      const netAmount = amount - fee;

      // Definir data de expiração padrão se não fornecida
      const expirationHours = parseInt(process.env.CHARGE_EXPIRATION_HOURS || '24');
      const defaultExpiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      const finalExpiresAt = expiresAt ? new Date(expiresAt) : defaultExpiresAt;

      // Gerar dados específicos do método de pagamento
      let pixKey = null;
      let pixQrCode = null;
      let boletoCode = null;
      let boletoUrl = null;

      if (paymentMethod === PaymentMethod.PIX) {
        // Simular geração de PIX
        pixKey = 'user@pagamentos.com';
        pixQrCode = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5913Gateway Pag6008Brasilia62070503***6304E2CA';
      } else if (paymentMethod === PaymentMethod.BOLETO) {
        // Simular geração de boleto
        boletoCode = '34191.79001 01043.510047 91020.150008 4 84410026000';
        boletoUrl = 'https://boleto.example.com/34191790010104351004791020150008484410026000';
      }

      // Inserir cobrança
      const result = await query(
        `INSERT INTO charges (
          user_id, amount, fee, net_amount, currency, description, payment_method,
          status, pix_key, pix_qr_code, boleto_code, boleto_url, metadata, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, amount, fee, net_amount, currency, description, payment_method,
                  status, pix_key, pix_qr_code, boleto_code, boleto_url, metadata,
                  expires_at, created_at`,
        [
          req.user!.userId, amount, fee, netAmount, currency, description, paymentMethod,
          TransactionStatus.PENDING, pixKey, pixQrCode, boletoCode, boletoUrl, metadata, finalExpiresAt
        ]
      );

      const charge = result.rows[0];

      // Log de auditoria
      logAudit('charge_created', req.user!.userId, {
        chargeId: charge.id,
        amount,
        paymentMethod,
        ip: req.ip
      });

      logger.info('Cobrança criada com sucesso', { 
        userId: req.user!.userId, 
        chargeId: charge.id,
        amount,
        paymentMethod 
      });

      res.status(201).json({
        success: true,
        message: 'Cobrança criada com sucesso',
        data: {
          charge: {
            id: charge.id,
            amount: parseFloat(charge.amount),
            fee: parseFloat(charge.fee),
            netAmount: parseFloat(charge.net_amount),
            currency: charge.currency,
            description: charge.description,
            paymentMethod: charge.payment_method,
            status: charge.status,
            pixKey: charge.pix_key,
            pixQrCode: charge.pix_qr_code,
            boletoCode: charge.boleto_code,
            boletoUrl: charge.boleto_url,
            metadata: charge.metadata,
            expiresAt: charge.expires_at,
            createdAt: charge.created_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao criar cobrança:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar cobranças
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

      if (req.query.paymentMethod) {
        whereClause += ` AND payment_method = $${paramCount++}`;
        queryParams.push(req.query.paymentMethod as string);
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
        `SELECT COUNT(*) as total FROM charges ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Query para buscar cobranças
      const chargesResult = await query(
        `SELECT 
          id, amount, fee, net_amount, currency, description, payment_method,
          status, external_id, pix_key, pix_qr_code, boleto_code, boleto_url,
          metadata, expires_at, paid_at, created_at, updated_at
        FROM charges 
        ${whereClause}
        ORDER BY ${orderBy} ${sort}
        LIMIT $${paramCount++} OFFSET $${paramCount++}`,
        [...queryParams, limit, offset]
      );

      const charges = chargesResult.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        fee: parseFloat(row.fee),
        netAmount: parseFloat(row.net_amount),
        currency: row.currency,
        description: row.description,
        paymentMethod: row.payment_method,
        status: row.status,
        externalId: row.external_id,
        pixKey: row.pix_key,
        pixQrCode: row.pix_qr_code,
        boletoCode: row.boleto_code,
        boletoUrl: row.boleto_url,
        metadata: row.metadata,
        expiresAt: row.expires_at,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          charges,
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
      logger.error('Erro ao listar cobranças:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Obter cobrança específica
router.get('/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT 
          id, user_id, amount, fee, net_amount, currency, description, payment_method,
          status, external_id, pix_key, pix_qr_code, boleto_code, boleto_url,
          metadata, expires_at, paid_at, created_at, updated_at
        FROM charges 
        WHERE id = $1 AND user_id = $2`,
        [id, req.user!.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cobrança não encontrada',
          timestamp: res.locals.timestamp
        });
      }

      const charge = result.rows[0];

      res.json({
        success: true,
        data: {
          charge: {
            id: charge.id,
            amount: parseFloat(charge.amount),
            fee: parseFloat(charge.fee),
            netAmount: parseFloat(charge.net_amount),
            currency: charge.currency,
            description: charge.description,
            paymentMethod: charge.payment_method,
            status: charge.status,
            externalId: charge.external_id,
            pixKey: charge.pix_key,
            pixQrCode: charge.pix_qr_code,
            boletoCode: charge.boleto_code,
            boletoUrl: charge.boleto_url,
            metadata: charge.metadata,
            expiresAt: charge.expires_at,
            paidAt: charge.paid_at,
            createdAt: charge.created_at,
            updatedAt: charge.updated_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao obter cobrança:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Cancelar cobrança
router.post('/:id/cancel',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Verificar se a cobrança existe e pertence ao usuário
      const chargeResult = await query(
        'SELECT id, status FROM charges WHERE id = $1 AND user_id = $2',
        [id, req.user!.userId]
      );

      if (chargeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cobrança não encontrada',
          timestamp: res.locals.timestamp
        });
      }

      const charge = chargeResult.rows[0];

      // Verificar se a cobrança pode ser cancelada
      if (charge.status !== TransactionStatus.PENDING) {
        return res.status(400).json({
          success: false,
          error: 'Cobrança não pode ser cancelada',
          timestamp: res.locals.timestamp
        });
      }

      // Cancelar cobrança
      await query(
        'UPDATE charges SET status = $1 WHERE id = $2',
        [TransactionStatus.CANCELLED, id]
      );

      // Log de auditoria
      logAudit('charge_cancelled', req.user!.userId, {
        chargeId: id,
        ip: req.ip
      });

      logger.info('Cobrança cancelada com sucesso', { 
        userId: req.user!.userId, 
        chargeId: id 
      });

      res.json({
        success: true,
        message: 'Cobrança cancelada com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao cancelar cobrança:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

export default router;
