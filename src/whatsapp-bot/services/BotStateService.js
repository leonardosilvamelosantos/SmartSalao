/**
 * Serviço para gerenciamento de estado das conversas do bot WhatsApp
 * Mantém o contexto e fluxo de conversas individuais
 */
class BotStateService {

  constructor() {
    // Estados das conversas: phoneNumber -> state
    this.conversationStates = new Map();

    // Timeout para limpeza de estados antigos (2 horas)
    this.stateTimeoutMs = 2 * 60 * 60 * 1000;

    // Estados possíveis do bot
    this.states = {
      INITIAL: 'INITIAL',
      WAITING_SERVICE_SELECTION: 'WAITING_SERVICE_SELECTION',
      WAITING_DATE_TIME: 'WAITING_DATE_TIME',
      WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
      WAITING_CUSTOMER_INFO: 'WAITING_CUSTOMER_INFO',
      WAITING_DAY_SELECTION: 'WAITING_DAY_SELECTION',
      WAITING_TIME_SELECTION: 'WAITING_TIME_SELECTION',
      WAITING_ADD_MORE: 'WAITING_ADD_MORE',
      BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
      VIEWING_BOOKINGS: 'VIEWING_BOOKINGS',
      HELP_REQUESTED: 'HELP_REQUESTED',
      ERROR_STATE: 'ERROR_STATE'
    };

    // Dados temporários das conversas
    this.temporaryData = new Map();

    // Pilha de navegação por conversa (para voltar)
    this.navigationStacks = new Map(); // phoneNumber -> [{ state, data }]
  }

  /**
   * Obtém estado atual de uma conversa
   * @param {string} phoneNumber - Número do telefone
   * @returns {Object} - Estado da conversa
   */
  getConversationState(phoneNumber) {
    let state = this.conversationStates.get(phoneNumber);

    if (!state) {
      // Criar estado inicial
      state = this.createInitialState(phoneNumber);
      this.conversationStates.set(phoneNumber, state);
    }

    // Verificar se estado expirou
    if (this.isStateExpired(state)) {
      state = this.resetState(phoneNumber);
    }

    return state;
  }

  /**
   * Atualiza estado de uma conversa
   * @param {string} phoneNumber - Número do telefone
   * @param {Object} updates - Atualizações do estado
   */
  updateConversationState(phoneNumber, updates) {
    const currentState = this.getConversationState(phoneNumber);
    const newState = {
      ...currentState,
      ...updates,
      lastActivity: new Date()
    };

    this.conversationStates.set(phoneNumber, newState);
    return newState;
  }

  /**
   * Define próximo estado baseado na ação
   * @param {string} phoneNumber - Número do telefone
   * @param {string} action - Ação realizada
   * @param {Object} data - Dados adicionais
   */
  setNextState(phoneNumber, action, data = {}) {
    const currentState = this.getConversationState(phoneNumber);
    let nextState;

    switch (action) {
      case 'START_CONVERSATION':
        nextState = this.states.INITIAL;
        break;

      case 'REQUEST_SERVICES':
        nextState = this.states.WAITING_SERVICE_SELECTION;
        this.setTemporaryData(phoneNumber, 'availableServices', data.services);
        break;

      case 'SELECT_SERVICE':
        nextState = this.states.WAITING_DATE_TIME;
        this.setTemporaryData(phoneNumber, 'selectedService', data.service);
        break;

      case 'REQUEST_DATE_TIME':
        nextState = this.states.WAITING_DATE_TIME;
        this.setTemporaryData(phoneNumber, 'serviceSlots', data.slots);
        break;

      case 'WAITING_DAY_SELECTION':
        nextState = this.states.WAITING_DAY_SELECTION;
        if (data.days) this.setTemporaryData(phoneNumber, 'days', data.days);
        if (data.service) this.setTemporaryData(phoneNumber, 'service', data.service);
        if (data.barberUserId) this.setTemporaryData(phoneNumber, 'barberUserId', data.barberUserId);
        break;

      case 'WAITING_TIME_SELECTION':
        nextState = this.states.WAITING_TIME_SELECTION;
        if (data.slots) this.setTemporaryData(phoneNumber, 'slots', data.slots);
        if (data.chosenDay) this.setTemporaryData(phoneNumber, 'chosenDay', data.chosenDay);
        if (data.service) this.setTemporaryData(phoneNumber, 'service', data.service);
        if (data.barberUserId) this.setTemporaryData(phoneNumber, 'barberUserId', data.barberUserId);
        // Ao entrar na seleção de horário, limpar 'days' para evitar conflito de interpretação numérica
        this.setTemporaryData(phoneNumber, 'days', null);
        break;

      case 'WAITING_ADD_MORE':
        nextState = this.states.WAITING_ADD_MORE;
        if (data.bookingData) this.setTemporaryData(phoneNumber, 'bookingData', data.bookingData);
        if (data.selectedTime) this.setTemporaryData(phoneNumber, 'selectedTime', data.selectedTime);
        break;

      case 'SELECT_DATE_TIME':
        nextState = this.states.WAITING_CONFIRMATION;
        this.setTemporaryData(phoneNumber, 'selectedSlot', data.slot);
        this.setTemporaryData(phoneNumber, 'bookingData', data.bookingData);
        break;

      case 'REQUEST_CONFIRMATION':
        nextState = this.states.WAITING_CONFIRMATION;
        break;

      case 'CONFIRM_BOOKING':
        nextState = this.states.BOOKING_CONFIRMED;
        this.clearTemporaryData(phoneNumber);
        break;

      case 'VIEW_BOOKINGS':
        nextState = this.states.VIEWING_BOOKINGS;
        this.setTemporaryData(phoneNumber, 'customerBookings', data.bookings);
        break;

      case 'REQUEST_HELP':
        nextState = this.states.HELP_REQUESTED;
        break;

      case 'BACK_TO_MENU':
        nextState = this.states.INITIAL;
        this.clearTemporaryData(phoneNumber);
        break;

      case 'ERROR_OCCURRED':
        nextState = this.states.ERROR_STATE;
        this.setTemporaryData(phoneNumber, 'error', data.error);
        break;

      default:
        nextState = currentState.currentState;
    }

    const updated = this.updateConversationState(phoneNumber, {
      currentState: nextState,
      previousState: currentState.currentState,
      lastAction: action,
      lastActionData: data
    });

    // Empilhar navegação (evitar empilhar estados de erro/HELP repetidamente)
    if (!['ERROR_STATE'].includes(nextState)) {
      const stack = this.navigationStacks.get(phoneNumber) || [];
      stack.push({ state: nextState, data });
      this.navigationStacks.set(phoneNumber, stack.slice(-10)); // limitar histórico
    }
    return updated;
  }

  goBack(phoneNumber, steps = 1) {
    const stack = this.navigationStacks.get(phoneNumber) || [];
    while (steps-- > 0 && stack.length > 1) {
      stack.pop();
    }
    const target = stack[stack.length - 1] || { state: this.states.INITIAL, data: {} };
    this.navigationStacks.set(phoneNumber, stack);
    return this.updateConversationState(phoneNumber, {
      currentState: target.state,
      lastAction: 'NAV_BACK',
      lastActionData: target.data
    });
  }

  /**
   * Obtém dados temporários de uma conversa
   * @param {string} phoneNumber - Número do telefone
   * @param {string} key - Chave dos dados (opcional)
   */
  getTemporaryData(phoneNumber, key = null) {
    const data = this.temporaryData.get(phoneNumber) || {};

    if (key) {
      return data[key] || null;
    }

    return data;
  }

  /**
   * Define dados temporários para uma conversa
   * @param {string} phoneNumber - Número do telefone
   * @param {string} key - Chave dos dados
   * @param {any} value - Valor dos dados
   */
  setTemporaryData(phoneNumber, key, value) {
    let data = this.temporaryData.get(phoneNumber) || {};
    data[key] = value;
    this.temporaryData.set(phoneNumber, data);
  }

  /**
   * Remove dados temporários de uma conversa
   * @param {string} phoneNumber - Número do telefone
   * @param {string} key - Chave específica (opcional)
   */
  clearTemporaryData(phoneNumber, key = null) {
    if (key) {
      let data = this.temporaryData.get(phoneNumber) || {};
      delete data[key];
      if (Object.keys(data).length === 0) {
        this.temporaryData.delete(phoneNumber);
      } else {
        this.temporaryData.set(phoneNumber, data);
      }
    } else {
      this.temporaryData.delete(phoneNumber);
    }
  }

  /**
   * Cria estado inicial para nova conversa
   */
  createInitialState(phoneNumber) {
    return {
      phoneNumber,
      currentState: this.states.INITIAL,
      previousState: null,
      createdAt: new Date(),
      lastActivity: new Date(),
      lastAction: null,
      lastActionData: null,
      messageCount: 0,
      errorCount: 0,
      context: {}
    };
  }

  /**
   * Reseta estado da conversa
   */
  resetState(phoneNumber) {
    const newState = this.createInitialState(phoneNumber);
    this.conversationStates.set(phoneNumber, newState);
    this.clearTemporaryData(phoneNumber);
    return newState;
  }

  /**
   * Verifica se estado expirou
   */
  isStateExpired(state) {
    const now = new Date();
    const timeSinceLastActivity = now - state.lastActivity;
    return timeSinceLastActivity > this.stateTimeoutMs;
  }

  /**
   * Obtém contexto atual da conversa
   */
  getConversationContext(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    const tempData = this.getTemporaryData(phoneNumber);

    return {
      currentState: state.currentState,
      previousState: state.previousState,
      lastAction: state.lastAction,
      messageCount: state.messageCount,
      errorCount: state.errorCount,
      temporaryData: tempData,
      isActive: !this.isStateExpired(state)
    };
  }

  /**
   * Adiciona contexto personalizado à conversa
   */
  setConversationContext(phoneNumber, key, value) {
    const state = this.getConversationState(phoneNumber);
    state.context[key] = value;
    this.updateConversationState(phoneNumber, { context: state.context });
  }

  /**
   * Obtém contexto personalizado da conversa
   */
  getConversationContextValue(phoneNumber, key) {
    const state = this.getConversationState(phoneNumber);
    return state.context[key] || null;
  }

  /**
   * Incrementa contador de mensagens
   */
  incrementMessageCount(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    state.messageCount++;
    this.updateConversationState(phoneNumber, { messageCount: state.messageCount });
  }

  /**
   * Incrementa contador de erros
   */
  incrementErrorCount(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    state.errorCount++;
    this.updateConversationState(phoneNumber, { errorCount: state.errorCount });
  }

  /**
   * Reseta contador de erros
   */
  resetErrorCount(phoneNumber) {
    this.updateConversationState(phoneNumber, { errorCount: 0 });
  }

  /**
   * Verifica se conversa está em estado de erro
   */
  isInErrorState(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    return state.currentState === this.states.ERROR_STATE;
  }

  /**
   * Obtém estatísticas das conversas
   */
  getConversationStats() {
    const stats = {
      totalConversations: this.conversationStates.size,
      activeConversations: 0,
      errorConversations: 0,
      stateDistribution: {},
      averageMessageCount: 0,
      totalMessages: 0
    };

    let totalMessageCount = 0;

    for (const [phoneNumber, state] of this.conversationStates) {
      if (!this.isStateExpired(state)) {
        stats.activeConversations++;
      }

      if (state.currentState === this.states.ERROR_STATE) {
        stats.errorConversations++;
      }

      // Contar distribuição de estados
      const stateName = state.currentState;
      stats.stateDistribution[stateName] = (stats.stateDistribution[stateName] || 0) + 1;

      totalMessageCount += state.messageCount;
    }

    stats.totalMessages = totalMessageCount;
    stats.averageMessageCount = stats.totalConversations > 0
      ? (totalMessageCount / stats.totalConversations).toFixed(2)
      : 0;

    return stats;
  }

  /**
   * Lista conversas ativas
   */
  getActiveConversations() {
    const active = [];

    for (const [phoneNumber, state] of this.conversationStates) {
      if (!this.isStateExpired(state)) {
        active.push({
          phoneNumber,
          currentState: state.currentState,
          lastActivity: state.lastActivity,
          messageCount: state.messageCount,
          errorCount: state.errorCount
        });
      }
    }

    return active.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Lista conversas com erro
   */
  getErrorConversations() {
    const errors = [];

    for (const [phoneNumber, state] of this.conversationStates) {
      if (state.currentState === this.states.ERROR_STATE) {
        errors.push({
          phoneNumber,
          errorCount: state.errorCount,
          lastActivity: state.lastActivity,
          error: this.getTemporaryData(phoneNumber, 'error')
        });
      }
    }

    return errors;
  }

  /**
   * Remove conversa (para limpeza)
   */
  removeConversation(phoneNumber) {
    this.conversationStates.delete(phoneNumber);
    this.clearTemporaryData(phoneNumber);
  }

  /**
   * Limpa conversas expiradas
   */
  cleanupExpiredConversations() {
    const toRemove = [];

    for (const [phoneNumber, state] of this.conversationStates) {
      if (this.isStateExpired(state)) {
        toRemove.push(phoneNumber);
      }
    }

    toRemove.forEach(phoneNumber => {
      this.removeConversation(phoneNumber);
    });

    return toRemove.length;
  }

  /**
   * Exporta estado para backup/debugging
   */
  exportState(phoneNumber = null) {
    if (phoneNumber) {
      return {
        conversationState: this.conversationStates.get(phoneNumber),
        temporaryData: this.getTemporaryData(phoneNumber)
      };
    }

    const allStates = {};
    for (const [phone, state] of this.conversationStates) {
      allStates[phone] = {
        conversationState: state,
        temporaryData: this.getTemporaryData(phone)
      };
    }

    return allStates;
  }

  /**
   * Importa estado de backup
   */
  importState(states) {
    if (states.conversationState && states.temporaryData) {
      // Importação de estado único
      const phoneNumber = states.conversationState.phoneNumber;
      this.conversationStates.set(phoneNumber, states.conversationState);
      this.temporaryData.set(phoneNumber, states.temporaryData);
    } else {
      // Importação de múltiplos estados
      for (const [phoneNumber, stateData] of Object.entries(states)) {
        if (stateData.conversationState) {
          this.conversationStates.set(phoneNumber, stateData.conversationState);
        }
        if (stateData.temporaryData) {
          this.temporaryData.set(phoneNumber, stateData.temporaryData);
        }
      }
    }
  }

  /**
   * Obtém histórico de estados de uma conversa
   */
  getStateHistory(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    return {
      currentState: state.currentState,
      previousState: state.previousState,
      lastAction: state.lastAction,
      lastActionData: state.lastActionData,
      messageCount: state.messageCount,
      errorCount: state.errorCount
    };
  }

  /**
   * Força mudança de estado (para uso administrativo)
   */
  forceStateChange(phoneNumber, newState, data = {}) {
    const forcedState = {
      ...this.createInitialState(phoneNumber),
      currentState: newState,
      forced: true,
      forcedAt: new Date(),
      forcedData: data
    };

    this.conversationStates.set(phoneNumber, forcedState);
    console.log(`🔧 Estado forçado para ${phoneNumber}: ${newState}`);
  }
}

module.exports = new BotStateService();


