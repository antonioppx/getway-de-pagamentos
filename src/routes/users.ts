import { Router } from 'express';
import { query } from '@/config/database';
import logger, { logAudit } from '@/config/logger';
import { authenticateToken, AuthRequest, requireKycApproved } from '@/middlewares/auth';
import { validate, updateProfileSchema, paginationSchema } from '@/middlewares/validation';
import { validateQuery } from '@/middlewares/validation';

const router = Router();

// Obter perfil do usuário
router.get('/profile',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const result = await query(
        `SELECT 
          id, email, first_name, last_name, document, document_type, 
          phone, role, status, kyc_status, balance, daily_limit, 
          monthly_limit, transaction_limit, last_login_at, created_at, updated_at
        FROM users WHERE id = $1`,
        [req.user!.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const user = result.rows[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            document: user.document,
            documentType: user.document_type,
            phone: user.phone,
            role: user.role,
            status: user.status,
            kycStatus: user.kyc_status,
            balance: parseFloat(user.balance),
            dailyLimit: parseFloat(user.daily_limit),
            monthlyLimit: parseFloat(user.monthly_limit),
            transactionLimit: parseFloat(user.transaction_limit),
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao obter perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Atualizar perfil
router.put('/profile',
  authenticateToken,
  validate(updateProfileSchema),
  async (req: AuthRequest, res) => {
    try {
      const { firstName, lastName, phone, document, documentType } = req.body;

      // Verificar se o documento já existe (se foi alterado)
      if (document) {
        const existingDocument = await query(
          'SELECT id FROM users WHERE document = $1 AND id != $2',
          [document, req.user!.userId]
        );

        if (existingDocument.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Documento já cadastrado',
            timestamp: res.locals.timestamp
          });
        }
      }

      // Construir query de atualização dinamicamente
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (firstName) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }

      if (lastName) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }

      if (phone) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(phone);
      }

      if (document) {
        updateFields.push(`document = $${paramCount++}`);
        values.push(document);
      }

      if (documentType) {
        updateFields.push(`document_type = $${paramCount++}`);
        values.push(documentType);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum campo para atualizar',
          timestamp: res.locals.timestamp
        });
      }

      values.push(req.user!.userId);
      const queryText = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;

      await query(queryText, values);

      // Log de auditoria
      logAudit('profile_updated', req.user!.userId, {
        updatedFields: Object.keys(req.body),
        ip: req.ip
      });

      logger.info('Perfil atualizado com sucesso', { userId: req.user!.userId });

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Obter saldo
router.get('/balance',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const result = await query(
        'SELECT balance FROM users WHERE id = $1',
        [req.user!.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const balance = parseFloat(result.rows[0].balance);

      res.json({
        success: true,
        data: {
          balance,
          currency: 'BRL'
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao obter saldo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar transações
router.get('/transactions',
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
      if (req.query.type) {
        whereClause += ` AND type = $${paramCount++}`;
        queryParams.push(req.query.type as string);
      }

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
        `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Query para buscar transações
      const transactionsResult = await query(
        `SELECT 
          id, type, status, amount, fee, net_amount, currency, 
          payment_method, description, external_id, metadata,
          processed_at, expires_at, created_at, updated_at
        FROM transactions 
        ${whereClause}
        ORDER BY ${orderBy} ${sort}
        LIMIT $${paramCount++} OFFSET $${paramCount++}`,
        [...queryParams, limit, offset]
      );

      const transactions = transactionsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: parseFloat(row.amount),
        fee: parseFloat(row.fee),
        netAmount: parseFloat(row.net_amount),
        currency: row.currency,
        paymentMethod: row.payment_method,
        description: row.description,
        externalId: row.external_id,
        metadata: row.metadata,
        processedAt: row.processed_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          transactions,
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
      logger.error('Erro ao listar transações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Enviar documento KYC
router.post('/kyc',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { type, description } = req.body;

      // Verificar se o tipo de documento é válido
      const validTypes = ['cpf', 'cnpj', 'rg', 'comprovante_residencia'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de documento inválido',
          timestamp: res.locals.timestamp
        });
      }

      // Aqui você implementaria o upload do arquivo
      // Por simplicidade, vamos apenas simular
      const filename = `kyc_${req.user!.userId}_${Date.now()}.pdf`;
      const originalName = 'documento.pdf';
      const mimeType = 'application/pdf';
      const size = 1024 * 1024; // 1MB

      // Inserir documento KYC
      const result = await query(
        `INSERT INTO kyc_documents (
          user_id, type, filename, original_name, mime_type, size, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, type, status, created_at`,
        [req.user!.userId, type, filename, originalName, mimeType, size, 'pending']
      );

      const document = result.rows[0];

      // Log de auditoria
      logAudit('kyc_document_uploaded', req.user!.userId, {
        documentType: type,
        documentId: document.id,
        ip: req.ip
      });

      logger.info('Documento KYC enviado com sucesso', { 
        userId: req.user!.userId, 
        documentId: document.id,
        type 
      });

      res.status(201).json({
        success: true,
        message: 'Documento KYC enviado com sucesso',
        data: {
          document: {
            id: document.id,
            type: document.type,
            status: document.status,
            createdAt: document.created_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao enviar documento KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar documentos KYC
router.get('/kyc',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const result = await query(
        `SELECT 
          id, type, filename, original_name, mime_type, size, status,
          reviewed_by, reviewed_at, created_at
        FROM kyc_documents 
        WHERE user_id = $1 
        ORDER BY created_at DESC`,
        [req.user!.userId]
      );

      const documents = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: row.size,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at
      }));

      res.json({
        success: true,
        data: {
          documents
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao listar documentos KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Obter estatísticas do usuário
router.get('/stats',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      // Estatísticas de transações
      const transactionsStats = await query(
        `SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_volume
        FROM transactions 
        WHERE user_id = $1`,
        [req.user!.userId]
      );

      // Estatísticas de cobranças
      const chargesStats = await query(
        `SELECT 
          COUNT(*) as total_charges,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_charges,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_charges,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_charges_amount
        FROM charges 
        WHERE user_id = $1`,
        [req.user!.userId]
      );

      // Estatísticas de payouts
      const payoutsStats = await query(
        `SELECT 
          COUNT(*) as total_payouts,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payouts,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_payouts_amount
        FROM payouts 
        WHERE user_id = $1`,
        [req.user!.userId]
      );

      const stats = {
        transactions: {
          total: parseInt(transactionsStats.rows[0].total_transactions),
          completed: parseInt(transactionsStats.rows[0].completed_transactions),
          pending: parseInt(transactionsStats.rows[0].pending_transactions),
          failed: parseInt(transactionsStats.rows[0].failed_transactions),
          totalVolume: parseFloat(transactionsStats.rows[0].total_volume)
        },
        charges: {
          total: parseInt(chargesStats.rows[0].total_charges),
          completed: parseInt(chargesStats.rows[0].completed_charges),
          pending: parseInt(chargesStats.rows[0].pending_charges),
          totalAmount: parseFloat(chargesStats.rows[0].total_charges_amount)
        },
        payouts: {
          total: parseInt(payoutsStats.rows[0].total_payouts),
          completed: parseInt(payoutsStats.rows[0].completed_payouts),
          pending: parseInt(payoutsStats.rows[0].pending_payouts),
          totalAmount: parseFloat(payoutsStats.rows[0].total_payouts_amount)
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
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

export default router;
