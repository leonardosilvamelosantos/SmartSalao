const AuthService = require('../services/AuthService');
const SecurityAlertService = require('../services/SecurityAlertService');
const pool = require('../config/database');
const logger = require('../config/logging');

// Instanciar os serviços
const authService = new AuthService();
const securityAlert = new SecurityAlertService();

/**
 * Middleware de autenticação JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Log desabilitado para reduzir spam
    // if (req.url.includes('/auto-confirm')) {
    //   console.log(`🔧 Auth middleware - ${req.method} ${req.url}`);
    //   console.log(`🔧 Auth header:`, authHeader);
    //   console.log(`🔧 Token extraído:`, token ? token.substring(0, 50) + '...' : 'null');
    // }

    if (!token) {
      logger.warn(`Token não fornecido para ${req.method} ${req.url}`);
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
    }

    // Verificar token
    const decoded = await authService.verifyToken(token);

    // Verificar se é um token de acesso
    if (decoded.type !== 'access') {
      logger.warn(`Tipo de token inválido: ${decoded.type} para ${req.url}`);
      return res.status(401).json({
        success: false,
        message: 'Tipo de token inválido'
      });
    }

    // Adicionar dados do usuário na requisição
    req.user = {
      id: decoded.userId || decoded.id,
      tenant_id: decoded.tenantId || decoded.tenant_id,
      schema: decoded.schema,
      plan: decoded.plan,
      limits: decoded.limits,
      config: decoded.config,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };
    

    // Log COMPLETAMENTE DESABILITADO para reduzir spam no terminal
    // if (process.env.LOG_AUTH === 'true' && (req.url.includes('/api/dashboard') || req.url.includes('/api/agendamentos'))) {
    //       // logger.debug(`Usuário autenticado: ${req.user.id} (${req.user.email})`); // REMOVIDO - spam logs
    // }


    // Se não há tenant específico na rota, usar o do token
    if (!req.tenantId && (decoded.tenantId || decoded.tenant_id)) {
      req.tenantId = decoded.tenantId || decoded.tenant_id;
    }

    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);

    if (error.message.includes('expirado')) {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * Middleware para verificar permissões
 */
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Verificar se usuário pertence ao tenant
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não fornecido'
        });
      }

      const userTenant = await pool.query(
        'SELECT id_tenant FROM usuarios WHERE id_usuario = ? AND id_tenant = ?',
        [userId, tenantId]
      );

      if (userTenant.rows.length === 0) {
        // Log de tentativa de acesso não autorizado
        console.warn(`🚨 Tentativa de acesso não autorizado: User ${userId} tentando acessar tenant ${tenantId}`);
        
        // Registrar evento de segurança
        await securityAlert.logUnauthorizedAccess(userId, tenantId, req.originalUrl, req.ip, req.get('User-Agent'));
        
        return res.status(403).json({
          success: false,
          message: 'Acesso negado - usuário não pertence ao tenant'
        });
      }

      // Verificar permissões específicas se necessário
      const hasPermission = await authService.checkPermission(req.user, `${resource}:${action}`);
      
      if (!hasPermission) {
        console.warn(`🚨 Permissão insuficiente: User ${userId} tentando ${action} em ${resource}`);
        return res.status(403).json({
          success: false,
          message: 'Acesso negado - permissão insuficiente'
        });
      }

      next();

    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

/**
 * Middleware opcional - tenta autenticar mas não falha se não conseguir
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = await authService.verifyToken(token);

        if (decoded.type === 'access') {
          req.user = {
            id: decoded.userId || decoded.id,
            whatsapp: decoded.whatsapp,
            tenantId: decoded.tenantId || decoded.tenant_id
          };

          if (!req.tenantId && (decoded.tenantId || decoded.tenant_id)) {
            req.tenantId = decoded.tenantId || decoded.tenant_id;
          }
        }
      } catch (error) {
        // Ignora erro de token inválido no auth opcional
        console.log('Token opcional inválido:', error.message);
      }
    }

    next();

  } catch (error) {
    // Continua mesmo com erro
    next();
  }
};

/**
 * Middleware para verificar se usuário é dono do recurso
 */
const requireOwnership = (resourceType) => {
  return (req, res, next) => {
    const userId = req.user?.id;
    const resourceUserId = req.body.id_usuario || req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Para usuários, permitir editar apenas o próprio perfil
    if (resourceType === 'user' && parseInt(resourceUserId) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Você só pode editar seu próprio perfil'
      });
    }

    // Para outros recursos, verificar se pertence ao usuário
    if (resourceType !== 'user' && req.body.id_usuario && parseInt(req.body.id_usuario) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Você só pode criar recursos para si mesmo'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  checkPermission,
  optionalAuth,
  requireOwnership
};
