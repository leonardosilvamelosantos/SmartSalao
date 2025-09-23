const express = require('express');
const router = express.Router();
const MultiTenantWhatsAppServiceV2 = require('../whatsapp-bot/services/MultiTenantWhatsAppServiceV2');
const { authenticateToken } = require('../middleware/auth');

// Instanciar o serviço
const whatsappServiceV2 = new MultiTenantWhatsAppServiceV2();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

/**
 * @route GET /api/whatsapp-v2/instances
 * @desc Listar todas as instâncias WhatsApp
 * @access Private
 */
router.get('/instances', async (req, res) => {
  try {
    // Obter o tenant do usuário logado
    const userTenantId = req.user?.tenant_id || req.user?.id_tenant;
    console.log('🔍 Tenant do usuário logado:', userTenantId);
    
    // Buscar tenants filtrados por tenant do usuário
    const tenants = await whatsappServiceV2.getAllTenants(userTenantId);
    console.log('📊 Tenants encontrados:', tenants);
    
    res.json({
      success: true,
      instances: tenants.map(tenant => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.name,
        isConnected: tenant.status?.isConnected || false,
        qrCode: tenant.status?.qrCode || null,
        pairingCode: tenant.status?.pairingCode || null,
        phoneNumber: tenant.status?.phoneNumber || null,
        connectionMethod: tenant.status?.connectionMethod || 'qr',
        lastActivity: tenant.status?.lastActivity || null,
        connectionState: tenant.status?.connectionState || 'disconnected',
        isConnecting: tenant.status?.isConnecting || false
      }))
    });
  } catch (error) {
    console.error('Erro ao listar instâncias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp-v2/instances/:tenantId/connect
 * @desc Conectar instância WhatsApp
 * @access Private
 */
router.post('/instances/:tenantId/connect', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { phoneNumber, connectionMethod = 'qr' } = req.body;

    const options = {
      phoneNumber,
      connectionMethod,
      autoConnect: true
    };

    const result = await whatsappServiceV2.initializeTenantConnection(tenantId, options);
    res.json(result);
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp-v2/instances/:tenantId/status
 * @desc Obter status da instância
 * @access Private
 */
router.get('/instances/:tenantId/status', async (req, res) => {
  try {
    const { tenantId } = req.params;
    // Evitar cache para que o status/QR sempre reflita o estado atual
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    const status = whatsappServiceV2.getInstanceStatus(tenantId);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp-v2/instances/:tenantId/qr
 * @desc Obter QR Code da instância
 * @access Private
 */
router.get('/instances/:tenantId/qr', async (req, res) => {
  try {
    const { tenantId } = req.params;
    console.log(`🔍 Buscando QR Code para tenant ${tenantId}...`);
    
    const status = whatsappServiceV2.getInstanceStatus(tenantId);
    console.log(`📊 Status recebido para QR Code:`, {
      success: status.success,
      hasQrCode: !!status.qrCode,
      qrCodeType: typeof status.qrCode,
      qrCodeLength: status.qrCode ? status.qrCode.length : 0
    });
    
    if (!status || !status.qrCode) {
      console.log(`❌ QR Code não disponível para tenant ${tenantId}`);
      return res.status(404).json({
        success: false,
        message: 'QR Code não disponível'
      });
    }

    console.log(`✅ QR Code encontrado para tenant ${tenantId}, enviando...`);
    // Evitar cache do QR (expira rápido)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({
      success: true,
      qrCode: status.qrCode
    });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp-v2/instances/:tenantId/pairing-code
 * @desc Solicitar código de pareamento
 * @access Private
 */
router.post('/instances/:tenantId/pairing-code', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório'
      });
    }

    const result = await whatsappServiceV2.requestPairingCode(tenantId, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Erro ao solicitar código de pareamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp-v2/instances/:tenantId/pairing-code
 * @desc Obter código de pareamento atual
 * @access Private
 */
router.get('/instances/:tenantId/pairing-code', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const pairingCode = whatsappServiceV2.getPairingCode(tenantId);
    
    if (!pairingCode) {
      return res.status(404).json({
        success: false,
        message: 'Código de pareamento não disponível'
      });
    }

    // Evitar cache do código de pareamento (curta validade)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({
      success: true,
      pairingCode
    });
  } catch (error) {
    console.error('Erro ao obter código de pareamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp-v2/instances/:tenantId/send
 * @desc Enviar mensagem
 * @access Private
 */
router.post('/instances/:tenantId/send', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Campos "to" e "message" são obrigatórios'
      });
    }

    const result = await whatsappServiceV2.sendMessage(tenantId, to, message);
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp-v2/instances/:tenantId/send-media
 * @desc Enviar mídia
 * @access Private
 */
router.post('/instances/:tenantId/send-media', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { to, media, caption } = req.body;

    if (!to || !media) {
      return res.status(400).json({
        success: false,
        message: 'Campos "to" e "media" são obrigatórios'
      });
    }

    const result = await whatsappServiceV2.sendMediaMessage(tenantId, to, media, caption);
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar mídia:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/whatsapp-v2/instances/:tenantId/disconnect
 * @desc Desconectar instância
 * @access Private
 */
router.delete('/instances/:tenantId/disconnect', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await whatsappServiceV2.disconnectTenant(tenantId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp-v2/instances/:tenantId/logout
 * @desc Limpar credenciais/sessão e forçar novo QR na próxima conexão
 * @access Private
 */
router.post('/instances/:tenantId/logout', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await whatsappServiceV2.logoutTenant(tenantId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao fazer logout da instância:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp-v2/stats
 * @desc Obter estatísticas
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await whatsappServiceV2.getStats();
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp-v2/message-logs
 * @desc Obter logs de mensagens
 * @access Private
 */
router.get('/message-logs', async (req, res) => {
  try {
    const { tenantId, limit = 100 } = req.query;
    const result = await whatsappServiceV2.getMessageLogs(tenantId, parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter logs de mensagens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
