const express = require('express');
const router = express.Router();
const WhatsappService = require('../services/WhatsappService');

// GET /api/whatsapp/webhook - Verificação do webhook (Meta/Facebook)
router.get('/webhook', (req, res) => {
  const { mode, token, challenge } = req.query;

  const verification = WhatsappService.verifyWebhook(mode, token, challenge);

  if (verification.success) {
    res.status(200).send(verification.challenge);
  } else {
    res.status(403).json({
      success: false,
      message: verification.message
    });
  }
});

// POST /api/whatsapp/webhook - Receber mensagens do WhatsApp (Evolution API)
router.post('/webhook', async (req, res) => {
  try {
    const WhatsappController = require('../controllers/WhatsappController');
    await WhatsappController.receiveMessage(req, res);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no webhook'
    });
  }
});

// POST /api/whatsapp/send - Enviar mensagem manual
router.post('/send', async (req, res) => {
  try {
    const { to, message, type = 'text', options } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Número destinatário e mensagem são obrigatórios'
      });
    }

    let result;

    switch (type) {
      case 'interactive':
        result = await WhatsappService.sendInteractiveMessage(to, message, options?.buttons || []);
        break;
      case 'list':
        result = await WhatsappService.sendListMessage(to, message, options?.sections || []);
        break;
      default:
        result = await WhatsappService.sendTextMessage(to, message);
    }

    res.json({
      success: true,
      messageId: result.messageId,
      data: result
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao enviar mensagem'
    });
  }
});

// POST /api/whatsapp/send-welcome - Enviar mensagem de boas-vindas
router.post('/send-welcome', async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Número destinatário é obrigatório'
      });
    }

    const result = await WhatsappService.sendWelcomeMessage(to);

    res.json({
      success: true,
      messageId: result.messageId,
      data: result
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem de boas-vindas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao enviar mensagem de boas-vindas'
    });
  }
});

// GET /api/whatsapp/status - Verificar status da integração
router.get('/status', async (req, res) => {
  try {
    const status = await WhatsappService.checkStatus();

    res.json({
      success: true,
      whatsapp: status
    });

  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status da integração'
    });
  }
});

// (removido) POST /api/whatsapp/test

// ========== NOVAS ROTAS PARA CONTROLE DE CONVERSAS ==========

const { authenticateToken } = require('../middleware/auth');
const WhatsappController = require('../controllers/WhatsappController');

/**
 * GET /api/whatsapp/stats - Estatísticas das conversas
 */
router.get('/stats', authenticateToken, WhatsappController.getConversationStats);

/**
 * POST /api/whatsapp/reset/:userId - Resetar conversa de um usuário
 */
router.post('/reset/:userId', authenticateToken, WhatsappController.resetConversation);

/**
 * POST /api/whatsapp/cleanup - Limpar filas antigas
 */
router.post('/cleanup', authenticateToken, WhatsappController.cleanupQueues);

/**
 * POST /api/whatsapp/test-webhook - Testar webhook
 */
router.post('/test-webhook', authenticateToken, WhatsappController.testWebhook);

module.exports = router;
