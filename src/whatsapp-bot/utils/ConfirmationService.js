/**
 * Serviço para gerenciamento de confirmações de agendamento via WhatsApp
 * Gerencia estados de confirmação e coleta de informações necessárias
 */
class ConfirmationService {

  constructor() {
    this.confirmationStates = new Map(); // phoneNumber -> confirmation data
    this.timeoutDuration = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Inicia processo de confirmação para um agendamento
   * @param {string} phoneNumber - Número do cliente
   * @param {Object} bookingData - Dados do agendamento
   * @returns {Object} - Estado inicial da confirmação
   */
  startConfirmation(phoneNumber, bookingData) {
    const confirmationId = this.generateConfirmationId();

    const confirmationState = {
      id: confirmationId,
      phoneNumber,
      bookingData,
      step: 'CONFIRM_DETAILS',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      lastActivity: new Date(),
      confirmed: false,
      cancelled: false
    };

    this.confirmationStates.set(phoneNumber, confirmationState);

    // Configurar timeout
    setTimeout(() => {
      this.expireConfirmation(phoneNumber);
    }, this.timeoutDuration);

    return confirmationState;
  }

  /**
   * Processa resposta do usuário durante confirmação
   * @param {string} phoneNumber - Número do cliente
   * @param {string} userResponse - Resposta do usuário
   * @returns {Object} - Próximo estado ou resultado final
   */
  processResponse(phoneNumber, userResponse) {
    const state = this.confirmationStates.get(phoneNumber);

    if (!state) {
      return { type: 'ERROR', message: 'Confirmação não encontrada' };
    }

    if (state.cancelled || state.confirmed) {
      return { type: 'ERROR', message: 'Confirmação já finalizada' };
    }

    state.lastActivity = new Date();
    state.attempts++;

    // Verificar se excedeu tentativas máximas
    if (state.attempts > state.maxAttempts) {
      this.cancelConfirmation(phoneNumber);
      return {
        type: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Número máximo de tentativas excedido'
      };
    }

    const normalizedResponse = this.normalizeResponse(userResponse);

    switch (state.step) {
      case 'CONFIRM_DETAILS':
        return this.handleDetailsConfirmation(state, normalizedResponse);

      case 'COLLECT_MISSING_INFO':
        return this.handleMissingInfoCollection(state, normalizedResponse);

      case 'CONFIRM_BOOKING':
        return this.handleBookingConfirmation(state, normalizedResponse);

      default:
        return { type: 'ERROR', message: 'Estado de confirmação inválido' };
    }
  }

  /**
   * Trata confirmação de detalhes do agendamento
   */
  handleDetailsConfirmation(state, response) {
    const positiveResponses = ['sim', 's', 'yes', 'y', 'confirmar', 'ok', 'certo', 'correto'];
    const negativeResponses = ['nao', 'n', 'no', 'não', 'cancelar', 'errado', 'incorreto'];

    if (positiveResponses.includes(response)) {
      // Verificar se há informações faltando
      const missingInfo = this.checkMissingInfo(state.bookingData);

      if (missingInfo.length > 0) {
        state.step = 'COLLECT_MISSING_INFO';
        state.missingInfo = missingInfo;
        state.currentMissingIndex = 0;

        return {
          type: 'COLLECT_INFO',
          message: this.getMissingInfoMessage(missingInfo[0]),
          missingInfo: missingInfo[0]
        };
      } else {
        state.step = 'CONFIRM_BOOKING';
        return {
          type: 'CONFIRM_BOOKING',
          message: this.getFinalConfirmationMessage(state.bookingData)
        };
      }
    } else if (negativeResponses.includes(response)) {
      this.cancelConfirmation(state.phoneNumber);
      return {
        type: 'CANCELLED',
        message: 'Confirmação cancelada pelo usuário'
      };
    } else {
      return {
        type: 'CLARIFY',
        message: this.getClarificationMessage(state.bookingData)
      };
    }
  }

  /**
   * Trata coleta de informações faltantes
   */
  handleMissingInfoCollection(state, response) {
    const currentMissing = state.missingInfo[state.currentMissingIndex];

    // Processar resposta baseada no tipo de informação faltante
    const processedValue = this.processMissingInfoResponse(currentMissing, response);

    if (processedValue) {
      // Atualizar dados do agendamento
      state.bookingData[currentMissing.field] = processedValue;
      state.currentMissingIndex++;

      // Verificar se há mais informações para coletar
      if (state.currentMissingIndex < state.missingInfo.length) {
        const nextMissing = state.missingInfo[state.currentMissingIndex];
        return {
          type: 'COLLECT_INFO',
          message: this.getMissingInfoMessage(nextMissing),
          missingInfo: nextMissing
        };
      } else {
        // Todas as informações coletadas, confirmar agendamento
        state.step = 'CONFIRM_BOOKING';
        return {
          type: 'CONFIRM_BOOKING',
          message: this.getFinalConfirmationMessage(state.bookingData)
        };
      }
    } else {
      return {
        type: 'INVALID_RESPONSE',
        message: this.getInvalidResponseMessage(currentMissing)
      };
    }
  }

  /**
   * Trata confirmação final do agendamento
   */
  handleBookingConfirmation(state, response) {
    const positiveResponses = ['sim', 's', 'yes', 'y', 'confirmar', 'ok', 'agendar'];

    if (positiveResponses.includes(response)) {
      state.confirmed = true;
      return {
        type: 'CONFIRMED',
        message: 'Agendamento confirmado com sucesso!',
        bookingData: state.bookingData
      };
    } else {
      return {
        type: 'CLARIFY_CONFIRMATION',
        message: 'Responda apenas "sim" para confirmar ou "não" para cancelar.'
      };
    }
  }

  /**
   * Verifica informações faltantes no agendamento
   */
  checkMissingInfo(bookingData) {
    const missing = [];

    if (!bookingData.serviceName) {
      missing.push({
        field: 'serviceName',
        type: 'service',
        message: 'Qual serviço você deseja agendar?'
      });
    }

    if (!bookingData.dateTime) {
      missing.push({
        field: 'dateTime',
        type: 'datetime',
        message: 'Qual data e horário você prefere?'
      });
    }

    if (!bookingData.customerName) {
      missing.push({
        field: 'customerName',
        type: 'text',
        message: 'Qual é o seu nome?'
      });
    }

    if (!bookingData.customerPhone) {
      missing.push({
        field: 'customerPhone',
        type: 'phone',
        message: 'Confirme seu número de telefone:'
      });
    }

    return missing;
  }

  /**
   * Processa resposta para informação faltante
   */
  processMissingInfoResponse(missingInfo, response) {
    switch (missingInfo.type) {
      case 'service':
        return this.validateServiceResponse(response);

      case 'datetime':
        return this.validateDateTimeResponse(response);

      case 'phone':
        return this.validatePhoneResponse(response);

      case 'text':
      default:
        return response.trim();
    }
  }

  /**
   * Valida resposta de serviço
   */
  validateServiceResponse(response) {
    // Implementar validação baseada nos serviços disponíveis
    // Por enquanto, aceitar qualquer resposta não vazia
    return response.trim() || null;
  }

  /**
   * Valida resposta de data/hora
   */
  validateDateTimeResponse(response) {
    // Implementar validação usando DateParser
    // Por enquanto, aceitar qualquer resposta não vazia
    return response.trim() || null;
  }

  /**
   * Valida resposta de telefone
   */
  validatePhoneResponse(response) {
    const phoneRegex = /^(\+55)?\s*\(?(\d{2})\)?\s*(\d{4,5})\-?(\d{4})$/;
    const match = response.match(phoneRegex);

    if (match) {
      return `+55${match[2]}${match[3]}${match[4]}`;
    }

    return null;
  }

  /**
   * Gera mensagens para coleta de informações
   */
  getMissingInfoMessage(missingInfo) {
    return `ℹ️ ${missingInfo.message}`;
  }

  /**
   * Gera mensagem de confirmação final
   */
  getFinalConfirmationMessage(bookingData) {
    return `📋 Confirme os dados do agendamento:

🛍️ Serviço: ${bookingData.serviceName || 'Não informado'}
📅 Data/Hora: ${bookingData.dateTime || 'Não informado'}
👤 Nome: ${bookingData.customerName || 'Não informado'}
📱 Telefone: ${bookingData.customerPhone || 'Não informado'}

✅ Está tudo correto? Responda "sim" para confirmar.`;
  }

  /**
   * Gera mensagem de esclarecimento
   */
  getClarificationMessage(bookingData) {
    return `Não entendi sua resposta. Os dados estão corretos?

🛍️ Serviço: ${bookingData.serviceName || 'Não informado'}
📅 Data/Hora: ${bookingData.dateTime || 'Não informado'}
👤 Nome: ${bookingData.customerName || 'Não informado'}

Responda "sim" se estiver correto ou "não" para corrigir.`;
  }

  /**
   * Gera mensagem para resposta inválida
   */
  getInvalidResponseMessage(missingInfo) {
    let example = '';

    switch (missingInfo.type) {
      case 'phone':
        example = ' (ex: 11987654321)';
        break;
      case 'datetime':
        example = ' (ex: amanhã às 14h)';
        break;
    }

    return `❌ Resposta inválida. ${missingInfo.message}${example}`;
  }

  /**
   * Normaliza resposta do usuário
   */
  normalizeResponse(response) {
    return response
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' '); // Normaliza espaços
  }

  /**
   * Cancela confirmação
   */
  cancelConfirmation(phoneNumber) {
    const state = this.confirmationStates.get(phoneNumber);
    if (state) {
      state.cancelled = true;
      state.cancelledAt = new Date();
    }
  }

  /**
   * Expira confirmação por timeout
   */
  expireConfirmation(phoneNumber) {
    const state = this.confirmationStates.get(phoneNumber);
    if (state && !state.confirmed && !state.cancelled) {
      state.expired = true;
      state.expiredAt = new Date();
      this.confirmationStates.delete(phoneNumber);
    }
  }

  /**
   * Obtém estado atual da confirmação
   */
  getConfirmationState(phoneNumber) {
    return this.confirmationStates.get(phoneNumber);
  }

  /**
   * Remove estado de confirmação
   */
  removeConfirmation(phoneNumber) {
    this.confirmationStates.delete(phoneNumber);
  }

  /**
   * Lista todas as confirmações ativas
   */
  getActiveConfirmations() {
    const active = [];
    for (const [phoneNumber, state] of this.confirmationStates) {
      if (!state.confirmed && !state.cancelled && !state.expired) {
        active.push({
          phoneNumber,
          ...state
        });
      }
    }
    return active;
  }

  /**
   * Gera ID único para confirmação
   */
  generateConfirmationId() {
    return `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpa confirmações expiradas
   */
  cleanupExpiredConfirmations() {
    const now = Date.now();
    for (const [phoneNumber, state] of this.confirmationStates) {
      if (state.createdAt.getTime() + this.timeoutDuration < now) {
        this.expireConfirmation(phoneNumber);
      }
    }
  }
}

module.exports = new ConfirmationService();


