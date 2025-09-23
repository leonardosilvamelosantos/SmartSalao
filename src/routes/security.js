/**
 * Rotas de Monitoramento de Segurança
 * Endpoints para visualizar e gerenciar alertas de segurança
 */
const express = require('express');
const router = express.Router();
const SecurityAlertService = require('../services/SecurityAlertService');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/tenant');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// Instanciar serviço de alertas
const securityAlert = new SecurityAlertService();

/**
 * Middleware para verificar se é admin do sistema
 */
const requireSystemAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado - apenas administradores do sistema'
    });
  }
  next();
};

/**
 * GET /api/security/alerts
 * Listar alertas de segurança ativos
 */
router.get('/alerts', 
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { limit = 50, severity, status = 'active' } = req.query;
      
      let alerts = await securityAlert.getActiveAlerts(parseInt(limit));
      
      // Filtrar por severidade se especificado
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      
      // Filtrar por status se especificado
      if (status) {
        alerts = alerts.filter(alert => alert.status === status);
      }
      
      return ApiResponse.success(alerts, 'Alertas de segurança listados')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/security/alerts/:id
 * Obter detalhes de um alerta específico
 */
router.get('/alerts/:id',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const pool = require('../config/database');
      const result = await pool.query(`
        SELECT * FROM security_alerts WHERE id = ?
      `, [id]);
      
      if (result.rows.length === 0) {
        return ApiError.notFound('Alerta não encontrado').send(res);
      }
      
      const alert = result.rows[0];
      
      return ApiResponse.success(alert, 'Detalhes do alerta')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao obter alerta:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * PUT /api/security/alerts/:id/resolve
 * Marcar alerta como resolvido
 */
router.put('/alerts/:id/resolve',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { resolvedBy = req.user.name || 'system' } = req.body;
      
      await securityAlert.resolveAlert(id, resolvedBy);
      
      return ApiResponse.success(null, 'Alerta marcado como resolvido')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/security/events
 * Listar eventos de segurança recentes
 */
router.get('/events',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { 
        limit = 100, 
        eventType, 
        ip, 
        tenantId,
        since 
      } = req.query;
      
      const pool = require('../config/database');
      
      let whereConditions = ['1=1'];
      let params = [];
      let paramCount = 1;
      
      if (eventType) {
        whereConditions.push(`event_type = ?`);
        params.push(eventType);
        paramCount++;
      }
      
      if (ip) {
        whereConditions.push(`ip_address = ?`);
        params.push(ip);
        paramCount++;
      }
      
      if (tenantId) {
        whereConditions.push(`tenant_id = ?`);
        params.push(tenantId);
        paramCount++;
      }
      
      if (since) {
        whereConditions.push(`timestamp > ?`);
        params.push(since);
        paramCount++;
      }
      
      const query = `
        SELECT * FROM security_events 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      params.push(parseInt(limit));
      
      const result = await pool.query(query, params);
      
      return ApiResponse.success(result.rows, 'Eventos de segurança listados')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao listar eventos:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/security/stats
 * Estatísticas de segurança
 */
router.get('/stats',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const pool = require('../config/database');
      
      // Estatísticas gerais
      const totalAlerts = await pool.query(`
        SELECT COUNT(*) as count FROM security_alerts
      `);
      
      const activeAlerts = await pool.query(`
        SELECT COUNT(*) as count FROM security_alerts WHERE status = 'active'
      `);
      
      const criticalAlerts = await pool.query(`
        SELECT COUNT(*) as count FROM security_alerts 
        WHERE status = 'active' AND severity = 'critical'
      `);
      
      // Eventos por tipo (últimas 24h)
      const eventsByType = await pool.query(`
        SELECT event_type, COUNT(*) as count 
        FROM security_events 
        WHERE timestamp > NOW() - INTERVAL '1 day'
        GROUP BY event_type
        ORDER BY count DESC
      `);
      
      // Top IPs com mais eventos (últimas 24h)
      const topIPs = await pool.query(`
        SELECT ip_address, COUNT(*) as count 
        FROM security_events 
        WHERE timestamp > NOW() - INTERVAL '1 day'
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 10
      `);
      
      // Alertas por severidade
      const alertsBySeverity = await pool.query(`
        SELECT severity, COUNT(*) as count 
        FROM security_alerts 
        WHERE status = 'active'
        GROUP BY severity
      `);
      
      const stats = {
        alerts: {
          total: parseInt(totalAlerts.rows[0]?.count || 0),
          active: parseInt(activeAlerts.rows[0]?.count || 0),
          critical: parseInt(criticalAlerts.rows[0]?.count || 0)
        },
        events: {
          byType: eventsByType.rows,
          topIPs: topIPs.rows
        },
        alertsBySeverity: alertsBySeverity.rows,
        lastUpdated: new Date().toISOString()
      };
      
      return ApiResponse.success(stats, 'Estatísticas de segurança')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * POST /api/security/test-alert
 * Testar sistema de alertas (apenas em desenvolvimento)
 */
router.post('/test-alert',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      // Apenas em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return ApiError.forbidden('Teste de alerta não permitido em produção')
          .send(res);
      }
      
      const { type = 'test', severity = 'medium' } = req.body;
      
      const testAlert = {
        alert_type: type,
        severity,
        count: 1,
        ip_address: req.ip,
        tenant_id: req.user.tenant_id,
        details: {
          message: 'Teste de alerta de segurança',
          test: true
        },
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      await securityAlert.generateSecurityAlert(type, 1, testAlert);
      
      return ApiResponse.success(null, 'Alerta de teste enviado')
        .send(res);
        
    } catch (error) {
      console.error('Erro ao testar alerta:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/security/health
 * Health check do sistema de segurança
 */
router.get('/health',
  async (req, res) => {
    try {
      const pool = require('../config/database');
      
      // Verificar se as tabelas existem
      const tablesCheck = await pool.query(`
        SELECT tablename FROM pg_catalog.pg_tables 
        WHERE schemaname NOT IN ('pg_catalog','information_schema')
          AND tablename IN ('security_events','security_alerts')
      `);
      
      const hasRequiredTables = tablesCheck.rows.length >= 2;
      
      // Verificar configurações
      const config = {
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
        securityAlerts: process.env.ENABLE_SECURITY_ALERTS === 'true',
        environment: process.env.NODE_ENV,
        database: hasRequiredTables
      };
      
      const isHealthy = hasRequiredTables && 
                       process.env.ENABLE_RATE_LIMITING === 'true' &&
                       process.env.ENABLE_SECURITY_ALERTS === 'true';
      
      const status = isHealthy ? 'healthy' : 'unhealthy';
      
      return res.status(isHealthy ? 200 : 503).json({
        success: true,
        status,
        config,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Erro no health check:', error);
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;
