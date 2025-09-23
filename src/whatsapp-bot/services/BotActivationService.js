const moment = require('moment-timezone');

/**
 * Serviço para controle de ativação do bot WhatsApp
 * Decide quando o bot deve responder baseado em regras configuráveis
 */
class BotActivationService {

  constructor() {
    this.timezone = 'America/Sao_Paulo';
    this.businessHours = null; // desativado

    // Palavras-chave que ativam o bot
    this.activationKeywords = [
      'oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite',
      'agendar', 'agendamento', 'marcar', 'servico', 'serviço',
      'horario', 'horário', 'atendimento', 'consulta',
      'corte', 'penteado', 'manicure', 'pedicure',
      'menu', 'ajuda', 'help', 'iniciar', 'start',
      'confirmar', 'sim', 'não', 'nao', 'voltar',
      'meus agendamentos', 'meus horarios', 'minha agenda',
      'cancelar', 'reagendar', 'alterar'
    ];

    // Padrões regex para ativação
    this.activationPatterns = [
      /^oi\s/i,
      /^olá\s/i,
      /^bom\s+(dia|tarde|noite)/i,
      /^boa\s+(tarde|noite)/i,
      /^quero\s+(agendar|marcar)/i,
      /^gostaria\s+de\s+(agendar|marcar)/i,
      /^posso\s+(agendar|marcar)/i,
      /^como\s+(faço|posso)\s+(para\s+)?(agendar|marcar)/i,
      /^\d+\s*$/, // Apenas números (respostas de menu)
      /^voltar$/i,
      /^menu$/i,
      /^ajuda$/i,
      /^help$/i
    ];

    // Configurações de ativação
    this.settings = {
      autoActivateAfterHours: false,
      respondToUnknownMessages: false,
      activationTimeoutMinutes: 5, // manter conversa ativa por 5 minutos após atividade
      maxInactiveMessages: 5
    };

    // Estado de conversas ativas
    this.activeConversations = new Map(); // phoneNumber -> conversationState
    this.inactiveCounters = new Map(); // phoneNumber -> inactiveMessageCount
  }

  /**
   * Verifica se o bot deve responder a uma mensagem
   * @param {string} phoneNumber - Número do telefone
   * @param {string} message - Conteúdo da mensagem
   * @param {Object} messageContext - Contexto adicional da mensagem
   * @returns {Object} - { shouldRespond: boolean, reason: string, confidence: number }
   */
  shouldRespond(phoneNumber, message, messageContext = {}) {
    const rawMessage = (message || '').toLowerCase().trim();
    const normalizedMessage = this.normalizeMessage(message);

    // Verificar se é uma conversa já ativa
    if (this.isActiveConversation(phoneNumber)) {
      this.updateConversationActivity(phoneNumber);
      return {
        shouldRespond: true,
        reason: 'conversa_ativa',
        confidence: 1.0
      };
    }

    // Ignorar horário comercial: funcionamento somente por gatilho

    // Ativar somente quando a conversa iniciar com o gatilho principal "!bot"
    // Considerar tanto a mensagem bruta quanto a normalizada (que remove pontuação)
    if (rawMessage.startsWith('!bot') || normalizedMessage.startsWith('bot')) {
      this.activateConversation(phoneNumber);
      return {
        shouldRespond: true,
        reason: 'gatilho_bot',
        confidence: 1.0
      };
    }

    // Verificar se deve responder a mensagens desconhecidas
    if (this.settings.respondToUnknownMessages) {
      const inactiveCount = this.inactiveCounters.get(phoneNumber) || 0;

      if (inactiveCount < this.settings.maxInactiveMessages) {
        this.inactiveCounters.set(phoneNumber, inactiveCount + 1);
        return {
          shouldRespond: true,
          reason: 'mensagem_desconhecida',
          confidence: 0.3
        };
      }
    }

    // Não ativar por contexto; apenas via "!bot"

    return {
      shouldRespond: false,
      reason: 'nao_ativado',
      confidence: 0.0
    };
  }

  /**
   * Ativa uma conversa
   */
  activateConversation(phoneNumber) {
    const conversationState = {
      phoneNumber,
      activatedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      messageCount: 0,
      context: {}
    };

    this.activeConversations.set(phoneNumber, conversationState);
    this.inactiveCounters.delete(phoneNumber); // Resetar contador inativo

    console.log(`🤖 Conversa ativada para ${phoneNumber}`);
  }

  /**
   * Desativa uma conversa
   */
  deactivateConversation(phoneNumber) {
    const conversation = this.activeConversations.get(phoneNumber);
    if (conversation) {
      conversation.isActive = false;
      conversation.deactivatedAt = new Date();
      console.log(`🤖 Conversa desativada para ${phoneNumber}`);
    }
  }

  /**
   * Verifica se uma conversa está ativa
   */
  isActiveConversation(phoneNumber) {
    const conversation = this.activeConversations.get(phoneNumber);

    if (!conversation || !conversation.isActive) {
      return false;
    }

    // Verificar timeout
    const now = new Date();
    const timeSinceLastActivity = now - conversation.lastActivity;
    const timeoutMs = this.settings.activationTimeoutMinutes * 60 * 1000;

    if (timeSinceLastActivity > timeoutMs) {
      this.deactivateConversation(phoneNumber);
      return false;
    }

    return true;
  }

  /**
   * Atualiza atividade da conversa
   */
  updateConversationActivity(phoneNumber) {
    const conversation = this.activeConversations.get(phoneNumber);
    if (conversation) {
      conversation.lastActivity = new Date();
      conversation.messageCount++;
    }
  }

  /**
   * Verifica palavras-chave de ativação
   */
  checkActivationKeywords(message) {
    for (const keyword of this.activationKeywords) {
      if (message.includes(keyword)) {
        const confidence = this.calculateKeywordConfidence(keyword, message);
        return {
          found: true,
          keyword,
          confidence
        };
      }
    }

    return { found: false, confidence: 0.0 };
  }

  /**
   * Verifica padrões regex de ativação
   */
  checkActivationPatterns(message) {
    for (const pattern of this.activationPatterns) {
      if (pattern.test(message)) {
        const confidence = this.calculatePatternConfidence(pattern, message);
        return {
          found: true,
          pattern: pattern.toString(),
          confidence
        };
      }
    }

    return { found: false, confidence: 0.0 };
  }

  /**
   * Verifica ativação baseada em contexto
   */
  checkContextActivation(phoneNumber, messageContext) {
    // Verificar se é resposta a uma mensagem anterior do bot
    if (messageContext.isReplyToBot) {
      return {
        shouldActivate: true,
        confidence: 0.9,
        reason: 'resposta_para_bot'
      };
    }

    // Verificar se há contexto de agendamento pendente
    const conversation = this.activeConversations.get(phoneNumber);
    if (conversation && conversation.context.pendingBooking) {
      return {
        shouldActivate: true,
        confidence: 0.8,
        reason: 'agendamento_pendente'
      };
    }

    return {
      shouldActivate: false,
      confidence: 0.0
    };
  }

  /**
   * Calcula confiança baseada na palavra-chave
   */
  calculateKeywordConfidence(keyword, message) {
    // Palavras-chave diretas têm maior confiança
    const highConfidenceKeywords = [
      'agendar', 'agendamento', 'marcar', 'servico', 'serviço',
      'menu', 'ajuda', 'help', 'iniciar', 'start'
    ];

    if (highConfidenceKeywords.includes(keyword)) {
      return 0.9;
    }

    // Saudações têm confiança média
    const mediumConfidenceKeywords = [
      'oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite'
    ];

    if (mediumConfidenceKeywords.includes(keyword)) {
      return 0.7;
    }

    // Outras palavras têm confiança menor
    return 0.5;
  }

  /**
   * Calcula confiança baseada no padrão
   */
  calculatePatternConfidence(pattern, message) {
    // Padrões específicos têm alta confiança
    if (pattern.toString().includes('agendar') || pattern.toString().includes('marcar')) {
      return 0.9;
    }

    // Padrões de saudação têm confiança média
    if (pattern.toString().includes('oi') || pattern.toString().includes('olá')) {
      return 0.7;
    }

    // Outros padrões têm confiança menor
    return 0.6;
  }

  /**
   * Verifica se está dentro do horário comercial
   */
  isWithinBusinessHours() {
    // Sempre tratar como dentro do horário (restrição por gatilho já aplicada)
    return true;
  }

  /**
   * Obtém próximo horário comercial
   */
  getNextBusinessHour() {
    // Não utilizado com modo por gatilho
    return null;
  }

  /**
   * Normaliza mensagem para análise
   */
  normalizeMessage(message) {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Substitui pontuação por espaço
      .replace(/\s+/g, ' '); // Normaliza espaços
  }

  /**
   * Atualiza configurações do serviço
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Atualiza horário comercial
   */
  updateBusinessHours(start, end) {
    this.businessHours = { start, end };
  }

  /**
   * Adiciona palavra-chave de ativação
   */
  addActivationKeyword(keyword) {
    if (!this.activationKeywords.includes(keyword)) {
      this.activationKeywords.push(keyword.toLowerCase());
    }
  }

  /**
   * Remove palavra-chave de ativação
   */
  removeActivationKeyword(keyword) {
    const index = this.activationKeywords.indexOf(keyword.toLowerCase());
    if (index > -1) {
      this.activationKeywords.splice(index, 1);
    }
  }

  /**
   * Obtém estatísticas de ativação
   */
  getActivationStats() {
    const activeCount = Array.from(this.activeConversations.values())
      .filter(conv => conv.isActive).length;

    const inactiveCount = this.activeConversations.size - activeCount;

    return {
      activeConversations: activeCount,
      inactiveConversations: inactiveCount,
      totalConversations: this.activeConversations.size,
      inactiveCounters: this.inactiveCounters.size
    };
  }

  /**
   * Lista conversas ativas
   */
  getActiveConversations() {
    return Array.from(this.activeConversations.values())
      .filter(conv => conv.isActive)
      .map(conv => ({
        phoneNumber: conv.phoneNumber,
        activatedAt: conv.activatedAt,
        lastActivity: conv.lastActivity,
        messageCount: conv.messageCount
      }));
  }

  /**
   * Limpa conversas inativas antigas
   */
  cleanupInactiveConversations(maxAgeHours = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    for (const [phoneNumber, conversation] of this.activeConversations) {
      if (!conversation.isActive && conversation.deactivatedAt < cutoffTime) {
        this.activeConversations.delete(phoneNumber);
      }
    }

    // Limpar contadores inativos antigos
    for (const [phoneNumber, count] of this.inactiveCounters) {
      if (!this.activeConversations.has(phoneNumber)) {
        const lastActivity = this.getLastActivity(phoneNumber);
        if (!lastActivity || lastActivity < cutoffTime) {
          this.inactiveCounters.delete(phoneNumber);
        }
      }
    }
  }

  /**
   * Obtém última atividade de um número
   */
  getLastActivity(phoneNumber) {
    const conversation = this.activeConversations.get(phoneNumber);
    return conversation ? conversation.lastActivity : null;
  }

  /**
   * Força ativação de conversa (para uso administrativo)
   */
  forceActivateConversation(phoneNumber, context = {}) {
    const conversationState = {
      phoneNumber,
      activatedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      messageCount: 0,
      context,
      forced: true
    };

    this.activeConversations.set(phoneNumber, conversationState);
    console.log(`🔧 Conversa forçadamente ativada para ${phoneNumber}`);
  }
}

module.exports = new BotActivationService();


