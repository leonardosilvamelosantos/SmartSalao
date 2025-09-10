const ConversationService = require('../services/ConversationService');

/**
 * Controlador para integração WhatsApp via Evolution API
 */
class WhatsappController {
  constructor() {
    this.conversationService = ConversationService;
  }

  /**
   * Webhook para receber mensagens do Evolution API
   * POST /api/whatsapp/webhook
   */
  async receiveMessage(req, res) {
    try {
      const {
        from,
        message,
        businessNumber,
        messageType,
        timestamp
      } = req.body;

      console.log(`📨 Webhook WhatsApp: ${from} -> ${businessNumber}`);
      console.log(`💬 Mensagem: "${message}" (${messageType})`);

      // Validar dados obrigatórios
      if (!from || !message || !businessNumber) {
        return res.status(400).json({
          success: false,
          message: 'Dados obrigatórios faltando: from, message, businessNumber'
        });
      }

      // Ignorar mensagens do próprio bot
      if (from === businessNumber) {
        return res.status(200).json({ success: true, message: 'Mensagem do próprio bot ignorada' });
      }

      // Processar mensagem através do serviço de conversas
      const response = await this.conversationService.processMessage(from, message, businessNumber);

      // Se tem resposta imediata, enviar
      if (response && response.immediate) {
        try {
          await this.sendMessage(from, response.message, businessNumber);
        } catch (sendError) {
          console.error('Erro ao enviar resposta imediata:', sendError);
        }
      }

      // Responder ao webhook
      res.status(200).json({
        success: true,
        message: 'Mensagem processada com sucesso',
        response: response ? 'Resposta enviada' : 'Adicionada à fila'
      });

    } catch (error) {
      console.error('Erro no webhook WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Enviar mensagem via Evolution API
   */
  async sendMessage(to, message, from) {
    try {
      // Configurações do Evolution API
      const evolutionConfig = {
        baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
        apiKey: process.env.EVOLUTION_API_KEY,
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default'
      };

      // Payload para o Evolution API
      const payload = {
        number: to,
        text: message,
        delay: 1000 // Delay de 1 segundo entre mensagens
      };

      // Headers de autenticação
      const headers = {
        'Content-Type': 'application/json',
        'apikey': evolutionConfig.apiKey
      };

      // Fazer chamada para Evolution API
      const axios = require('axios');
      const response = await axios.post(
        `${evolutionConfig.baseUrl}/message/sendText/${evolutionConfig.instanceName}`,
        payload,
        { headers }
      );

      console.log(`✅ Mensagem enviada para ${to}: ${response.data?.messageId || 'OK'}`);

      return {
        success: true,
        messageId: response.data?.messageId,
        data: response.data
      };

    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem para ${to}:`, error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verificar status da conexão WhatsApp
   * GET /api/whatsapp/status
   */
  async getStatus(req, res) {
    try {
      const businessNumber = req.query.businessNumber;
      const userId = req.user?.id;

      if (!businessNumber && !userId) {
        return res.status(400).json({
          success: false,
          message: 'Business number ou userId obrigatório'
        });
      }

      // Configurações do Evolution API
      const evolutionConfig = {
        baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
        apiKey: process.env.EVOLUTION_API_KEY,
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default'
      };

      // Verificar status da instância
      const axios = require('axios');
      const statusResponse = await axios.get(
        `${evolutionConfig.baseUrl}/instance/connectionState/${evolutionConfig.instanceName}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionConfig.apiKey
          }
        }
      );

      const status = statusResponse.data;

      // Estatísticas das conversas
      const conversationStats = this.conversationService.getConversationStats();
      const queueStats = this.conversationService.getQueueStats();

      res.json({
        success: true,
        whatsapp: {
          connected: status.state === 'connected',
          state: status.state,
          instance: evolutionConfig.instanceName,
          businessNumber: businessNumber
        },
        conversations: conversationStats,
        queue: queueStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao verificar status WhatsApp:', error);

      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status',
        error: error.response?.data || error.message,
        whatsapp: {
          connected: false,
          state: 'unknown'
        }
      });
    }
  }

  /**
   * Enviar mensagem manual
   * POST /api/whatsapp/send
   */
  async sendManualMessage(req, res) {
    try {
      const { to, message, businessNumber } = req.body;
      const userId = req.user?.id;

      // Validações
      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: to, message'
        });
      }

      // Se não especificou businessNumber, usar do usuário logado
      let fromNumber = businessNumber;
      if (!fromNumber && userId) {
        const Usuario = require('../models/Usuario');
        const user = await Usuario.findById(userId);
        fromNumber = user?.whatsapp;
      }

      if (!fromNumber) {
        return res.status(400).json({
          success: false,
          message: 'Business number não encontrado'
        });
      }

      // Enviar mensagem
      const result = await this.sendMessage(to, message, fromNumber);

      res.json({
        success: result.success,
        message: result.success ? 'Mensagem enviada com sucesso' : 'Erro ao enviar mensagem',
        data: result
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem manual:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter estatísticas das conversas
   * GET /api/whatsapp/stats
   */
  async getConversationStats(req, res) {
    try {
      const conversationStats = this.conversationService.getConversationStats();
      const queueStats = this.conversationService.getQueueStats();

      res.json({
        success: true,
        data: {
          conversations: conversationStats,
          queue: queueStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Resetar conversa de um usuário
   * POST /api/whatsapp/reset/:userId
   */
  async resetConversation(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'UserId obrigatório'
        });
      }

      this.conversationService.resetSession(userId);

      res.json({
        success: true,
        message: `Conversa resetada para ${userId}`
      });

    } catch (error) {
      console.error('Erro ao resetar conversa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Limpar filas antigas
   * POST /api/whatsapp/cleanup
   */
  async cleanupQueues(req, res) {
    try {
      // Limpar sessões expiradas
      this.conversationService.cleanupExpiredSessions();

      // Obter estatísticas após limpeza
      const stats = this.conversationService.getQueueStats();

      res.json({
        success: true,
        message: 'Limpeza realizada com sucesso',
        data: stats
      });

    } catch (error) {
      console.error('Erro na limpeza:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Testar webhook
   * POST /api/whatsapp/test-webhook
   */
  async testWebhook(req, res) {
    try {
      const testMessage = {
        from: req.body.from || '5511999999999',
        message: req.body.message || 'Oi, tudo bem?',
        businessNumber: req.body.businessNumber || '5511888888888',
        messageType: 'text',
        timestamp: Date.now()
      };

      console.log('🧪 Testando webhook com:', testMessage);

      // Simular processamento
      const response = await this.conversationService.processMessage(
        testMessage.from,
        testMessage.message,
        testMessage.businessNumber
      );

      res.json({
        success: true,
        message: 'Webhook testado com sucesso',
        testData: testMessage,
        response: response
      });

    } catch (error) {
      console.error('Erro no teste do webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erro no teste',
        error: error.message
      });
    }
  }
}

module.exports = new WhatsappController();
