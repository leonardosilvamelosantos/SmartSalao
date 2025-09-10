const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { validateLogin, validateRegister, validateChangePassword } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Instanciar o serviço de autenticação
const authService = new AuthService();

// Rotas de teste/debug removidas para produção

/**
 * POST /api/auth/login
 * Login de usuário
 */
router.post('/login', async (req, res) => {
  try {
    console.log('🚀 Rota de login chamada');
    console.log('📨 Raw body:', req.body);
    console.log('📨 Headers:', req.headers);

    const { whatsapp, email, password, tenantId } = req.body;
    console.log('📨 Dados processados:', { whatsapp, email, password: password ? '[HIDDEN]' : null, tenantId });

    // Aceita tanto whatsapp quanto email para login
    const loginField = whatsapp || email;
    console.log('🔑 Campo de login:', loginField);

    if (!loginField || !password) {
      console.log('❌ Campos obrigatórios faltando');
      return res.status(400).json({
        success: false,
        message: 'Email/WhatsApp e senha são obrigatórios'
      });
    }

    console.log('🔐 Chamando authService.authenticate...');
    const result = await authService.authenticate(loginField, password, tenantId);
    console.log('✅ Autenticação bem-sucedida');

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    console.error('Stack:', error.stack);

    if (
      error.message.includes('não encontrado') ||
      error.message.includes('incorreta') ||
      error.message.includes('sem senha') ||
      error.message.includes('Credenciais inválidas')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/register
 * Registro de novo usuário
 */
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { whatsapp, password, tenantId, ...userData } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Senha é obrigatória'
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID é obrigatório'
      });
    }

    // Adicionar senha aos dados do usuário
    const userDataWithPassword = {
      ...userData,
      whatsapp,
      password
    };

    // Para desenvolvimento, apenas simular registro
    const result = { message: 'Usuário registrado com sucesso (simulado)' };

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro no registro:', error);

    if (error.message.includes('já cadastrado') ||
        error.message.includes('não encontrado')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Renovar token de acesso
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token é obrigatório'
      });
    }

    const result = { message: 'Token renovado (simulado)' };

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro no refresh token:', error);

    res.status(401).json({
      success: false,
      message: 'Refresh token inválido'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout do usuário
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Logout simulado
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Alterar senha do usuário
 */
router.post('/change-password', authenticateToken, validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    const result = { message: 'Senha alterada (simulado)' };

    res.json(result);

  } catch (error) {
    console.error('Erro ao alterar senha:', error);

    if (error.message.includes('incorreta')) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperação de senha
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { whatsapp, tenantId } = req.body;

    if (!whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp é obrigatório'
      });
    }

    const result = { message: 'Código enviado (simulado)' };

    res.json(result);

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Redefinir senha com código
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { whatsapp, recoveryCode, newPassword, tenantId } = req.body;

    if (!whatsapp || !recoveryCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp, código de recuperação e nova senha são obrigatórios'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    const result = { message: 'Senha redefinida (simulado)' };

    res.json(result);

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/me
 * Obter dados do usuário autenticado
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const Usuario = require('../models/Usuario');
    const user = await Usuario.findWithTenant(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id_usuario,
        nome: user.nome,
        whatsapp: user.whatsapp,
        timezone: user.timezone,
        tenant: {
          id: user.id_tenant,
          nome: user.nome_tenant,
          dominio: user.dominio,
          status: user.tenant_status
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
