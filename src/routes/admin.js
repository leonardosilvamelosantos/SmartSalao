/**
 * Rotas do Painel Administrativo - Self-Delivered Dashboard
 * Interface completa para controle do sistema
 */
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const AuthService = require('../services/AuthService');
const CacheService = require('../services/CacheService');

/**
 * Determina se um usuário pode criar tenant baseado no seu nível de admin
 * @param {Object} user - Usuário logado
 * @param {string} adminLevel - Nível de admin do novo usuário
 * @param {string} tipo - Tipo do usuário (admin/barbeiro)
 * @returns {boolean} - Se pode criar tenant
 */
function canUserCreateTenant(user, adminLevel, tipo) {
  // System admin (você) sempre pode criar tenant para qualquer usuário
  if (user.role === 'system_admin') {
    return true;
  }

  // Se for admin, verificar nível de admin
  if (tipo === 'admin') {
    // Apenas admins de empresa (escolhidos a dedo) podem criar tenant
    if (adminLevel === 'empresa') {
      return true;
    }
    // Outros admins (admin_level 'local' ou não especificado) não podem criar tenant
    return false;
  }

  // Para usuários barbeiro, apenas system_admin pode criar tenant
  // (isso mantém o controle restritivo)
  return false;
}

// ====================
// RATE LIMITING PARA ADMIN
// ====================

// Rate limiting para admin - Desabilitado em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
const adminRateLimit = isDevelopment ? 
  (req, res, next) => next() : // Middleware vazio em desenvolvimento
  rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 requisições por minuto para admin
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas requisições administrativas. Aguarde um momento.'
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false
  });

// ====================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// ====================

// Middleware para verificar se usuário é admin ou dono do recurso
const requireAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' }
    });
  }

  // Se for admin ou dono do recurso (barberId), permitir
  if (req.user.role === 'admin' || req.user.tipo === 'admin' || req.user.id == req.params.barberId || req.user.id_usuario == req.params.barberId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Acesso negado' }
  });
};

// Middleware: somente administradores do sistema
const requireSystemAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } });
  }
  
  // Debug: mostrar informações do usuário
  console.log('🔍 Usuário logado:', {
    id: req.user.id,
    role: req.user.role,
    tipo: req.user.tipo,
    permissions: req.user.permissions,
    email: req.user.email
  });
  
  // Verificar se é admin do sistema ou admin local
  if (req.user.role === 'system_admin' || 
      req.user.role === 'admin' || 
      req.user.tipo === 'admin' || 
      req.user.permissions?.system === true ||
      req.user.permissions?.admin === true) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: { 
      code: 'FORBIDDEN', 
      message: 'Apenas administradores do sistema. Role atual: ' + req.user.role + ', Tipo: ' + req.user.tipo 
    } 
  });
};

// Utilitário: registrar auditoria
async function logAudit(req, { acao, entidade, id_entidade, dados = {}, status = 'success' }) {
  try {
    const idTenant = req.user?.tenant_id || null;
    const idAdmin = req.user?.id || null;
    // Gravar auditoria apenas se tabela existir
    try {
      const chk = await pool.query("SELECT to_regclass('public.audit_logs') as exists");
      if (chk.rows?.[0]?.exists) {
        await pool.query(
          `INSERT INTO audit_logs (id_tenant, id_usuario_admin, acao, entidade, id_entidade, dados, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [idTenant, idAdmin, acao, entidade || null, id_entidade || null, JSON.stringify(dados), status]
        );
      }
    } catch (e) {
      // Ignorar se tabela não existir
    }
  } catch (e) {
    console.error('Erro ao registrar auditoria:', e.message);
  }
}

// ====================
// GESTÃO DE TENANTS E USUÁRIOS
// ====================

/**
 * GET /api/admin/tenants-with-users
 * Listar todos os tenants com seus usuários vinculados
 */
router.get('/tenants-with-users', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    
    // Buscar todos os tenants
    const tenantsQuery = `
      SELECT 
        t.id_tenant,
        t.nome as tenant_nome,
        t.email as tenant_email,
        t.telefone as tenant_telefone,
        t.plano,
        t.status as tenant_status,
        t.data_criacao as tenant_created_at,
        COUNT(u.id_usuario) as total_usuarios,
        COUNT(CASE WHEN u.ativo = true THEN 1 END) as usuarios_ativos,
        COUNT(CASE WHEN u.tipo = 'admin' THEN 1 END) as admins_count,
        COUNT(CASE WHEN u.tipo = 'barbeiro' THEN 1 END) as barbeiros_count
      FROM tenants t
      LEFT JOIN usuarios u ON t.id_tenant = u.id_tenant
      WHERE 1=1
      ${search ? 'AND (t.nome ILIKE $1 OR t.email ILIKE $1)' : ''}
      GROUP BY t.id_tenant, t.nome, t.email, t.telefone, t.plano, t.status, t.data_criacao
      ORDER BY t.data_criacao DESC
      LIMIT $${search ? '2' : '1'} OFFSET $${search ? '3' : '2'}
    `;
    
    const params = search ? [`%${search}%`, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)] : [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)];
    const tenantsResult = await pool.query(tenantsQuery, params);
    
    // Para cada tenant, buscar seus usuários
    const tenantsWithUsers = await Promise.all(
      tenantsResult.rows.map(async (tenant) => {
        const usersQuery = `
          SELECT 
            id_usuario,
            nome,
            email,
            whatsapp,
            tipo,
            ativo,
            created_at
          FROM usuarios 
          WHERE id_tenant = $1
          ORDER BY created_at DESC
        `;
        
        const usersResult = await pool.query(usersQuery, [tenant.id_tenant]);
        
        return {
          ...tenant,
          usuarios: usersResult.rows
        };
      })
    );
    
    // Contar total de tenants para paginação
    const countQuery = `
      SELECT COUNT(DISTINCT t.id_tenant) as total
      FROM tenants t
      WHERE 1=1
      ${search ? 'AND (t.nome ILIKE $1 OR t.email ILIKE $1)' : ''}
    `;
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total || 0);
    
    await logAudit(req, { 
      acao: 'ADMIN_LIST_TENANTS_WITH_USERS', 
      entidade: 'tenants', 
      dados: { search, page: parseInt(page), limit: parseInt(limit) } 
    });
    
    return res.json({ 
      success: true, 
      data: tenantsWithUsers, 
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total 
      } 
    });
    
  } catch (error) {
    console.error('Erro ao listar tenants com usuários:', error);
    await logAudit(req, { 
      acao: 'ADMIN_LIST_TENANTS_WITH_USERS', 
      entidade: 'tenants', 
      dados: { error: error.message }, 
      status: 'error' 
    });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// DASHBOARD PRINCIPAL
// ====================

/**
 * GET /admin/:barberId/dashboard
 * Dashboard principal com métricas e estatísticas
 */
router.get('/:barberId/dashboard',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.getDashboard
);

/**
 * GET /admin/:barberId/dashboard/metrics
 * Métricas detalhadas do dashboard
 */
router.get('/:barberId/dashboard/metrics',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    const controller = require('../controllers/AdminController');
    try {
      const metrics = await controller.getDashboardMetrics(req.params.barberId);
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ====================
// GESTÃO DE SERVIÇOS
// ====================

/**
 * GET /admin/:barberId/services
 * Listar serviços com controles administrativos
 */
router.get('/:barberId/services',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.getServicesAdmin
);

/**
 * POST /admin/:barberId/services
 * Criar novo serviço
 */
router.post('/:barberId/services',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.createService
);
// ====================
// GESTÃO DE USUÁRIOS (ADMIN)
// ====================

/**
 * POST /api/admin/users
 * Criar novo usuário barbeiro (admin)
 */
router.post('/users', authenticateToken, async (req, res) => {
  try {
    if (!req.user || ((req.user.role !== 'system_admin' && req.user.role !== 'admin') && !req.user.permissions?.admin)) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const { nome, email, senha, tipo, whatsapp, telefone, id_tenant, create_tenant, admin_level } = req.body || {};
    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }

    const exists = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    if (exists.rows && exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    }

    const senha_hash = await bcrypt.hash(senha, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const phone = whatsapp || telefone || null;

    // Estratégia de tenant
    // Regra: se não vier id_tenant e create_tenant=false, NÃO usar tenant do usuário logado
    // para evitar violar FK. Vamos definir depois (tenant = id_usuario).
    let tenantId = id_tenant || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Criar usuário inicialmente com tenant provisório (null) para evitar FK
      const userInsert = await client.query(
        'INSERT INTO usuarios (id_tenant, nome, email, whatsapp, senha_hash, tipo, ativo, timezone) VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id_usuario',
        [null, nome, email, phone, senha_hash, (tipo === 'admin' ? 'admin' : 'barbeiro'), 'America/Sao_Paulo']
      );
      const newUserId = userInsert.rows[0].id_usuario;

      // Se create_tenant=true e permitido, cria tenant novo via serviço existente
      const canCreateTenant = canUserCreateTenant(req.user, admin_level, tipo);
      if (create_tenant && canCreateTenant && !id_tenant) {
        try {
          const TenantProvisioningService = require('../services/TenantProvisioningService');
          const provisioningService = new TenantProvisioningService();
          const tenantResult = await provisioningService.provisionTenant({
            name: nome,
            email: email,
            phone: phone || '+5511999999999',
            plan: 'basico'
          });
          tenantId = tenantResult.tenant.id_tenant;
        } catch (tenantError) {
          console.error('Erro ao criar tenant automaticamente:', tenantError);
          tenantId = 1;
        }
      } else if (!id_tenant) {
        // Regra solicitada: cada novo usuário tem um tenant com mesmo ID do usuário
        // Criar tenant com id_tenant = newUserId
        await client.query(
          `INSERT INTO tenants (id_tenant, nome_tenant, nome, email, dominio, status, config_tenant, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'ativo', '{}'::jsonb, NOW(), NOW())
           ON CONFLICT (id_tenant) DO NOTHING`,
          [newUserId, nome, nome, email, null]
        );
        tenantId = newUserId;
      }

      // Atualizar usuário com tenant definitivo = tenantId
      await client.query(
        'UPDATE usuarios SET id_tenant = $1 WHERE id_usuario = $2',
        [tenantId, newUserId]
      );

      // Garantir preenchimento de nome/email do tenant criado/definido
      await client.query(
        `UPDATE tenants SET 
           nome = COALESCE(nome, $2), 
           nome_tenant = COALESCE(nome_tenant, $2), 
           email = COALESCE(email, $3)
         WHERE id_tenant = $1`,
        [tenantId, nome, email]
      );

      await client.query('COMMIT');

      const sel = await pool.query('SELECT id_usuario, id_tenant, nome, email, whatsapp, tipo, ativo, created_at FROM usuarios WHERE id_usuario = $1', [newUserId]);
      await logAudit(req, { acao: 'ADMIN_CREATE_USER', entidade: 'usuarios', id_entidade: sel.rows?.[0]?.id_usuario, dados: { email, id_tenant: tenantId, tenant_created: create_tenant || (!id_tenant && tenantId === newUserId) } });
      return res.status(201).json({ success: true, data: sel.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar usuário admin:', e);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// ADMIN USERS - LISTAR
// ====================
router.get('/users', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { search = '', tenant, page = 1, limit = 20, status, role } = req.query;
    const params = [];
    let where = '1=1';

    if (tenant) { where += ' AND id_tenant = $' + (params.length + 1); params.push(parseInt(tenant)); }
    if (status !== undefined) { where += ' AND ativo = $' + (params.length + 1); params.push(status ? true : false); }
    if (role) { where += ' AND tipo = $' + (params.length + 1); params.push(role); }
    if (search) {
      where += ' AND (nome ILIKE $' + (params.length + 1) + ' OR email ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countSql = `SELECT COUNT(*) as total FROM usuarios WHERE ${where}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows?.[0]?.total || 0);

    const rowsSql = `SELECT id_usuario, id_tenant, nome, email, tipo, ativo, created_at
                     FROM usuarios WHERE ${where}
                     ORDER BY created_at DESC
                     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const pageNum = parseInt(page); const lim = parseInt(limit);
    const rowsRes = await pool.query(rowsSql, [...params, lim, (pageNum - 1) * lim]);

    await logAudit(req, { acao: 'ADMIN_LIST_USERS', entidade: 'usuarios', dados: { search, tenant, page: pageNum, limit: lim } });

    return res.json({ success: true, data: rowsRes.rows, pagination: { page: pageNum, limit: lim, total } });
  } catch (e) {
    console.error('Erro ao listar usuários:', e);
    await logAudit(req, { acao: 'ADMIN_LIST_USERS', entidade: 'usuarios', dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// ADMIN USERS - PATCH
// ====================
router.patch('/users/:id', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, ativo } = req.body || {};
    // Montar SET dinâmico
    const sets = []; const params = [];
    if (nome !== undefined) { sets.push('nome = $' + (params.length + 1)); params.push(nome); }
    if (tipo !== undefined) { sets.push('tipo = $' + (params.length + 1)); params.push(tipo); }
    if (ativo !== undefined) { sets.push('ativo = $' + (params.length + 1)); params.push(ativo); }
    sets.push("updated_at = NOW()");
    if (sets.length === 1) { // apenas updated_at
      return res.status(400).json({ success: false, message: 'Nenhuma alteração informada' });
    }
    params.push(id);
    const sql = `UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = $${params.length}`;
    const upd = await pool.query(sql, params);
    if (upd.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    const sel = await pool.query('SELECT id_usuario, id_tenant, nome, email, tipo, ativo, created_at, updated_at FROM usuarios WHERE id_usuario = $1', [id]);
    await logAudit(req, { acao: 'ADMIN_PATCH_USER', entidade: 'usuarios', id_entidade: parseInt(id), dados: { nome, tipo, ativo } });
    return res.json({ success: true, data: sel.rows?.[0] });
  } catch (e) {
    console.error('Erro ao atualizar usuário:', e);
    await logAudit(req, { acao: 'ADMIN_PATCH_USER', entidade: 'usuarios', id_entidade: parseInt(req.params.id), dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// ADMIN USERS - DELETE
// ====================
router.delete('/users/:id', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    // Verificar vínculos
    const s = await pool.query('SELECT COUNT(*) as c FROM servicos WHERE id_usuario = $1', [id]);
    const a = await pool.query('SELECT COUNT(*) as c FROM agendamentos WHERE id_usuario = $1', [id]);
    if (parseInt(s.rows?.[0]?.c || 0) > 0 || parseInt(a.rows?.[0]?.c || 0) > 0) {
      return res.status(400).json({ success: false, message: 'Usuário possui vínculos (serviços/agendamentos) e não pode ser excluído' });
    }
    const del = await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    await logAudit(req, { acao: 'ADMIN_DELETE_USER', entidade: 'usuarios', id_entidade: parseInt(id) });
    return res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (e) {
    console.error('Erro ao excluir usuário:', e);
    await logAudit(req, { acao: 'ADMIN_DELETE_USER', entidade: 'usuarios', id_entidade: parseInt(req.params.id), dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// ADMIN USERS - RESET PASSWORD
// ====================
router.post('/users/:id/reset-password', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Nova senha é obrigatória e deve ter 8+ caracteres' });
    }
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const senha_hash = await bcrypt.hash(newPassword, rounds);
    const upd = await pool.query("UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id_usuario = $2", [senha_hash, id]);
    if (upd.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    await logAudit(req, { acao: 'ADMIN_RESET_PASSWORD', entidade: 'usuarios', id_entidade: parseInt(id) });
    return res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (e) {
    console.error('Erro ao resetar senha:', e);
    await logAudit(req, { acao: 'ADMIN_RESET_PASSWORD', entidade: 'usuarios', id_entidade: parseInt(req.params.id), dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// IMPERSONATE - TOKEN CURTO
// ====================
router.post('/impersonate/:id', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const userRes = await pool.query('SELECT id_usuario, id_tenant, nome, email, tipo, ativo FROM usuarios WHERE id_usuario = $1', [id]);
    if (!userRes.rows || userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    const u = userRes.rows[0];
    const auth = new AuthService();
    const payload = {
      userId: u.id_usuario,
      tenantId: u.id_tenant || 1,
      email: u.email,
      role: u.tipo === 'admin' ? 'system_admin' : 'barbeiro',
      schema: null,
      plan: 'basico',
      type: 'impersonate',
      impersonatedBy: req.user.id
    };
    const token = jwt.sign(payload, auth.JWT_SECRET, { expiresIn: '5m', issuer: 'agendamento-platform', audience: 'tenant-users' });
    await logAudit(req, { acao: 'ADMIN_IMPERSONATE', entidade: 'usuarios', id_entidade: u.id_usuario });
    return res.json({ success: true, data: { token, expires_in: 300 } });
  } catch (e) {
    console.error('Erro em impersonate:', e);
    await logAudit(req, { acao: 'ADMIN_IMPERSONATE', entidade: 'usuarios', id_entidade: parseInt(req.params.id), dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// CACHE - CLEAR POR PADRÃO/CHAVE
// ====================
router.post('/cache/clear', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { pattern } = req.body || {};
    const cache = new CacheService();
    await cache.invalidatePattern(pattern || '*');
    await logAudit(req, { acao: 'ADMIN_CACHE_CLEAR', entidade: 'cache', dados: { pattern: pattern || '*' } });
    return res.json({ success: true, message: 'Cache invalidado' });
  } catch (e) {
    console.error('Erro ao limpar cache:', e);
    await logAudit(req, { acao: 'ADMIN_CACHE_CLEAR', entidade: 'cache', dados: { error: e.message }, status: 'error' });
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// ====================
// AUDIT LOGS - LISTAR
// ====================
router.get('/audit-logs', authenticateToken, requireSystemAdminOnly, adminRateLimit, async (req, res) => {
  try {
    const { search = '', action, tenant, user, page = 1, limit = 50, since, until } = req.query;
    const params = [];
    let where = '1=1';
    if (tenant) { where += ' AND id_tenant = $' + (params.length + 1); params.push(parseInt(tenant)); }
    if (user) { where += ' AND id_usuario_admin = $' + (params.length + 1); params.push(parseInt(user)); }
    if (action) { where += ' AND acao = $' + (params.length + 1); params.push(action); }
    if (since) { where += ' AND created_at >= $' + (params.length + 1); params.push(since); }
    if (until) { where += ' AND created_at <= $' + (params.length + 1); params.push(until); }
    if (search) { where += ' AND (dados ILIKE $' + (params.length + 1) + ' OR entidade ILIKE $' + (params.length + 2) + ')'; params.push(`%${search}%`, `%${search}%`); }

    const countSql = `SELECT COUNT(*) as total FROM audit_logs WHERE ${where}`;
    const c = await pool.query(countSql, params);
    const total = parseInt(c.rows?.[0]?.total || 0);

    const pageNum = parseInt(page); const lim = parseInt(limit);
    const rowsSql = `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const r = await pool.query(rowsSql, [...params, lim, (pageNum - 1) * lim]);
    return res.json({ success: true, data: r.rows, pagination: { page: pageNum, limit: lim, total } });
  } catch (e) {
    console.error('Erro ao listar audit logs:', e);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PUT /admin/:barberId/services/:serviceId
 * Atualizar serviço existente
 */
router.put('/:barberId/services/:serviceId',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.updateService
);

/**
 * DELETE /admin/:barberId/services/:serviceId
 * Desativar serviço (soft delete)
 */
router.delete('/:barberId/services/:serviceId',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const { barberId, serviceId } = req.params;

      const query = `
        UPDATE servicos
        SET ativo = false, updated_at = NOW()
        WHERE id_usuario = $1 AND id_servico = $2
        RETURNING *
      `;

      const result = await pool.query(query, [barberId, serviceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Serviço não encontrado' }
        });
      }

      // Limpar cache
      const CacheService = require('../services/CacheService');
      const cache = new CacheService();
      await cache.invalidatePattern(`services:${barberId}:*`);

      res.json({
        success: true,
        message: 'Serviço desativado com sucesso',
        data: { service: result.rows[0] }
      });
    } catch (error) {
      console.error('Erro ao desativar serviço:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);

// ====================
// GESTÃO DE AGENDAMENTOS
// ====================

/**
 * GET /admin/:barberId/appointments
 * Listar agendamentos com filtros avançados
 */
router.get('/:barberId/appointments',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.getAppointmentsAdmin
);

/**
 * GET /admin/:barberId/appointments/:appointmentId
 * Detalhes de um agendamento específico
 */
router.get('/:barberId/appointments/:appointmentId',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const { barberId, appointmentId } = req.params;

      const query = `
        SELECT
          a.*,
          s.nome_servico,
          s.duracao_min,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE a.id_usuario = $1 AND a.id_agendamento = $2
      `;

      const result = await pool.query(query, [barberId, appointmentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agendamento não encontrado' }
        });
      }

      res.json({
        success: true,
        data: { appointment: result.rows[0] }
      });
    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);

/**
 * PUT /admin/:barberId/appointments/:appointmentId
 * Atualizar agendamento
 */
router.put('/:barberId/appointments/:appointmentId',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const { barberId, appointmentId } = req.params;
      const { status, notes } = req.body;

      const query = `
        UPDATE agendamentos
        SET status = $1, observacoes = $2, updated_at = NOW()
        WHERE id_usuario = $3 AND id_agendamento = $4
        RETURNING *
      `;

      const result = await pool.query(query, [
        status, notes, barberId, appointmentId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agendamento não encontrado' }
        });
      }

      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: { appointment: result.rows[0] }
      });
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);

/**
 * POST /admin/:barberId/appointments/:appointmentId/cancel
 * Cancelar agendamento (admin)
 */
router.post('/:barberId/appointments/:appointmentId/cancel',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.cancelAppointmentAdmin
);

// ====================
// GESTÃO DE CLIENTES
// ====================

/**
 * GET /admin/:barberId/clients
 * Listar clientes do barbeiro
 */
router.get('/:barberId/clients',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const barberId = req.params.barberId;
      const { page = 1, limit = 20, search } = req.query;

      let whereClause = 'c.id_usuario = $1';
      let params = [barberId];
      let paramIndex = 2;

      if (search) {
        whereClause += ` AND (c.nome ILIKE $${paramIndex} OR c.whatsapp ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const query = `
        SELECT
          c.*,
          COUNT(a.id_agendamento) as total_appointments,
          COUNT(a.id_agendamento) FILTER (WHERE a.status = 'completed') as completed_appointments,
          MAX(a.data_agendamento) as last_appointment,
          COALESCE(SUM(a.valor_total) FILTER (WHERE a.status = 'completed'), 0) as total_spent
        FROM clientes c
        LEFT JOIN agendamentos a ON c.id_cliente = a.id_cliente
        WHERE ${whereClause}
        GROUP BY c.id_cliente
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          clients: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.rows.length
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);

// ====================
// CONFIGURAÇÕES DO SISTEMA
// ====================

/**
 * GET /admin/:barberId/settings
 * Buscar configurações do barbeiro
 */
router.get('/:barberId/settings',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.getBarberSettings
);

/**
 * PUT /admin/:barberId/settings
 * Atualizar configurações do barbeiro
 */
router.put('/:barberId/settings',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.updateBarberSettings
);

// ====================
// RELATÓRIOS E ESTATÍSTICAS
// ====================

/**
 * GET /admin/:barberId/reports/financial
 * Relatório financeiro
 */
router.get('/:barberId/reports/financial',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  AdminController.getFinancialReport
);

/**
 * GET /admin/:barberId/reports/appointments
 * Relatório de agendamentos
 */
router.get('/:barberId/reports/appointments',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const barberId = req.params.barberId;
      const { start_date, end_date, group_by = 'day' } = req.query;

      const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const query = `
        SELECT
          DATE_TRUNC($4, a.data_agendamento) as period,
          COUNT(*) as total_appointments,
          COUNT(*) FILTER (WHERE a.status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
          COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled,
          COALESCE(SUM(a.valor_total) FILTER (WHERE a.status = 'completed'), 0) as revenue
        FROM agendamentos a
        WHERE a.id_usuario = $1
          AND DATE(a.data_agendamento) BETWEEN $2 AND $3
        GROUP BY DATE_TRUNC($4, a.data_agendamento)
        ORDER BY period ASC
      `;

      const result = await pool.query(query, [
        barberId, startDate, endDate, group_by
      ]);

      res.json({
        success: true,
        data: {
          report: result.rows,
          period: { start_date: startDate, end_date: endDate },
          group_by
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de agendamentos:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);

// ====================
// STATUS DO SISTEMA
// ====================

/**
 * GET /admin/:barberId/system/status
 * Status completo do sistema
 */
router.get('/:barberId/system/status',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    const controller = require('../controllers/AdminController');
    try {
      const status = await controller.getSystemStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /admin/:barberId/system/cache/clear
 * Limpar cache do sistema
 */
router.post('/:barberId/system/cache/clear',
  authenticateToken,
  requireAdminOrOwner,
  adminRateLimit,
  async (req, res) => {
    try {
      const CacheService = require('../services/CacheService');
      const cache = new CacheService();
      await cache.clear();

      res.json({
        success: true,
        message: 'Cache limpo com sucesso'
      });
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
      });
    }
  }
);


// ====================
// PÁGINA HTML DO DASHBOARD
// ====================

/**
 * GET /admin/:barberId
 * Página HTML do painel administrativo
 */
router.get('/:barberId',
  authenticateToken,
  requireAdminOrOwner,
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
  }
);

/**
 * GET /admin/:barberId/*
 * Catch-all para páginas do admin
 */
// Rota catch-all comentada temporariamente devido a erro de sintaxe
// router.get('/:barberId/*',
//   authenticateToken,
//   requireAdminOrOwner,
//   (req, res) => {
//     const filePath = req.params[0] || 'index.html';
//     const fullPath = path.join(__dirname, '../../public/admin', filePath);
//
//     // Verificar se arquivo existe
//     if (require('fs').existsSync(fullPath)) {
//       res.sendFile(fullPath);
//     } else {
//       res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
//     }
//   }
// );

module.exports = router;
