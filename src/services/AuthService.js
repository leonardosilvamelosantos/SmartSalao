/**
 * Serviço de Autenticação Multi-Tenant
 * Controle de acesso baseado em planos e limites
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const pool = db.pool || db;
const isSQLite = !!db.isSQLite;
const { CONFIG, ERROR_CODES } = require('../constants');

class AuthService {
  constructor() {
    // Usar uma chave consistente para desenvolvimento
    this.JWT_SECRET = process.env.JWT_SECRET || 'agendamento-platform-secret-key-2025';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  /**
   * Autenticar usuário multi-tenant
   */
  async authenticate(email, password, tenantId = null) {
    try {
      // PostgreSQL: autenticar na tabela usuarios por email
      const userQuery = `
        SELECT id_usuario, nome, email, senha_hash, tipo, ativo, id_tenant
        FROM usuarios
        WHERE email = $1 AND ativo = true
        LIMIT 1
      `;

      const result = await pool.query(userQuery, [email]);

      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado ou inativo');
      }

      const user = result.rows[0];

      // Verificar senha com bcrypt (senha_hash)
      const isValidPassword = user.senha_hash ? await bcrypt.compare(password, user.senha_hash) : false;
      if (!isValidPassword) {
        throw new Error('Credenciais inválidas');
      }

      // Atualizar último login
      await this.updateLastLogin(user.id_usuario);

      // Gerar token JWT
      const token = this.generateToken({
        id_usuario: user.id_usuario,
        id_tenant: user.id_tenant || 1,
        nome: user.nome,
        email: user.email,
        role: user.tipo === 'admin' ? 'system_admin' : 'barbeiro',
        plano: 'basico',
        schema_name: null
      });

      return {
        token,
        user: {
          id: user.id_usuario,
          tenant_id: user.id_tenant || 1,
          name: user.nome,
          email: user.email,
          role: user.tipo === 'admin' ? 'system_admin' : 'barbeiro',
          permissions: user.tipo === 'admin' ? { admin: true, system: true } : { admin: false, agendamentos: true, clientes: true, servicos: true },
          plan: 'basico',
          schema: null,
          limits: { agendamentos_mes: 1000, servicos: 100, usuarios: 10 },
          config: { timezone: 'America/Sao_Paulo' }
        }
      };

    } catch (error) {
      console.error('Erro na autenticação:', error);
      throw error;
    }
  }

  /**
   * Verificar token JWT
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);

      // Montar usuário a partir do token decodificado (dev/SQLite)
      const role = decoded.role || 'barbeiro';
      const isAdmin = role === 'system_admin' || role === 'admin';

      return {
        id: decoded.userId,
        tenant_id: decoded.tenantId || 1,
        name: decoded.name || 'Usuário',
        email: decoded.email || null,
        role,
        permissions: isAdmin ? { admin: true, system: true } : { admin: false, agendamentos: true, clientes: true, servicos: true },
        plan: decoded.plan || 'basico',
        schema: decoded.schema || null,
        limits: decoded.limits || { agendamentos_mes: 1000, servicos: 100, usuarios: 10 },
        config: { timezone: 'America/Sao_Paulo' },
        type: decoded.type
      };

    } catch (error) {
      console.error('Erro na verificação do token:', error);
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Verificar permissões do usuário
   */
  checkPermission(user, requiredPermission) {
    if (!user || !user.permissions) {
      return false;
    }

    // Admin tem acesso a tudo
    if (user.role === 'admin' || user.permissions.admin === true) {
      return true;
    }

    return user.permissions[requiredPermission] === true;
  }

  /**
   * Verificar limites do plano (simplificado para SQLite)
   */
  async checkPlanLimits(tenantId, resourceType, quantity = 1) {
    try {
      // Obter limites do tenant
      const limitsQuery = `SELECT plano, limites FROM tenants WHERE id_tenant = $1 LIMIT 1`;
      const limitsRes = await pool.query(limitsQuery, [tenantId]);

      if (!limitsRes.rows || limitsRes.rows.length === 0) return true; // sem registro, não bloqueia

      const limits = limitsRes.rows[0].limites ? JSON.parse(limitsRes.rows[0].limites) : {};
      const limit = limits[resourceType];
      if (limit === undefined || limit === null) return true; // sem limite definido

      // Contadores por tipo
      let currentCount = 0;
      if (resourceType === 'usuarios') {
        const r = await pool.query('SELECT COUNT(*) as c FROM usuarios WHERE id_tenant = $1', [tenantId]);
        currentCount = parseInt(r.rows[0].c || 0);
      } else if (resourceType === 'servicos') {
        const r = await pool.query('SELECT COUNT(*) as c FROM servicos s JOIN usuarios u ON s.id_usuario = u.id_usuario WHERE u.id_tenant = $1', [tenantId]);
        currentCount = parseInt(r.rows[0].c || 0);
      } else if (resourceType === 'agendamentos_mes') {
        const r = await pool.query("SELECT COUNT(*) as c FROM agendamentos a JOIN usuarios u ON a.id_usuario = u.id_usuario WHERE u.id_tenant = $1 AND DATE_TRUNC('month', a.start_at) = DATE_TRUNC('month', NOW())", [tenantId]);
        currentCount = parseInt(r.rows[0].c || 0);
      } else if (resourceType === 'api_requests_dia') {
        // Se tiver tabela de usage no futuro, contar a partir dela; por ora, não bloquear
        return true;
      }

      return (currentCount + quantity) <= limit;

    } catch (error) {
      console.warn('checkPlanLimits error:', error.message);
      return true; // fail-open em dev
    }
  }

  /**
   * Atualizar uso de recursos (simplificado para SQLite)
   */
  async updateResourceUsage(tenantId, resourceType, quantity = 1) {
    try {
      // Placeholder: em produção, gravar em tabela de usage. Em dev, não persiste.
      return true;
    } catch (_) {
      return true;
    }
  }

  /**
   * Registrar uso de API (simplificado para SQLite)
   */
  async logApiUsage(tenantId, endpoint, userId = null) {
    // Para desenvolvimento, apenas log no console
    // console.log(`🔐 API Access: ${endpoint} by user ${userId} in tenant ${tenantId}`); // Otimizado - log removido para reduzir spam
  }

  /**
   * Gerar token JWT
   */
  generateToken(user) {
    const payload = {
      userId: user.id_usuario,
      tenantId: user.id_tenant,
      email: user.email,
      role: user.role || user.cargo,
      schema: user.schema_name || null,
      plan: user.plano || 'basico',
      type: 'access'  // Tipo do token
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'agendamento-platform',
      audience: 'tenant-users'
    });
  }

  /**
   * Atualizar último login
   */
  async updateLastLogin(userId) {
    try {
      await pool.query(
        `UPDATE usuarios SET updated_at = NOW() WHERE id_usuario = $1`,
        [userId]
      );
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }
  }

  /**
   * Criar hash da senha
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verificar força da senha
   */
  validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obter informações do plano
   */
  getPlanDetails(planName) {
    const plans = {
      basico: {
        name: 'Básico',
        price: 29.90,
        limits: {
          agendamentos_mes: 100,
          servicos: 5,
          usuarios: 2,
          armazenamento_mb: 100,
          api_requests_dia: 1000
        },
        features: [
          'Até 100 agendamentos/mês',
          '5 serviços',
          '2 usuários',
          'WhatsApp integrado',
          'Dashboard básico',
          'Suporte por email'
        ]
      },
      profissional: {
        name: 'Profissional',
        price: 79.90,
        limits: {
          agendamentos_mes: 500,
          servicos: 20,
          usuarios: 5,
          armazenamento_mb: 500,
          api_requests_dia: 5000
        },
        features: [
          'Até 500 agendamentos/mês',
          '20 serviços',
          '5 usuários',
          'WhatsApp + SMS',
          'Dashboard avançado',
          'Relatórios detalhados',
          'API completa',
          'Suporte prioritário'
        ]
      },
      premium: {
        name: 'Premium',
        price: 149.90,
        limits: {
          agendamentos_mes: 2000,
          servicos: 100,
          usuarios: 20,
          armazenamento_mb: 2000,
          api_requests_dia: 20000
        },
        features: [
          'Até 2000 agendamentos/mês',
          '100 serviços',
          '20 usuários',
          'Integrações ilimitadas',
          'Analytics avançado',
          'Backup automático',
          'White-label',
          'Suporte 24/7'
        ]
      }
    };

    return plans[planName] || plans.basico;
  }

  /**
   * Verificar se plano permite recurso
   */
  planAllowsFeature(planName, feature) {
    const planDetails = this.getPlanDetails(planName);
    return planDetails.features.includes(feature);
  }
}

module.exports = AuthService;