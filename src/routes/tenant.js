/**
 * Rotas de Gerenciamento Multi-Tenant
 * Endpoints para provisionamento e gestão de tenants
 */
const express = require('express');
const router = express.Router();
const TenantProvisioningService = require('../services/TenantProvisioningService');
// (removido) TenantTestService em produção/limpeza
const AuthService = require('../services/AuthService');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { authenticateToken } = require('../middleware/auth');

// ====================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// ====================

// Middleware para verificar se é admin do sistema
const requireSystemAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' }
    });
  }

  // Exigir admin do sistema
  if (req.user.role !== 'system_admin' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Acesso negado. Apenas administradores do sistema.' }
    });
  }

  next();
};

// ====================
// PROVISIONAMENTO DE TENANTS
// ====================

/**
 * POST /api/tenants
 * Provisionar novo tenant
 */
router.post('/',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const provisioningService = new TenantProvisioningService();
      const tenantData = req.body;

      // Validações básicas
      if (!tenantData.name || !tenantData.email || !tenantData.phone) {
        return ApiError.badRequest('Nome, email e telefone são obrigatórios').send(res);
      }

      console.log(`🚀 Provisionando tenant: ${tenantData.name}`);

      const result = await provisioningService.provisionTenant(tenantData);

      console.log(`✅ Tenant ${result.tenant.id_tenant} provisionado com sucesso`);

      return ApiResponse.created(result, 'Tenant provisionado com sucesso')
        .send(res);

    } catch (error) {
      console.error('Erro no provisionamento:', error);

      if (error.code === 'DUPLICATE_EMAIL') {
        return ApiError.conflict('Email já cadastrado').send(res);
      }

      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

// (removido) POST /api/tenants/test - criar tenant de teste

// (removido) POST /api/tenants/bulk-test - criar múltiplos tenants de teste

// ====================
// ESTATÍSTICAS E MONITORAMENTO
// ====================

/**
 * GET /api/tenants/stats
 * Estatísticas gerais da plataforma
 */
router.get('/stats',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const provisioningService = new TenantProvisioningService();
      const stats = await provisioningService.getPlatformStats();

      return ApiResponse.success(stats, 'Estatísticas da plataforma').send(res);

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

// ====================
// GESTÃO DE TENANTS
// ====================

/**
 * GET /api/tenants
 * Listar tenants
 */
router.get('/',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const provisioningService = new TenantProvisioningService();
      const {
        status,
        plan,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const tenants = await provisioningService.listTenants({
        status,
        plan,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return ApiResponse.success({
        tenants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tenants.length
        }
      }).send(res);

    } catch (error) {
      console.error('Erro ao listar tenants:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/tenants/:tenantId
 * Detalhes de um tenant específico
 */
router.get('/:tenantId',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const provisioningService = new TenantProvisioningService();

      // Buscar tenant
      const tenants = await provisioningService.listTenants({});

      const tenant = tenants.find(t => t.id_tenant == tenantId);

      if (!tenant) {
        return ApiError.notFound('Tenant não encontrado').send(res);
      }

      return ApiResponse.success({ tenant }).send(res);

    } catch (error) {
      console.error('Erro ao buscar tenant:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * PUT /api/tenants/:tenantId
 * Atualizar tenant
 */
router.put('/:tenantId',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { name, email, phone, status, plan } = req.body;
      const provisioningService = new TenantProvisioningService();

      // TODO: Implementar atualização de tenant
      // Por enquanto, apenas atualiza o plano se fornecido
      if (plan) {
        await provisioningService.updateTenantPlan(tenantId, plan);
      }

      return ApiResponse.success({
        tenant_id: tenantId,
        updated_fields: { plan }
      }, 'Tenant atualizado com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao atualizar tenant:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * DELETE /api/tenants/:tenantId
 * Desprovisionar tenant
 */
router.delete('/:tenantId',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const provisioningService = new TenantProvisioningService();

      console.log(`🗑️ Desprovisionando tenant ${tenantId}...`);

      await provisioningService.deprovisionTenant(tenantId);

      console.log(`✅ Tenant ${tenantId} desprovisionado com sucesso`);

      return ApiResponse.success({
        tenant_id: tenantId,
        status: 'deprovisioned'
      }, 'Tenant desprovisionado com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao desprovisionar tenant:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

// ====================
// AUTENTICAÇÃO MULTI-TENANT
// ====================

/**
 * POST /api/tenants/auth/login
 * Login multi-tenant
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiError.badRequest('Email e senha são obrigatórios').send(res);
    }

    const authService = new AuthService();
    const result = await authService.authenticate(email, password);

    return ApiResponse.success(result, 'Login realizado com sucesso').send(res);

  } catch (error) {
    console.error('Erro no login:', error);

    if (error.message.includes('não encontrado') || error.message.includes('inválidas')) {
      return ApiError.badRequest('Credenciais inválidas').send(res);
    }

    return ApiError.internal('Erro interno do servidor').send(res);
  }
});

/**
 * POST /api/tenants/auth/verify
 * Verificar token JWT
 */
router.post('/auth/verify',
  authenticateToken,
  async (req, res) => {
    try {
      // O middleware já verificou o token
      return ApiResponse.success({
        user: req.user,
        tenant: req.tenant
      }, 'Token válido').send(res);

    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * POST /api/tenants/auth/logout
 * Logout (invalidação do token)
 */
router.post('/auth/logout',
  authenticateToken,
  async (req, res) => {
    try {
      // Em uma implementação real, você poderia adicionar o token a uma blacklist
      // Por enquanto, apenas confirma o logout
      return ApiResponse.success({
        message: 'Logout realizado com sucesso'
      }).send(res);

    } catch (error) {
      console.error('Erro no logout:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

/**
 * GET /api/tenants/:tenantId/usage
 * Estatísticas de uso de um tenant
 */
router.get('/:tenantId/usage',
  authenticateToken,
  requireSystemAdmin,
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const pool = require('../config/database');

      const usageQuery = `
        SELECT
          periodo,
          tipo,
          quantidade,
          limite
        FROM tenant_usage
        WHERE id_tenant = $1
          AND periodo >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY periodo DESC, tipo ASC
      `;

      const result = await pool.query(usageQuery, [tenantId]);

      // Agrupar por período
      const usageByPeriod = {};
      result.rows.forEach(row => {
        const period = row.periodo.toISOString().split('T')[0];
        if (!usageByPeriod[period]) {
          usageByPeriod[period] = {};
        }
        usageByPeriod[period][row.tipo] = {
          used: parseInt(row.quantidade),
          limit: parseInt(row.limite)
        };
      });

      return ApiResponse.success({
        tenant_id: tenantId,
        usage: usageByPeriod
      }, 'Dados de uso do tenant').send(res);

    } catch (error) {
      console.error('Erro ao buscar uso do tenant:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
);

// (removidas) ferramentas de teste

// (removido) POST /api/tenants/test/cleanup

// (removido) GET /api/tenants/test/report

// (removido) POST /api/tenants/test/load

// ====================
// BACKUP E RESTORE
// ====================

// (removido) POST /api/tenants/:tenantId/backup

// (removido) POST /api/tenants/restore

module.exports = router;
