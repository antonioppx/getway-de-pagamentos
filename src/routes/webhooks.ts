import { Router } from 'express';
import { query } from '@/config/database';
import logger, { logAudit } from '@/config/logger';
import { authenticateToken, AuthRequest } from '@/middlewares/auth';
import { validate, webhookSchema } from '@/middlewares/validation';
import { webhookRateLimiter } from '@/middlewares/rateLimit';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configurar webhook
router.post('/',
  authenticateToken,
  webhookRateLimiter,
  validate(webhookSchema),
  async (req: AuthRequest, res) => {
    try {
      const { url, events, active = true } = req.body;

      // Gerar secret para o webhook
      const secret = uuidv4();

      // Inserir webhook
      const result = await query(
        `INSERT INTO webhooks (
          user_id, url, events, secret, active
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, url, events, active, created_at`,
        [req.user!.userId, url, events, secret, active]
      );

      const webhook = result.rows[0];

      // Log de auditoria
      logAudit('webhook_created', req.user!.userId, {
        webhookId: webhook.id,
        url,
        events,
        ip: req.ip
      });

      logger.info('Webhook criado com sucesso', { 
        userId: req.user!.userId, 
        webhookId: webhook.id,
        url 
      });

      res.status(201).json({
        success: true,
        message: 'Webhook configurado com sucesso',
        data: {
          webhook: {
            id: webhook.id,
            url: webhook.url,
            events: webhook.events,
            active: webhook.active,
            secret: secret, // Retornar apenas na criação
            createdAt: webhook.created_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao configurar webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Listar webhooks
router.get('/',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const result = await query(
        `SELECT 
          id, url, events, active, last_triggered_at, created_at, updated_at
        FROM webhooks 
        WHERE user_id = $1 
        ORDER BY created_at DESC`,
        [req.user!.userId]
      );

      const webhooks = result.rows.map(row => ({
        id: row.id,
        url: row.url,
        events: row.events,
        active: row.active,
        lastTriggeredAt: row.last_triggered_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        success: true,
        data: {
          webhooks
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao listar webhooks:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Obter webhook específico
router.get('/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT 
          id, user_id, url, events, active, last_triggered_at, created_at, updated_at
        FROM webhooks 
        WHERE id = $1 AND user_id = $2`,
        [id, req.user!.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const webhook = result.rows[0];

      res.json({
        success: true,
        data: {
          webhook: {
            id: webhook.id,
            url: webhook.url,
            events: webhook.events,
            active: webhook.active,
            lastTriggeredAt: webhook.last_triggered_at,
            createdAt: webhook.created_at,
            updatedAt: webhook.updated_at
          }
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao obter webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Atualizar webhook
router.put('/:id',
  authenticateToken,
  validate(webhookSchema),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { url, events, active } = req.body;

      // Verificar se o webhook existe e pertence ao usuário
      const webhookResult = await query(
        'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
        [id, req.user!.userId]
      );

      if (webhookResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      // Atualizar webhook
      await query(
        'UPDATE webhooks SET url = $1, events = $2, active = $3 WHERE id = $4',
        [url, events, active, id]
      );

      // Log de auditoria
      logAudit('webhook_updated', req.user!.userId, {
        webhookId: id,
        url,
        events,
        active,
        ip: req.ip
      });

      logger.info('Webhook atualizado com sucesso', { 
        userId: req.user!.userId, 
        webhookId: id 
      });

      res.json({
        success: true,
        message: 'Webhook atualizado com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao atualizar webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Remover webhook
router.delete('/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Verificar se o webhook existe e pertence ao usuário
      const webhookResult = await query(
        'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
        [id, req.user!.userId]
      );

      if (webhookResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      // Remover webhook
      await query(
        'DELETE FROM webhooks WHERE id = $1',
        [id]
      );

      // Log de auditoria
      logAudit('webhook_deleted', req.user!.userId, {
        webhookId: id,
        ip: req.ip
      });

      logger.info('Webhook removido com sucesso', { 
        userId: req.user!.userId, 
        webhookId: id 
      });

      res.json({
        success: true,
        message: 'Webhook removido com sucesso',
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao remover webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

// Testar webhook
router.post('/:id/test',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Verificar se o webhook existe e pertence ao usuário
      const webhookResult = await query(
        'SELECT id, url, secret FROM webhooks WHERE id = $1 AND user_id = $2',
        [id, req.user!.userId]
      );

      if (webhookResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado',
          timestamp: res.locals.timestamp
        });
      }

      const webhook = webhookResult.rows[0];

      // Simular envio de webhook
      const testPayload = {
        event: 'webhook.test',
        data: {
          message: 'Este é um teste de webhook',
          timestamp: new Date().toISOString(),
          webhookId: webhook.id
        }
      };

      // Aqui você implementaria o envio real do webhook
      // Por enquanto, apenas logamos
      logger.info('Teste de webhook enviado', {
        webhookId: webhook.id,
        url: webhook.url,
        payload: testPayload
      });

      // Atualizar last_triggered_at
      await query(
        'UPDATE webhooks SET last_triggered_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Teste de webhook enviado com sucesso',
        data: {
          webhookId: webhook.id,
          url: webhook.url,
          payload: testPayload
        },
        timestamp: res.locals.timestamp
      });

    } catch (error) {
      logger.error('Erro ao testar webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: res.locals.timestamp
      });
    }
  }
);

export default router;
