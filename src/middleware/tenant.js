/**
 * Middleware de Isolamento Multi-Tenant
 * Garante que usuários acessem apenas seus próprios dados
 */
const dbConfig = require('../config/database');
const { pool } = dbConfig;
const CacheService = require('../services/CacheService');
const AuthService = require('../services/AuthService');
const logger = require('../config/logging');

class TenantMiddleware {
  constructor() {
    this.authService = new AuthService();
    this.cache = new CacheService();
  }

  /**
   * Middleware principal de isolamento de tenant
   * Deve ser usado APÓS o middleware de autenticação
   */
  isolateTenant = async (req, res, next) => {
    try {
      // Verificar se usuário está autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' }
        });
      }

      const { tenant_id, tenantId, schema, plan, limits } = req.user;
      const actualTenantId = tenant_id || tenantId;

      if (!actualTenantId) {
        logger.warn('TenantMiddleware: tenant_id ausente no token do usuário');
      }

      // O tenant já foi verificado no AuthService.verifyToken()
      // Aqui apenas configuramos o contexto do tenant

      // Configurar contexto do tenant na requisição
      req.tenant = {
        id: actualTenantId,
        schema: schema,
        plan: plan,
        limits: limits,
        status: 'ativo', // Status já verificado no AuthService
        expires_at: null
      };


      // Configurar schema de busca no PostgreSQL
      if (schema && schema !== 'public') {
        // Para queries que precisam acessar dados do tenant
        req.tenantSchema = schema;
      }

      // Log COMPLETAMENTE DESABILITADO para reduzir spam no terminal
      // if (req.user.id && process.env.LOG_TENANT === 'true') {
      //   // Apenas armazenamos no contexto da requisição (SQLite não suporta SET)
      //       // logger.debug(`Tenant ${tenant_id} - User ${req.user.id} autenticado`); // REMOVIDO - spam logs
      // }

      next();

    } catch (error) {
      console.error('Erro no middleware de tenant:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  };

  /**
   * Middleware para verificar limites de uso
   */
  checkLimits = (resourceType) => {
    return async (req, res, next) => {
      try {
        // Em desenvolvimento, pular verificação de limites
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[DEV] Verificação de limites desabilitada para ${resourceType}`);
          return next();
        }

        if (!req.tenant) {
          return res.status(500).json({
            success: false,
            error: { code: 'TENANT_CONTEXT_MISSING', message: 'Contexto do tenant não encontrado' }
          });
        }

        const { id, limits } = req.tenant;
        const limit = limits ? limits[resourceType] : undefined;

        if (limit !== undefined && limit !== null) {
          // Verificar se não excedeu limite
          const allowed = id ? await this.authService.checkPlanLimits(id, resourceType) : true;

          if (!allowed) {
            return res.status(429).json({
              success: false,
              error: {
                code: 'LIMIT_EXCEEDED',
                message: `Limite de ${resourceType} excedido para seu plano`,
                details: { limit, resource_type: resourceType }
              }
            });
          }
        }

        // Registrar uso
        await this.authService.updateResourceUsage(id, resourceType);
        await this.authService.logApiUsage(id, req.originalUrl, req.user?.id);

        next();

      } catch (error) {
        console.error('Erro ao verificar limites:', error);
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
        });
      }
    };
  };

  /**
   * Middleware para verificar permissões específicas
   */
  requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' }
        });
      }

      if (!this.authService.checkPermission(req.user, permission)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Permissões insuficientes para esta ação'
          }
        });
      }

      next();
    };
  };

  /**
   * Middleware para verificar plano
   */
  requirePlan = (requiredPlan) => {
    return (req, res, next) => {
      if (!req.tenant) {
        return res.status(500).json({
          success: false,
          error: { code: 'TENANT_CONTEXT_MISSING', message: 'Contexto do tenant não encontrado' }
        });
      }

      const plans = ['basico', 'profissional', 'premium'];
      const userPlanIndex = plans.indexOf(req.tenant.plan);
      const requiredPlanIndex = plans.indexOf(requiredPlan);

      if (userPlanIndex < requiredPlanIndex) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PLAN',
            message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior`,
            details: {
              current_plan: req.tenant.plan,
              required_plan: requiredPlan
            }
          }
        });
      }

      next();
    };
  };

  /**
   * Middleware para forçar uso do schema do tenant
   */
  useTenantSchema = (req, res, next) => {
    if (req.tenant && req.tenant.schema) {
      // Configurar search_path para usar apenas o schema do tenant
      req.dbSchema = req.tenant.schema;
    }
    next();
  };

  /**
   * Middleware para auditoria automática
   */
  auditRequest = (action) => {
    return async (req, res, next) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = function(data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log de auditoria assíncrono (não bloqueia resposta)
        setImmediate(async () => {
          try {
            if (req.tenant && req.user) {
              await pool.query(`
                INSERT INTO audit_logs (
                  id_tenant, id_usuario, acao, dados_novos,
                  ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6)
              `, [
                req.tenant.id,
                req.user.id,
                action,
                JSON.stringify({
                  method: req.method,
                  url: req.originalUrl,
                  status_code: statusCode,
                  duration_ms: duration,
                  user_agent: req.get('User-Agent'),
                  timestamp: new Date().toISOString()
                }),
                req.ip,
                req.get('User-Agent')
              ]);
            }
          } catch (error) {
            console.error('Erro ao salvar log de auditoria:', error);
          }
        });

        // Chamar método original
        originalSend.call(this, data);
      };

      next();
    };
  };

  /**
   * Middleware para rate limiting por tenant
   */
  tenantRateLimit = (options = {}) => {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutos
      max = 100, // máximo de requests
      message = 'Muitas requisições. Tente novamente em alguns minutos.'
    } = options;

    const windowSeconds = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
      try {
        // Verificar se está em desenvolvimento
        const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
        if (isDevelopment) {
          logger.debug(`[DEV] Rate limiting desabilitado para ${req.originalUrl}`);
          return next();
        }

        if (!req.tenant) {
          return next();
        }

        const tenantId = req.tenant.id;
        const routeKey = (req.baseUrl || req.originalUrl || '').split('?')[0];
        const key = `ratelimit:${tenantId}:${req.ip}:${routeKey}`;

        // Incrementa contador no cache (Redis se disponível, senão memória)
        const count = await this.cache.increment(key, windowSeconds);

        if (count > max) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'TENANT_RATE_LIMIT_EXCEEDED',
              message,
              details: { limit: max, window_ms: windowMs }
            },
            timestamp: new Date().toISOString()
          });
        }

        return next();
      } catch (error) {
        console.warn('RateLimit error:', error.message);
        // Em caso de erro no rate limit, não bloquear fluxo
        return next();
      }
    };
  };

  /**
   * Middleware para configurar headers de segurança
   */
  securityHeaders = (req, res, next) => {
    // Headers de segurança
    res.setHeader('X-Tenant-ID', req.tenant?.id || 'unknown');
    res.setHeader('X-Plan', req.tenant?.plan || 'unknown');
    res.setHeader('X-API-Version', '2.0');

    // Headers de cache control
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutos
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    next();
  };

  /**
   * Middleware para validar integridade dos dados do tenant
   */
  validateTenantIntegrity = async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next();
      }

      const { id, schema } = req.tenant;

      // Para SQLite, não precisamos validar schemas da mesma forma
      // Apenas verificar se as tabelas do tenant existem
      // Usar prepared statement para evitar SQL injection
      const tableCheck = await pool.query(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE ?
        LIMIT 1
      `, [`${schema}_%`]);

      if (tableCheck.rows.length === 0) {
        console.log(`Tabelas do tenant ${id} não encontradas, podem ser criadas sob demanda`);
      }

      next();

    } catch (error) {
      console.error('Erro ao validar integridade do tenant:', error);
      // Não bloquear a requisição por erro de validação
      next();
    }
  };
}

// Instância singleton
const tenantMiddleware = new TenantMiddleware();

// Exportar middlewares individuais
module.exports = {
  isolateTenant: tenantMiddleware.isolateTenant,
  checkLimits: tenantMiddleware.checkLimits,
  requirePermission: tenantMiddleware.requirePermission,
  requirePlan: tenantMiddleware.requirePlan,
  useTenantSchema: tenantMiddleware.useTenantSchema,
  auditRequest: tenantMiddleware.auditRequest,
  tenantRateLimit: tenantMiddleware.tenantRateLimit,
  securityHeaders: tenantMiddleware.securityHeaders,
  validateTenantIntegrity: tenantMiddleware.validateTenantIntegrity,

  // Instância completa para uso avançado
  TenantMiddleware: tenantMiddleware
};