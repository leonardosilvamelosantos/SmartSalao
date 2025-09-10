const axios = require('axios');

/**
 * Serviço de integração com WhatsApp Business API
 * Prepara a estrutura para envio e recebimento de mensagens
 */
class WhatsappService {
  constructor() {
    this.baseURL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  }

  /**
   * Enviar mensagem de texto simples
   */
  async sendTextMessage(to, message) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('Configuração do WhatsApp não encontrada');
      }

      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        response: response.data
      };

    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
      throw new Error('Falha ao enviar mensagem WhatsApp');
    }
  }

  /**
   * Enviar mensagem interativa com botões
   */
  async sendInteractiveMessage(to, message, buttons) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('Configuração do WhatsApp não encontrada');
      }

      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message
          },
          action: {
            buttons: buttons.map((button, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index + 1}`,
                title: button.title
              }
            }))
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        response: response.data
      };

    } catch (error) {
      console.error('Erro ao enviar mensagem interativa:', error.response?.data || error.message);
      throw new Error('Falha ao enviar mensagem interativa');
    }
  }

  /**
   * Enviar mensagem com lista de opções
   */
  async sendListMessage(to, message, sections) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('Configuração do WhatsApp não encontrada');
      }

      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: message
          },
          action: {
            button: 'Ver opções',
            sections: sections
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        response: response.data
      };

    } catch (error) {
      console.error('Erro ao enviar mensagem com lista:', error.response?.data || error.message);
      throw new Error('Falha ao enviar mensagem com lista');
    }
  }

  /**
   * Processar webhook do WhatsApp
   */
  processWebhook(payload) {
    try {
      const { entry } = payload;

      if (!entry || !entry[0]?.changes) {
        return { success: false, message: 'Payload inválido' };
      }

      const changes = entry[0].changes[0];
      const messages = changes.value?.messages;

      if (!messages || messages.length === 0) {
        return { success: false, message: 'Nenhuma mensagem encontrada' };
      }

      const message = messages[0];
      const from = message.from; // Número do cliente
      const messageType = message.type;
      const messageId = message.id;

      let messageContent = '';

      switch (messageType) {
        case 'text':
          messageContent = message.text?.body;
          break;
        case 'interactive':
          messageContent = message.interactive?.button_reply?.id ||
                          message.interactive?.list_reply?.id;
          break;
        default:
          messageContent = `Tipo de mensagem não suportado: ${messageType}`;
      }

      return {
        success: true,
        from,
        messageType,
        messageId,
        content: messageContent,
        rawMessage: message
      };

    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return { success: false, message: 'Erro ao processar webhook' };
    }
  }

  /**
   * Verificar token do webhook (para configuração inicial)
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return { success: true, challenge };
    }

    return { success: false, message: 'Token de verificação inválido' };
  }

  /**
   * Enviar mensagem de boas-vindas
   */
  async sendWelcomeMessage(to) {
    const message = `Olá! 👋\n\nBem-vindo ao sistema de agendamento!\n\nComo posso ajudá-lo hoje?`;

    const buttons = [
      { title: 'Agendar Serviço' },
      { title: 'Meus Agendamentos' },
      { title: 'Falar com Atendente' }
    ];

    return await this.sendInteractiveMessage(to, message, buttons);
  }

  /**
   * Enviar lista de serviços disponíveis
   */
  async sendServicesList(to, services) {
    const sections = [{
      title: 'Serviços Disponíveis',
      rows: services.map((service, index) => ({
        id: `service_${service.id_servico}`,
        title: service.nome_servico,
        description: `R$ ${service.valor} - ${service.duracao_min}min`
      }))
    }];

    const message = 'Escolha o serviço desejado:';

    return await this.sendListMessage(to, message, sections);
  }

  /**
   * Enviar horários disponíveis
   */
  async sendAvailableSlots(to, slots, serviceName) {
    const message = `Horários disponíveis para ${serviceName}:\n\n${slots.map(slot =>
      `🕐 ${new Date(slot.start_at).toLocaleString('pt-BR')}`
    ).join('\n')}\n\nResponda com o número do horário desejado.`;

    return await this.sendTextMessage(to, message);
  }

  /**
   * Enviar confirmação de agendamento
   */
  async sendBookingConfirmation(to, bookingDetails) {
    const message = `✅ Agendamento confirmado!\n\n📅 Data: ${bookingDetails.date}\n🕐 Horário: ${bookingDetails.time}\n💇 Serviço: ${bookingDetails.service}\n💰 Valor: R$ ${bookingDetails.value}\n\nObrigado pela preferência!`;

    return await this.sendTextMessage(to, message);
  }

  /**
   * Enviar lembretes de agendamento
   */
  async sendReminder(to, bookingDetails, hoursUntil) {
    const message = `🔔 Lembrete de agendamento!\n\nVocê tem um horário marcado em ${hoursUntil} hora(s):\n\n📅 ${bookingDetails.date}\n🕐 ${bookingDetails.time}\n💇 ${bookingDetails.service}\n📍 ${bookingDetails.location || 'Confirmar local'}`;

    return await this.sendTextMessage(to, message);
  }

  /**
   * Verificar status da integração
   */
  async checkStatus() {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          configured: false,
          message: 'Token de acesso ou ID do número não configurados'
        };
      }

      // Tentar fazer uma requisição simples para verificar se está funcionando
      const response = await axios.get(
        `${this.baseURL}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        configured: true,
        phoneNumberId: this.phoneNumberId,
        status: 'ativo',
        response: response.data
      };

    } catch (error) {
      return {
        configured: true,
        phoneNumberId: this.phoneNumberId,
        status: 'erro',
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new WhatsappService();
