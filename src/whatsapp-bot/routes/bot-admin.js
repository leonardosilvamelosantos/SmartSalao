const express = require('express');
const router = express.Router();
const BotAdminController = require('../controllers/BotAdminController');
const { authenticateToken } = require('../../middleware/auth');

// Middleware de autenticação para WhatsApp Bot
const authenticateAdmin = authenticateToken;

// Middleware de validação
const validateRequest = (schema) => {
  return (req, res, next) => {
    // TODO: Implementar validação usando Joi ou similar
    next();
  };
};

// === ROTAS DE STATUS E CONTROLE BÁSICO ===

/**
 * GET /api/bot/status
 * Obtém status geral do bot
 */
router.get('/status', authenticateAdmin, async (req, res) => {
  await BotAdminController.getStatus(req, res);
});

/**
 * POST /api/bot/start
 * Inicia o bot WhatsApp
 */
router.post('/start', authenticateAdmin, async (req, res) => {
  await BotAdminController.startBot(req, res);
});

/**
 * POST /api/bot/stop
 * Para o bot WhatsApp
 */
router.post('/stop', authenticateAdmin, async (req, res) => {
  await BotAdminController.stopBot(req, res);
});

/**
 * POST /api/bot/restart
 * Reinicia o bot WhatsApp
 */
router.post('/restart', authenticateAdmin, async (req, res) => {
  await BotAdminController.restartBot(req, res);
});

/**
 * POST /api/bot/logout
 * Faz logout do WhatsApp
 */
router.post('/logout', authenticateAdmin, async (req, res) => {
  await BotAdminController.logoutBot(req, res);
});

/**
 * GET /api/bot/qr
 * Obtém QR Code para conexão
 */
router.get('/qr', authenticateAdmin, async (req, res) => {
  await BotAdminController.getQRCode(req, res);
});

// === ROTAS DE CONVERSAS ===

/**
 * GET /api/bot/conversations/active
 * Lista conversas ativas
 */
router.get('/conversations/active', authenticateAdmin, async (req, res) => {
  await BotAdminController.getActiveConversations(req, res);
});

/**
 * GET /api/bot/conversations/errors
 * Lista conversas com erro
 */
router.get('/conversations/errors', authenticateAdmin, async (req, res) => {
  await BotAdminController.getErrorConversations(req, res);
});

/**
 * GET /api/bot/conversations/:phoneNumber/history
 * Obtém histórico de uma conversa específica
 */
router.get('/conversations/:phoneNumber/history', authenticateAdmin, async (req, res) => {
  await BotAdminController.getConversationHistory(req, res);
});

/**
 * DELETE /api/bot/conversations/:phoneNumber
 * Limpa dados de uma conversa específica
 */
router.delete('/conversations/:phoneNumber', authenticateAdmin, async (req, res) => {
  await BotAdminController.clearConversation(req, res);
});

/**
 * POST /api/bot/conversations/:phoneNumber/activate
 * Força ativação de uma conversa
 */
router.post('/conversations/:phoneNumber/activate', authenticateAdmin, async (req, res) => {
  await BotAdminController.forceActivateConversation(req, res);
});

/**
 * POST /api/bot/conversations/:phoneNumber/deactivate
 * Desativa uma conversa
 */
router.post('/conversations/:phoneNumber/deactivate', authenticateAdmin, async (req, res) => {
  await BotAdminController.deactivateConversation(req, res);
});

/**
 * POST /api/bot/conversations/cleanup
 * Limpa conversas expiradas
 */
router.post('/conversations/cleanup', authenticateAdmin, async (req, res) => {
  await BotAdminController.cleanupExpiredConversations(req, res);
});

// === ROTAS DE ESTATÍSTICAS ===

/**
 * GET /api/bot/stats
 * Obtém estatísticas detalhadas
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
  await BotAdminController.getDetailedStats(req, res);
});

// === ROTAS DE CONFIGURAÇÃO ===

/**
 * GET /api/bot/settings
 * Obtém configurações atuais
 */
router.get('/settings', authenticateAdmin, async (req, res) => {
  await BotAdminController.getBotSettings(req, res);
});

/**
 * PUT /api/bot/settings
 * Atualiza configurações do bot
 */
router.put('/settings', authenticateAdmin, async (req, res) => {
  await BotAdminController.updateBotSettings(req, res);
});

/**
 * POST /api/bot/settings/keywords
 * Adiciona palavra-chave de ativação
 */
router.post('/settings/keywords', authenticateAdmin, async (req, res) => {
  await BotAdminController.addActivationKeyword(req, res);
});

/**
 * DELETE /api/bot/settings/keywords/:keyword
 * Remove palavra-chave de ativação
 */
router.delete('/settings/keywords/:keyword', authenticateAdmin, async (req, res) => {
  await BotAdminController.removeActivationKeyword(req, res);
});

// === ROTAS DE MENSAGENS MANUAIS ===

/**
 * POST /api/bot/messages/send
 * Envia mensagem manual
 */
router.post('/messages/send', authenticateAdmin, validateRequest({
  to: 'required|string',
  message: 'required|string',
  type: 'optional|string|in:text,button,list'
}), async (req, res) => {
  await BotAdminController.sendManualMessage(req, res);
});

// === ROTAS DE BACKUP/EXPORT ===

/**
 * GET /api/bot/export
 * Exporta estado do bot
 */
router.get('/export', authenticateAdmin, async (req, res) => {
  await BotAdminController.exportBotState(req, res);
});

/**
 * POST /api/bot/import
 * Importa estado do bot
 */
router.post('/import', authenticateAdmin, async (req, res) => {
  await BotAdminController.importBotState(req, res);
});

// === ROTAS DE TESTE ===

/**
 * POST /api/bot/test
 * Testa conectividade do bot
 */
router.post('/test', authenticateAdmin, async (req, res) => {
  await BotAdminController.testConnectivity(req, res);
});

// ==================== ROTAS MULTI-TENANT ====================

/**
 * POST /api/bot/tenants/:tenantId/initialize
 * Inicializa conexão para um tenant específico
 */
router.post('/tenants/:tenantId/initialize', authenticateAdmin, async (req, res) => {
  await BotAdminController.initializeTenantConnection(req, res);
});

/**
 * POST /api/bot/tenants/:tenantId/stop
 * Para conexão de um tenant específico
 */
router.post('/tenants/:tenantId/stop', authenticateAdmin, async (req, res) => {
  await BotAdminController.stopTenantConnection(req, res);
});

/**
 * POST /api/bot/tenants/:tenantId/restart
 * Reinicia conexão de um tenant específico
 */
router.post('/tenants/:tenantId/restart', authenticateAdmin, async (req, res) => {
  await BotAdminController.restartTenantConnection(req, res);
});

/**
 * POST /api/bot/tenants/:tenantId/logout
 * Faz logout da conexão de um tenant específico
 */
router.post('/tenants/:tenantId/logout', authenticateAdmin, async (req, res) => {
  await BotAdminController.logoutTenantConnection(req, res);
});

/**
 * GET /api/bot/tenants/:tenantId/status
 * Obtém status de um tenant específico
 */
router.get('/tenants/:tenantId/status', authenticateAdmin, async (req, res) => {
  await BotAdminController.getTenantStatus(req, res);
});

/**
 * GET /api/bot/tenants/:tenantId/qr
 * Obtém QR Code para um tenant específico
 */
router.get('/tenants/:tenantId/qr', authenticateAdmin, async (req, res) => {
  await BotAdminController.getTenantQRCode(req, res);
});

/**
 * POST /api/bot/tenants/:tenantId/messages/send
 * Envia mensagem manual para um tenant específico
 */
router.post('/tenants/:tenantId/messages/send', authenticateAdmin, async (req, res) => {
  await BotAdminController.sendTenantMessage(req, res);
});

/**
 * GET /api/bot/tenants
 * Lista todos os tenants com conexões
 */
router.get('/tenants', authenticateAdmin, async (req, res) => {
  await BotAdminController.getAllTenants(req, res);
});


/**
 * GET /api/bot/tenants/stats
 * Obtém estatísticas de todos os tenants
 */
router.get('/tenants/stats', authenticateAdmin, async (req, res) => {
  await BotAdminController.getTenantsStats(req, res);
});

/**
 * POST /api/bot/tenants/cleanup
 * Limpa conexões inativas de todos os tenants
 */
router.post('/tenants/cleanup', authenticateAdmin, async (req, res) => {
  await BotAdminController.cleanupTenantConnections(req, res);
});

/**
 * GET /api/bot/tenants/export
 * Exporta configurações de todos os tenants
 */
router.get('/tenants/export', authenticateAdmin, async (req, res) => {
  await BotAdminController.exportTenantConfigurations(req, res);
});

/**
 * POST /api/bot/tenants/import
 * Importa configurações para tenants
 */
router.post('/tenants/import', authenticateAdmin, async (req, res) => {
  await BotAdminController.importTenantConfigurations(req, res);
});

// ==================== ROTAS DE QR CODE E STREAMING ====================

/**
 * GET /api/bot/tenants/:tenantId/qr/stream
 * Streaming de QR Code (Server-Sent Events)
 */
router.get('/tenants/:tenantId/qr/stream', authenticateAdmin, async (req, res) => {
  await BotAdminController.streamTenantQRCode(req, res);
});

/**
 * GET /api/bot/tenants/:tenantId/qr/data
 * Obtém dados do QR code em JSON
 */
router.get('/tenants/:tenantId/qr/data', authenticateAdmin, async (req, res) => {
  await BotAdminController.getTenantQRData(req, res);
});

/**
 * GET /api/bot/tenants/:tenantId/qr/image
 * Gera imagem do QR code
 */
router.get('/tenants/:tenantId/qr/image', authenticateAdmin, async (req, res) => {
  await BotAdminController.generateTenantQRImage(req, res);
});

/**
 * GET /api/bot/tenants/:tenantId/status/stream
 * Streaming de status da conexão (Server-Sent Events)
 */
router.get('/tenants/:tenantId/status/stream', authenticateAdmin, async (req, res) => {
  await BotAdminController.streamTenantStatus(req, res);
});

/**
 * POST /api/bot/tenants/:tenantId/webhook
 * Webhook para receber atualizações de mensagens
 */
router.post('/tenants/:tenantId/webhook', async (req, res) => {
  await BotAdminController.handleTenantWebhook(req, res);
});

// === ROTAS DE MONITORAMENTO (HEALTH CHECKS) ===

/**
 * GET /api/bot/health
 * Health check básico
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

/**
 * GET /api/bot/health/whatsapp
 * Health check específico do WhatsApp multi-tenant
 */
router.get('/health/whatsapp', (req, res) => {
  const MultiTenantWhatsAppService = require('../services/MultiTenantWhatsAppService');
  const status = MultiTenantWhatsAppService.getAllConnectionsStatus();

  res.json({
    multiTenant: status,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/bot/health/conversations
 * Health check das conversas
 */
router.get('/health/conversations', (req, res) => {
  const BotStateService = require('../services/BotStateService');
  const BotActivationService = require('../services/BotActivationService');

  const stateStats = BotStateService.getConversationStats();
  const activationStats = BotActivationService.getActivationStats();

  res.json({
    conversations: {
      total: stateStats.totalConversations,
      active: stateStats.activeConversations,
      errors: stateStats.errorConversations
    },
    activation: {
      activeConversations: activationStats.activeConversations,
      inactiveConversations: activationStats.inactiveConversations
    },
    timestamp: new Date().toISOString()
  });
});

// === MIDDLEWARE DE LOGGING ===

router.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`🤖 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// === MIDDLEWARE DE ERROR HANDLING ===

router.use((error, req, res, next) => {
  console.error('❌ Erro na rota do bot:', error);

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
