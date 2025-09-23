const BotActivationService = require('../services/BotActivationService');
const BotStateService = require('../services/BotStateService');
const BotProcessorService = require('../services/BotProcessorService');
const MultiTenantWhatsAppService = require('../services/MultiTenantWhatsAppService');
const { ApiResponse } = require('../../utils/ApiResponse');
const { ApiError } = require('../../utils/ApiError');

// Nota: O sistema agora é multi-tenant, então trabalhamos apenas com conexões por tenant

/**
 * Controller para administração do Bot WhatsApp
 * Fornece endpoints para gerenciar e monitorar o bot
 */
class BotAdminController {

  /**
   * Obtém status geral do sistema multi-tenant
   */
  async getStatus(req, res) {
    try {
      const multiTenantStatus = MultiTenantWhatsAppService.getAllConnectionsStatus();
      const activationStats = BotActivationService.getActivationStats();
      const conversationStats = BotStateService.getConversationStats();

      const status = {
        multiTenant: multiTenantStatus,
        activation: activationStats,
        conversations: conversationStats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      return ApiResponse.success(status, 'Status do sistema obtido com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao obter status do sistema:', error);
      return ApiError.internal(res, 'Erro ao obter status do sistema');
    }
  }

  /**
   * Inicia todos os bots (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/initialize
   */
  async startBot(req, res) {
    try {
      const tenants = MultiTenantWhatsAppService.getAllTenants();

      if (tenants.length === 0) {
        return ApiError.badRequest(res, 'Nenhum tenant encontrado. Use os endpoints específicos por tenant.');
      }

      // Tenta iniciar todos os tenants
      const results = [];
      for (const tenant of tenants) {
        try {
          await MultiTenantWhatsAppService.initializeTenantConnection(tenant.tenantId);
          results.push({ tenantId: tenant.tenantId, status: 'success' });
        } catch (error) {
          results.push({ tenantId: tenant.tenantId, status: 'error', error: error.message });
        }
      }

      return ApiResponse.success( 'Operação concluída', {
        message: 'Use /api/bot/tenants/:tenantId/initialize para controle específico',
        results
      }).send(res);

    } catch (error) {
      console.error('Erro na operação:', error);
      return ApiError.internal(res, 'Erro na operação');
    }
  }

  /**
   * Para todos os bots (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/stop
   */
  async stopBot(req, res) {
    try {
      const tenants = MultiTenantWhatsAppService.getAllTenants();

      // Para todos os tenants
      const results = [];
      for (const tenant of tenants) {
        try {
          await MultiTenantWhatsAppService.stopTenantConnection(tenant.tenantId);
          results.push({ tenantId: tenant.tenantId, status: 'success' });
        } catch (error) {
          results.push({ tenantId: tenant.tenantId, status: 'error', error: error.message });
        }
      }

      return ApiResponse.success( 'Operação concluída', {
        message: 'Use /api/bot/tenants/:tenantId/stop para controle específico',
        results
      }).send(res);

    } catch (error) {
      console.error('Erro na operação:', error);
      return ApiError.internal(res, 'Erro na operação');
    }
  }

  /**
   * Reinicia todos os bots (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/restart
   */
  async restartBot(req, res) {
    try {
      const tenants = MultiTenantWhatsAppService.getAllTenants();

      // Reinicia todos os tenants
      const results = [];
      for (const tenant of tenants) {
        try {
          await MultiTenantWhatsAppService.restartTenantConnection(tenant.tenantId);
          results.push({ tenantId: tenant.tenantId, status: 'success' });
        } catch (error) {
          results.push({ tenantId: tenant.tenantId, status: 'error', error: error.message });
        }
      }

      return ApiResponse.success( 'Operação concluída', {
        message: 'Use /api/bot/tenants/:tenantId/restart para controle específico',
        results
      }).send(res);

    } catch (error) {
      console.error('Erro na operação:', error);
      return ApiError.internal(res, 'Erro na operação');
    }
  }

  /**
   * Faz logout de todos os bots (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/logout
   */
  async logoutBot(req, res) {
    try {
      const tenants = MultiTenantWhatsAppService.getAllTenants();

      // Faz logout de todos os tenants
      const results = [];
      for (const tenant of tenants) {
        try {
          await MultiTenantWhatsAppService.logoutTenantConnection(tenant.tenantId);
          results.push({ tenantId: tenant.tenantId, status: 'success' });
        } catch (error) {
          results.push({ tenantId: tenant.tenantId, status: 'error', error: error.message });
        }
      }

      return ApiResponse.success( 'Operação concluída', {
        message: 'Use /api/bot/tenants/:tenantId/logout para controle específico',
        results
      }).send(res);

    } catch (error) {
      console.error('Erro na operação:', error);
      return ApiError.internal(res, 'Erro na operação');
    }
  }

  /**
   * Obtém QR Code (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/qr
   */
  async getQRCode(req, res) {
    return ApiError.badRequest(res, 'Use /api/bot/tenants/:tenantId/qr para obter QR code de um tenant específico');
  }

  /**
   * Lista conversas ativas
   */
  async getActiveConversations(req, res) {
    try {
      const conversations = BotStateService.getActiveConversations();

      return ApiResponse.success( 'Conversas ativas obtidas com sucesso', {
        count: conversations.length,
        conversations
      });

    } catch (error) {
      console.error('Erro ao obter conversas ativas:', error);
      return ApiError.internal(res, 'Erro ao obter conversas ativas');
    }
  }

  /**
   * Lista conversas com erro
   */
  async getErrorConversations(req, res) {
    try {
      const errorConversations = BotStateService.getErrorConversations();

      return ApiResponse.success( 'Conversas com erro obtidas com sucesso', {
        count: errorConversations.length,
        conversations: errorConversations
      });

    } catch (error) {
      console.error('Erro ao obter conversas com erro:', error);
      return ApiError.internal(res, 'Erro ao obter conversas com erro');
    }
  }

  /**
   * Obtém estatísticas detalhadas
   */
  async getDetailedStats(req, res) {
    try {
      const activationStats = BotActivationService.getActivationStats();
      const conversationStats = BotStateService.getConversationStats();

      // Estatísticas adicionais
      const errorConversations = BotStateService.getErrorConversations();
      const activeConversations = BotStateService.getActiveConversations();

      const detailedStats = {
        overview: {
          totalConversations: conversationStats.totalConversations,
          activeConversations: conversationStats.activeConversations,
          errorConversations: errorConversations.length,
          inactiveConversations: conversationStats.inactiveConversations
        },
        activation: activationStats,
        conversations: conversationStats,
        errors: {
          count: errorConversations.length,
          conversations: errorConversations.slice(0, 10) // Top 10
        },
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      };

      return ApiResponse.success( 'Estatísticas detalhadas obtidas com sucesso', detailedStats);

    } catch (error) {
      console.error('Erro ao obter estatísticas detalhadas:', error);
      return ApiError.internal(res, 'Erro ao obter estatísticas detalhadas');
    }
  }

  /**
   * Envia mensagem manual (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/messages/send
   */
  async sendManualMessage(req, res) {
    return ApiError.badRequest(res, 'Use /api/bot/tenants/:tenantId/messages/send para enviar mensagens por tenant específico');
  }

  /**
   * Atualiza configurações do bot
   */
  async updateBotSettings(req, res) {
    try {
      const { activationSettings, businessHours } = req.body;

      if (activationSettings) {
        BotActivationService.updateSettings(activationSettings);
      }

      if (businessHours) {
        const { start, end } = businessHours;
        BotActivationService.updateBusinessHours(start, end);
      }

      return ApiResponse.success( 'Configurações atualizadas com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return ApiError.internal(res, 'Erro ao atualizar configurações');
    }
  }

  /**
   * Adiciona palavra-chave de ativação
   */
  async addActivationKeyword(req, res) {
    try {
      const { keyword } = req.body;

      if (!keyword) {
        return ApiError.badRequest(res, 'Palavra-chave é obrigatória');
      }

      BotActivationService.addActivationKeyword(keyword);

      return ApiResponse.success( 'Palavra-chave adicionada com sucesso', { keyword }).send(res);

    } catch (error) {
      console.error('Erro ao adicionar palavra-chave:', error);
      return ApiError.internal(res, 'Erro ao adicionar palavra-chave');
    }
  }

  /**
   * Remove palavra-chave de ativação
   */
  async removeActivationKeyword(req, res) {
    try {
      const { keyword } = req.params;

      if (!keyword) {
        return ApiError.badRequest(res, 'Palavra-chave é obrigatória');
      }

      BotActivationService.removeActivationKeyword(keyword);

      return ApiResponse.success( 'Palavra-chave removida com sucesso', { keyword }).send(res);

    } catch (error) {
      console.error('Erro ao remover palavra-chave:', error);
      return ApiError.internal(res, 'Erro ao remover palavra-chave');
    }
  }

  /**
   * Obtém configurações atuais
   */
  async getBotSettings(req, res) {
    try {
      const settings = {
        activation: {
          keywords: BotActivationService.activationKeywords,
          settings: BotActivationService.settings,
          businessHours: BotActivationService.businessHours
        },
        state: {
          timeout: BotStateService.stateTimeoutMs,
          cleanupInterval: 300000 // 5 minutos (hardcoded por enquanto)
        },
        multiTenant: MultiTenantWhatsAppService.getAllConnectionsStatus()
      };

      return ApiResponse.success( 'Configurações obtidas com sucesso', settings).send(res);

    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      return ApiError.internal(res, 'Erro ao obter configurações');
    }
  }

  /**
   * Força ativação de conversa
   */
  async forceActivateConversation(req, res) {
    try {
      const { phoneNumber, context } = req.body;

      if (!phoneNumber) {
        return ApiError.badRequest(res, 'Número do telefone é obrigatório');
      }

      BotActivationService.forceActivateConversation(phoneNumber, context || {});

      return ApiResponse.success( 'Conversa ativada com sucesso', { phoneNumber });

    } catch (error) {
      console.error('Erro ao forçar ativação de conversa:', error);
      return ApiError.internal(res, 'Erro ao ativar conversa');
    }
  }

  /**
   * Desativa conversa
   */
  async deactivateConversation(req, res) {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        return ApiError.badRequest(res, 'Número do telefone é obrigatório');
      }

      BotActivationService.deactivateConversation(phoneNumber);

      return ApiResponse.success( 'Conversa desativada com sucesso', { phoneNumber });

    } catch (error) {
      console.error('Erro ao desativar conversa:', error);
      return ApiError.internal(res, 'Erro ao desativar conversa');
    }
  }

  /**
   * Obtém histórico de uma conversa
   */
  async getConversationHistory(req, res) {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        return ApiError.badRequest(res, 'Número do telefone é obrigatório');
      }

      const history = BotStateService.getStateHistory(phoneNumber);
      const temporaryData = BotStateService.getTemporaryData(phoneNumber);

      return ApiResponse.success( 'Histórico obtido com sucesso', {
        phoneNumber,
        history,
        temporaryData
      });

    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return ApiError.internal(res, 'Erro ao obter histórico da conversa');
    }
  }

  /**
   * Limpa dados de uma conversa
   */
  async clearConversation(req, res) {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        return ApiError.badRequest(res, 'Número do telefone é obrigatório');
      }

      BotStateService.removeConversation(phoneNumber);

      return ApiResponse.success( 'Conversa limpa com sucesso', { phoneNumber });

    } catch (error) {
      console.error('Erro ao limpar conversa:', error);
      return ApiError.internal(res, 'Erro ao limpar conversa');
    }
  }

  /**
   * Limpa conversas expiradas
   */
  async cleanupExpiredConversations(req, res) {
    try {
      const removedCount = BotStateService.cleanupExpiredConversations();
      BotActivationService.cleanupInactiveConversations();

      return ApiResponse.success( 'Limpeza realizada com sucesso', {
        conversationsRemoved: removedCount,
        message: `${removedCount} conversas expiradas foram removidas`
      });

    } catch (error) {
      console.error('Erro na limpeza:', error);
      return ApiError.internal(res, 'Erro na limpeza de conversas expiradas');
    }
  }

  /**
   * Exporta estado do bot para backup
   */
  async exportBotState(req, res) {
    try {
      const { phoneNumber } = req.query;

      const exportData = {
        activation: BotActivationService.getActivationStats(),
        conversations: phoneNumber
          ? BotStateService.exportState(phoneNumber)
          : BotStateService.exportState(),
        whatsapp: MultiTenantWhatsAppService.getAllConnectionsStatus(),
        timestamp: new Date().toISOString()
      };

      return ApiResponse.success( 'Estado exportado com sucesso', exportData);

    } catch (error) {
      console.error('Erro ao exportar estado:', error);
      return ApiError.internal(res, 'Erro ao exportar estado do bot');
    }
  }

  /**
   * Importa estado do bot
   */
  async importBotState(req, res) {
    try {
      const { stateData } = req.body;

      if (!stateData) {
        return ApiError.badRequest(res, 'Dados de estado são obrigatórios');
      }

      BotStateService.importState(stateData);

      return ApiResponse.success( 'Estado importado com sucesso');

    } catch (error) {
      console.error('Erro ao importar estado:', error);
      return ApiError.internal(res, 'Erro ao importar estado do bot');
    }
  }

  /**
   * Testa conectividade (sistema legado - use endpoints específicos por tenant)
   * @deprecated Use /api/bot/tenants/:tenantId/messages/send
   */
  async testConnectivity(req, res) {
    try {
      const tenants = MultiTenantWhatsAppService.getAllTenants();

      if (tenants.length === 0) {
        return ApiError.badRequest(res, 'Nenhum tenant encontrado para teste');
      }

      // Usa o primeiro tenant disponível para teste
      const testTenant = tenants[0].tenantId;
      const testMessage = '🧪 *Teste de Conectividade*\n\nEsta é uma mensagem de teste do sistema multi-tenant WhatsApp.';
      const defaultNumber = process.env.WHATSAPP_TEST_NUMBER || '+553599825422';
      const testResult = await MultiTenantWhatsAppService.sendMessage(testTenant, req.body.testNumber || defaultNumber, testMessage);

      return ApiResponse.success( 'Teste de conectividade realizado', {
        messageId: testResult?.key?.id,
        tenantId: testTenant,
        success: true
      });

    } catch (error) {
      console.error('Erro no teste de conectividade:', error);
      return ApiError.internal(res, 'Erro no teste de conectividade');
    }
  }

  // ==================== MÉTODOS MULTI-TENANT ====================

  /**
   * Inicializa conexão WhatsApp para um tenant específico
   */
  async initializeTenantConnection(req, res) {
    try {
      const { tenantId } = req.params;
      const { config } = req.body;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      const connection = await MultiTenantWhatsAppService.initializeTenantConnection(tenantId, config || {});

      return ApiResponse.success( `Conexão inicializada para tenant ${tenantId}`, {
        tenantId,
        connectionStatus: connection.connectionStatus
      }).send(res);

    } catch (error) {
      console.error(`Erro ao inicializar conexão para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao inicializar conexão do tenant');
    }
  }

  /**
   * Para conexão WhatsApp de um tenant específico
   */
  async stopTenantConnection(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      await MultiTenantWhatsAppService.stopTenantConnection(tenantId);

      return ApiResponse.success( `Conexão parada para tenant ${tenantId}`, { tenantId });

    } catch (error) {
      console.error(`Erro ao parar conexão para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao parar conexão do tenant');
    }
  }

  /**
   * Reinicia conexão WhatsApp de um tenant específico
   */
  async restartTenantConnection(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      const connection = await MultiTenantWhatsAppService.restartTenantConnection(tenantId);

      return ApiResponse.success( `Conexão reiniciada para tenant ${tenantId}`, {
        tenantId,
        connectionStatus: connection.getConnectionStatus()
      });

    } catch (error) {
      console.error(`Erro ao reiniciar conexão para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao reiniciar conexão do tenant');
    }
  }

  /**
   * Faz logout da conexão de um tenant específico
   */
  async logoutTenantConnection(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      await MultiTenantWhatsAppService.logoutTenantConnection(tenantId);

      return ApiResponse.success( `Logout realizado para tenant ${tenantId}`, { tenantId });

    } catch (error) {
      console.error(`Erro no logout para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro no logout do tenant');
    }
  }

  /**
   * Obtém status de um tenant específico
   */
  async getTenantStatus(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);

      return ApiResponse.success(status, `Status obtido para tenant ${tenantId}`).send(res);

    } catch (error) {
      console.error(`Erro ao obter status para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao obter status do tenant');
    }
  }

  /**
   * Lista todos os tenants com conexões
   */
  async getAllTenants(req, res) {
    try {
      // Obter tenant do usuário logado para filtrar
      const userTenantId = req.user?.tenant_id || req.user?.id_tenant;
      
      const tenants = await MultiTenantWhatsAppService.getAllTenants(userTenantId);

      return ApiResponse.success({
        count: tenants.length,
        tenants
      }, 'Tenants obtidos com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao obter lista de tenants:', error);
      return ApiError.internal(res, 'Erro ao obter lista de tenants');
    }
  }

  /**
   * Obtém QR Code para um tenant específico
   */
  async getTenantQRCode(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);

      if (status.isConnected) {
        return ApiError.badRequest(res, 'Tenant já está conectado');
      }

      // Verificar se QR já foi gerado
      const connection = MultiTenantWhatsAppService.tenantConnections.get(tenantId.toString());
      if (connection && connection.qrData) {
        return ApiResponse.success( 'QR Code gerado com sucesso', {
          qr: connection.qrData,
          qrGenerated: true,
          tenantId
        }).send(res);
      }

      // Retornar resposta indicando que QR está sendo gerado
      return ApiResponse.success( 'QR Code sendo gerado', {
        qrGenerated: false,
        message: 'Inicializando conexão WhatsApp...',
        tenantId,
        status: 'initializing'
      }).send(res);

    } catch (error) {
      console.error(`Erro ao obter QR Code para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao gerar QR Code');
    }
  }

  /**
   * Envia mensagem manual para um tenant específico
   */
  async sendTenantMessage(req, res) {
    try {
      const { tenantId } = req.params;
      const { to, message, type = 'text' } = req.body;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      if (!to || !message) {
        return ApiError.badRequest(res, 'Número de destino e mensagem são obrigatórios');
      }

      const result = await MultiTenantWhatsAppService.sendMessage(tenantId, to, message);

      return ApiResponse.success( `Mensagem enviada para tenant ${tenantId}`, {
        messageId: result?.key?.id,
        to,
        tenantId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Erro ao enviar mensagem para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao enviar mensagem');
    }
  }

  /**
   * Obtém estatísticas de todos os tenants
   */
  async getTenantsStats(req, res) {
    try {
      const stats = MultiTenantWhatsAppService.getAllConnectionsStatus();

      return ApiResponse.success( 'Estatísticas dos tenants obtidas com sucesso', stats);

    } catch (error) {
      console.error('Erro ao obter estatísticas dos tenants:', error);
      return ApiError.internal(res, 'Erro ao obter estatísticas dos tenants');
    }
  }

  /**
   * Limpa conexões inativas de todos os tenants
   */
  async cleanupTenantConnections(req, res) {
    try {
      MultiTenantWhatsAppService.cleanupInactiveConnections();

      return ApiResponse.success( 'Limpeza de conexões inativas realizada com sucesso').send(res);

    } catch (error) {
      console.error('Erro na limpeza de conexões:', error);
      return ApiError.internal(res, 'Erro na limpeza de conexões');
    }
  }

  /**
   * Exporta configurações de todos os tenants
   */
  async exportTenantConfigurations(req, res) {
    try {
      const exportData = MultiTenantWhatsAppService.exportConfigurations();

      return ApiResponse.success( 'Configurações exportadas com sucesso', exportData);

    } catch (error) {
      console.error('Erro ao exportar configurações:', error);
      return ApiError.internal(res, 'Erro ao exportar configurações');
    }
  }

  /**
   * Importa configurações para tenants
   */
  async importTenantConfigurations(req, res) {
    try {
      const { configurations } = req.body;

      if (!configurations) {
        return ApiError.badRequest(res, 'Configurações são obrigatórias');
      }

      MultiTenantWhatsAppService.importConfigurations(configurations);

      return ApiResponse.success( 'Configurações importadas com sucesso');

    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return ApiError.internal(res, 'Erro ao importar configurações');
    }
  }

  // ==================== SERVIÇOS DE QR CODE E STREAMING ====================

  /**
   * Streaming de QR Code para frontend
   */
  async streamTenantQRCode(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      // Configurar headers para SSE (Server-Sent Events)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Função para enviar dados do QR code
      const sendQRData = (qrData) => {
        res.write(`data: ${JSON.stringify({ qr: qrData, tenantId })}\n\n`);
      };

      // Registrar callback para receber QR code
      MultiTenantWhatsAppService.registerQRCallback(tenantId, sendQRData);

      // Inicializar conexão se necessário
      const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);
      if (!status.exists) {
        try {
          await MultiTenantWhatsAppService.initializeTenantConnection(tenantId);
        } catch (error) {
          res.write(`data: ${JSON.stringify({ error: error.message, tenantId })}\n\n`);
        }
      }

      // Timeout de 5 minutos
      const timeout = setTimeout(() => {
        res.write(`data: ${JSON.stringify({ timeout: true, tenantId })}\n\n`);
        res.end();
      }, 5 * 60 * 1000);

      // Limpar callback quando conexão fechar
      req.on('close', () => {
        clearTimeout(timeout);
        // Remover callback (implementar limpeza no serviço)
      });

    } catch (error) {
      console.error(`Erro no streaming de QR code para tenant ${req.params.tenantId}:`, error);
      if (!res.headersSent) {
        return ApiError.internal(res, 'Erro no streaming de QR code');
      }
    }
  }

  /**
   * Obtém dados de QR code em formato JSON
   */
  async getTenantQRData(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      // Tentar obter QR code atual
      const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);

      if (!status.exists) {
        return ApiError.notFound(res, 'Conexão não encontrada para este tenant');
      }

      if (status.isConnected) {
        return ApiError.badRequest(res, 'Tenant já está conectado');
      }

      // Se QR ainda não foi gerado, tentar inicializar
      if (!status.qrGenerated) {
        // Registrar callback temporário
        let qrData = null;
        const tempCallback = (qr) => {
          qrData = qr;
        };

        MultiTenantWhatsAppService.registerQRCallback(tenantId, tempCallback);

        // Inicializar se necessário
        if (!status.exists) {
          await MultiTenantWhatsAppService.initializeTenantConnection(tenantId);
        }

        // Aguardar até 10 segundos pelo QR code
        let attempts = 0;
        while (!qrData && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }

      // Retornar dados do QR ou status
      const response = {
        tenantId,
        qrGenerated: status.qrGenerated,
        isConnected: status.isConnected
      };

      if (status.qrGenerated && status.qrData) {
        response.qr = status.qrData;
      }

      return ApiResponse.success( 'Dados do QR code obtidos', response);

    } catch (error) {
      console.error(`Erro ao obter dados de QR para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao obter dados do QR code');
    }
  }

  /**
   * Gera imagem QR code
   */
  async generateTenantQRImage(req, res) {
    try {
      const { tenantId } = req.params;
      const { size = 256 } = req.query;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);

      if (!status.exists || !status.qrData) {
        return ApiError.notFound(res, 'QR code não disponível para este tenant');
      }

      // Usar qrcode library para gerar imagem
      const qrcode = require('qrcode');
      const qrImageBuffer = await qrcode.toBuffer(status.qrData, {
        type: 'png',
        width: parseInt(size),
        margin: 2
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(qrImageBuffer);

    } catch (error) {
      console.error(`Erro ao gerar imagem QR para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro ao gerar imagem QR');
    }
  }

  /**
   * Monitor de conexões em tempo real (SSE)
   */
  async streamTenantStatus(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      // Configurar headers para SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Função para enviar status
      const sendStatus = () => {
        try {
          const status = MultiTenantWhatsAppService.getTenantConnectionStatus(tenantId);
          res.write(`data: ${JSON.stringify(status)}\n\n`);
        } catch (error) {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        }
      };

      // Enviar status inicial
      sendStatus();

      // Atualizar a cada 3 segundos
      const interval = setInterval(sendStatus, 3000);

      // Timeout de 30 minutos
      const timeout = setTimeout(() => {
        res.end();
      }, 30 * 60 * 1000);

      // Limpar intervalos quando conexão fechar
      req.on('close', () => {
        clearInterval(interval);
        clearTimeout(timeout);
      });

    } catch (error) {
      console.error(`Erro no streaming de status para tenant ${req.params.tenantId}:`, error);
      if (!res.headersSent) {
        return ApiError.internal(res, 'Erro no streaming de status');
      }
    }
  }

  /**
   * Webhook para receber atualizações de mensagens
   */
  async handleTenantWebhook(req, res) {
    try {
      const { tenantId } = req.params;
      const webhookData = req.body;

      if (!tenantId) {
        return ApiError.badRequest(res, 'ID do tenant é obrigatório');
      }

      console.log(`📨 Webhook recebido para tenant ${tenantId}:`, webhookData);

      // Processar webhook baseado no tenant
      // Aqui você pode integrar com o BotProcessorService específico do tenant

      // Por enquanto, apenas confirmar recebimento
      return ApiResponse.success( 'Webhook processado com sucesso', {
        tenantId,
        received: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Erro no webhook para tenant ${req.params.tenantId}:`, error);
      return ApiError.internal(res, 'Erro no processamento do webhook');
    }
  }
}

module.exports = new BotAdminController();
