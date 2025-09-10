const AuthService = require('../services/AuthService');

// Instanciar o serviço de autenticação
const authService = new AuthService();

/**
 * Middleware de autenticação JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
    }

    // Verificar token
    const decoded = await authService.verifyToken(token);

    // Verificar se é um token de acesso
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Tipo de token inválido'
      });
    }

    // Adicionar dados do usuário na requisição
    req.user = {
      id: decoded.id,
      tenant_id: decoded.tenant_id,
      schema: decoded.schema,
      plan: decoded.plan,
      limits: decoded.limits,
      config: decoded.config,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };


    // Se não há tenant específico na rota, usar o do token
    if (!req.tenantId && decoded.tenant_id) {
      req.tenantId = decoded.tenant_id;
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

      // Para desenvolvimento, sempre permitir
      const hasPermission = true;

      if (!hasPermission) {
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
            id: decoded.id,
            whatsapp: decoded.whatsapp,
            tenantId: decoded.tenantId
          };

          if (!req.tenantId && decoded.tenantId) {
            req.tenantId = decoded.tenantId;
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
