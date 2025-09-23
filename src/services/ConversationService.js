/**
 * Serviço de controle de conversas WhatsApp
 * Gerencia o fluxo de conversas e estados dos usuários
 */
class ConversationService {
  constructor() {
    // ====================
    // CONFIGURAÇÕES CONSTANTES
    // ====================
    this.STATES = {
      IDLE: 'idle',
      WAITING_SERVICE: 'waiting_service',
      WAITING_DATE: 'waiting_date',
      WAITING_TIME: 'waiting_time',
      WAITING_CONFIRMATION: 'waiting_confirmation',
      WAITING_CLIENT_NAME: 'waiting_client_name'
    };

    // Configurações de performance
    this.SESSION_TIMEOUT = parseInt(process.env.CONVERSATION_TIMEOUT) || 30 * 60 * 1000; // 30min
    this.MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE) || 10;
    this.MAX_SIMILAR_MESSAGES = parseInt(process.env.MAX_SIMILAR_MESSAGES) || 3;
    this.QUEUE_CLEANUP_INTERVAL = parseInt(process.env.QUEUE_CLEANUP_INTERVAL) || 5 * 60 * 1000; // 5min

    // ====================
    // ESTRUTURAS DE DADOS
    // ====================
    this.sessions = new Map();
    this.messageQueues = new Map();
    this.processing = new Set();

    // ====================
    // PALAVRAS-CHAVE PARA DETECÇÃO
    // ====================
    this.greetings = [
      'oi', 'oii', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite',
      'tudo bem', 'tudo bom', 'como vai', 'como está',
      'e aí', 'eae', 'salve', 'opa', 'hi', 'hello'
    ];

    // Palavras de confirmação
    this.confirmations = ['sim', 'yes', 'ok', 'confirmar', '1'];

    // Palavras de negação
    this.denials = ['não', 'nao', 'no', 'cancelar', '2'];

    // ====================
    // FLUXO DE CONVERSAS
    // ====================
    this.conversationFlow = {
      idle: {
        message: 'Olá! 😊 Como posso ajudar você hoje?',
        options: ['1. Agendar serviço', '2. Ver meus agendamentos', '3. Cancelar agendamento'],
        nextStates: {
          '1': 'waiting_service',
          '2': 'show_appointments',
          '3': 'cancel_appointment'
        }
      },
      waiting_service: {
        message: 'Por favor, escolha o serviço desejado:',
        dynamic: true,
        requiresInput: true
      },
      waiting_date: {
        message: 'Por favor, informe a data desejada (DD/MM/YYYY):',
        requiresInput: true,
        validation: 'date'
      },
      waiting_time: {
        message: 'Por favor, informe o horário desejado (HH:MM):',
        requiresInput: true,
        validation: 'time'
      },
      waiting_confirmation: {
        message: 'Confirme seu agendamento:',
        requiresInput: true,
        validation: 'confirmation'
      },
      waiting_client_name: {
        message: 'Por favor, informe seu nome completo:',
        requiresInput: true,
        validation: 'name'
      }
    };

    // Iniciar limpeza automática de filas
    this.startQueueCleanup();
  }

  /**
   * Inicia limpeza automática de filas antigas
   */
  startQueueCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      // this.cleanupQueues(); // TODO: Implementar se necessário
    }, this.QUEUE_CLEANUP_INTERVAL);

    // Cleanup na saída do processo
    process.on('SIGINT', () => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
    });

    process.on('SIGTERM', () => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
    });
  }

  /**
   * Limpa sessões expiradas
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, session] of this.sessions) {
      if (now - session.createdAt > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} sessões expiradas removidas`);
    }
  }

  /**
   * Verifica se uma palavra é de confirmação
   */
  isConfirmation(message) {
    const cleanMsg = message.toLowerCase().trim();
    return this.confirmations.some(conf => cleanMsg.includes(conf) || cleanMsg === conf);
  }

  /**
   * Verifica se uma palavra é de negação
   */
  isDenial(message) {
    const cleanMsg = message.toLowerCase().trim();
    return this.denials.some(denial => cleanMsg.includes(denial) || cleanMsg === denial);
  }

  /**
   * Processa resposta rápida para saudações
   */
  getQuickGreetingResponse(message, businessNumber) {
    const cleanMsg = message.toLowerCase().trim();

    // Diferentes tipos de saudação
    if (cleanMsg.includes('bom dia')) {
      return 'Bom dia! ☀️ Como posso ajudar você hoje?';
    }

    if (cleanMsg.includes('boa tarde')) {
      return 'Boa tarde! 🌅 Como posso ajudar você hoje?';
    }

    if (cleanMsg.includes('boa noite')) {
      return 'Boa noite! 🌙 Como posso ajudar você hoje?';
    }

    // Saudação genérica
    return 'Olá! 😊 Como posso ajudar você hoje?';
  }

  /**
   * Obter ou criar sessão do usuário
   */
  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.createSession(userId);
    }

    const session = this.sessions.get(userId);

    // Verificar se a sessão expirou
    if (Date.now() - session.createdAt > this.SESSION_TIMEOUT) {
      this.createSession(userId);
      return this.sessions.get(userId);
    }

    return session;
  }

  /**
   * Criar nova sessão
   */
  createSession(userId) {
    const session = {
      userId: userId,
      state: this.STATES.IDLE,
      data: {}, // Dados temporários da conversa
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(userId, session);
    console.log(`📱 Nova sessão criada para ${userId}`);
  }

  /**
   * Atualizar sessão
   */
  updateSession(userId, updates) {
    const session = this.getSession(userId);
    Object.assign(session, updates);
    session.lastActivity = Date.now();
    this.sessions.set(userId, session);
  }

  /**
   * Processa mensagem recebida com otimizações de performance
   */
  async processMessage(from, message, businessNumber) {
    try {
      // Validação rápida da entrada
      if (!message || typeof message !== 'string') {
        return this.createErrorResponse('Mensagem inválida');
      }

      const cleanMessage = message.trim();
      const cleanFrom = from.replace('@s.whatsapp.net', '');

      console.log(`📨 Mensagem de ${cleanFrom}: ${cleanMessage.substring(0, 50)}...`);

      // Verificar se é uma saudação para resposta imediata
      if (this.isGreeting(cleanMessage)) {
        return {
          message: this.getQuickGreetingResponse(cleanMessage, businessNumber),
          state: this.getSession(cleanFrom).state,
          immediate: true
        };
      }

      // Adicionar à fila de processamento
      await this.addToQueue(cleanFrom, cleanMessage, businessNumber);

      // Iniciar processamento se necessário
      if (!this.processing.has(cleanFrom)) {
        this.processing.add(cleanFrom);
        // Processar de forma assíncrona para não bloquear
        setImmediate(async () => {
          try {
            await this.processQueue(cleanFrom);
          } finally {
            this.processing.delete(cleanFrom);
          }
        });
      }

      // Não retorna resposta imediata para mensagens não-saudações
      return null;

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      return this.createErrorResponse('Erro interno do servidor');
    }
  }

  /**
   * Cria resposta de erro padronizada
   */
  createErrorResponse(message = 'Erro interno do servidor') {
    return {
      message: `❌ ${message}. Tente novamente em alguns instantes.`,
      state: this.STATES.IDLE,
      immediate: true
    };
  }

  /**
   * Adiciona mensagem à fila com otimizações
   */
  async addToQueue(userId, message, businessNumber) {
    // Inicializar fila se não existir
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, []);
    }

    const queue = this.messageQueues.get(userId);
    const now = Date.now();

    // Verificar se mensagem similar já existe na fila recente
    const recentMessages = queue.slice(-this.MAX_SIMILAR_MESSAGES);
    const isDuplicate = recentMessages.some(item =>
      this.areSimilar(item.message, message) &&
      (now - item.timestamp) < 5000 // 5 segundos
    );

    // Não adicionar duplicatas recentes
    if (isDuplicate) {
      console.log(`🚫 Mensagem duplicada ignorada para ${userId}`);
      return;
    }

    // Adicionar nova mensagem
    queue.push({
      message: message,
      businessNumber,
      timestamp: now,
      id: `${userId}_${now}_${Math.random().toString(36).substr(2, 9)}`,
      processed: false
    });

    // Limitar tamanho da fila com rotação inteligente
    if (queue.length > this.MAX_QUEUE_SIZE) {
      // Manter as mensagens mais recentes e remover antigas processadas
      const processedMessages = queue.filter(msg => msg.processed);
      const unprocessedMessages = queue.filter(msg => !msg.processed);

      // Manter todas não processadas + últimas processadas
      const keepProcessed = processedMessages.slice(-(this.MAX_QUEUE_SIZE - unprocessedMessages.length));
      this.messageQueues.set(userId, [...keepProcessed, ...unprocessedMessages]);
    }
  }

  /**
   * Processar fila de mensagens sequencialmente
   */
  async processQueue(userId) {
    const queue = this.messageQueues.get(userId);
    if (!queue || queue.length === 0) return;

    // Pegar primeira mensagem não processada
    const pendingMessages = queue.filter(msg => !msg.processed);

    for (const queuedMessage of pendingMessages) {
      try {
        // Marcar como processada
        queuedMessage.processed = true;

        // Obter sessão do usuário
        const session = this.getSession(userId);

        // Verificar se é cliente novo
        const isNewClient = await this.isNewClient(userId, queuedMessage.businessNumber);

        if (isNewClient && session.state === this.STATES.IDLE) {
          session.state = this.STATES.WAITING_CLIENT_NAME;
          session.data.newClient = true;
        }

        // Processar mensagem baseada no estado atual
        const response = await this.handleMessage(session, queuedMessage.message, queuedMessage.businessNumber);

        // Atualizar sessão
        this.updateSession(userId, session);

        // Enviar resposta via WhatsApp
        if (response && response.message) {
          await this.sendResponse(userId, response.message, queuedMessage.businessNumber);
        }

        // Pequena pausa entre mensagens (evitar flood)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Erro ao processar mensagem da fila ${queuedMessage.id}:`, error);
      }
    }

    // Limpar mensagens antigas da fila
    this.cleanupQueue(userId);
  }

  /**
   * Enviar resposta via WhatsApp (Baileys)
   */
  async sendResponse(to, message, businessNumber) {
    try {
      console.log(`📤 Enviando resposta para ${to}: ${message.substring(0, 50)}...`);

      // Usar o controlador WhatsApp que agora usa Baileys
      const WhatsappController = require('../controllers/WhatsappController');
      const result = await WhatsappController.sendMessageViaBaileys(to, message, businessNumber);

      if (result.success) {
        console.log(`✅ Resposta enviada via Baileys para ${to}`);
      } else {
        console.error(`❌ Erro ao enviar resposta via Baileys: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar se é uma saudação
   */
  isGreeting(message) {
    const cleanMessage = message.toLowerCase().trim();

    // Verificar se contém palavras de saudação
    return this.greetings.some(greeting =>
      cleanMessage.includes(greeting) ||
      cleanMessage === greeting
    );
  }

  /**
   * Gerar resposta para saudação
   */
  async getGreetingResponse(message, businessNumber) {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour >= 6 && hour < 12) {
      timeGreeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Boa tarde';
    } else {
      timeGreeting = 'Boa noite';
    }

    // Verificar se usuário já tem sessão ativa
    const session = this.sessions.get(message.from || 'unknown');
    const hasActiveSession = session && session.state !== this.STATES.IDLE;

    if (hasActiveSession) {
      return `${timeGreeting}! 😊\n\nVocê estava no meio de um agendamento. Vamos continuar de onde paramos?\n\n${this.getWelcomeMessage()}`;
    }

    // Saudação normal com menu
    return `${timeGreeting}! 😊\n\n${this.getWelcomeMessage()}\n\n1. Agendar serviço\n2. Ver meus agendamentos\n3. Cancelar agendamento`;
  }

  /**
   * Agrupa mensagens similares de forma otimizada
   */
  groupSimilarMessages(messages) {
    if (!messages || messages.length === 0) return [];
    if (messages.length === 1) return [messages];

    const groups = [];
    const processed = new Set();

    // Processar em ordem cronológica (mais eficiente)
    for (let i = 0; i < messages.length; i++) {
      if (processed.has(i)) continue;

      const currentMessage = messages[i];
      const group = [currentMessage];
      processed.add(i);

      // Limitar busca para próximas mensagens (otimização)
      const searchLimit = Math.min(i + this.MAX_SIMILAR_MESSAGES + 1, messages.length);

      // Procurar mensagens similares apenas nas próximas
      for (let j = i + 1; j < searchLimit; j++) {
        if (processed.has(j)) continue;

        if (this.areSimilar(currentMessage.message, messages[j].message)) {
          group.push(messages[j]);
          processed.add(j);

          // Se grupo ficou grande, parar de buscar (otimização)
          if (group.length >= this.MAX_SIMILAR_MESSAGES) break;
        }
      }

      groups.push(group);

      // Limitar número de grupos para evitar processamento excessivo
      if (groups.length >= 5) {
        // Adicionar mensagens restantes como grupos individuais
        for (let k = i + 1; k < messages.length; k++) {
          if (!processed.has(k)) {
            groups.push([messages[k]]);
          }
        }
        break;
      }
    }

    return groups;
  }

  /**
   * Verifica se duas mensagens são similares (otimizado)
   */
  areSimilar(msg1, msg2) {
    // Validação rápida
    if (!msg1 || !msg2) return false;

    const clean1 = msg1.toLowerCase().trim();
    const clean2 = msg2.toLowerCase().trim();

    // Mesmas mensagens (comparação exata)
    if (clean1 === clean2) return true;

    // Saudação + pergunta (otimizado)
    const isGreeting1 = this.isGreeting(clean1);
    const isGreeting2 = this.isGreeting(clean2);

    if (isGreeting1 && isGreeting2) return true;
    if (isGreeting1 || isGreeting2) return false; // Uma saudação, outra não

    // Comparação de palavras (otimizada)
    const words1 = clean1.split(/\s+/).slice(0, 3);
    const words2 = clean2.split(/\s+/).slice(0, 3);

    if (words1.length < 2 || words2.length < 2) return false;

    // Contar palavras comuns de forma eficiente
    let commonCount = 0;
    const wordSet1 = new Set(words1);

    for (const word of words2) {
      if (wordSet1.has(word)) {
        commonCount++;
        if (commonCount >= 2) return true; // Otimização: sair cedo
      }
    }

    return false;
  }

  /**
   * Limpar fila de mensagens antigas
   */
  cleanupQueue(userId) {
    const queue = this.messageQueues.get(userId);
    if (!queue) return;

    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    // Remover mensagens antigas
    const filteredQueue = queue.filter(msg => (now - msg.timestamp) < maxAge);

    if (filteredQueue.length === 0) {
      this.messageQueues.delete(userId);
    } else {
      this.messageQueues.set(userId, filteredQueue);
    }
  }

  /**
   * Obter estatísticas da fila
   */
  getQueueStats() {
    const stats = {
      totalQueues: this.messageQueues.size,
      totalMessages: 0,
      queuesBySize: {},
      oldestMessage: null,
      newestMessage: null
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const [userId, queue] of this.messageQueues) {
      stats.totalMessages += queue.length;

      const size = queue.length.toString();
      stats.queuesBySize[size] = (stats.queuesBySize[size] || 0) + 1;

      queue.forEach(msg => {
        if (msg.timestamp < oldestTime) oldestTime = msg.timestamp;
        if (msg.timestamp > newestTime) newestTime = msg.timestamp;
      });
    }

    if (stats.totalMessages > 0) {
      stats.oldestMessage = new Date(oldestTime).toISOString();
      stats.newestMessage = new Date(newestTime).toISOString();
    }

    return stats;
  }

  /**
   * Processar mensagens em lote (para otimizações)
   */
  async processBatch(userId) {
    const queue = this.messageQueues.get(userId);
    if (!queue || queue.length === 0) return;

    // Agrupar mensagens similares
    const groups = this.groupSimilarMessages(queue.filter(msg => !msg.processed));

    for (const group of groups) {
      if (group.length === 1) {
        // Processar normalmente
        await this.processSingleMessage(userId, group[0]);
      } else {
        // Processar como lote
        await this.processMessageGroup(userId, group);
      }
    }
  }

  /**
   * Processar uma única mensagem da fila
   */
  async processSingleMessage(userId, message) {
    try {
      // Marcar como processada
      message.processed = true;

      // Obter sessão do usuário
      const session = this.getSession(userId);

      // Verificar se é cliente novo
      const isNewClient = await this.isNewClient(userId, message.businessNumber);

      if (isNewClient && session.state === this.STATES.IDLE) {
        session.state = this.STATES.WAITING_CLIENT_NAME;
        session.data.newClient = true;
      }

      // Processar mensagem baseada no estado atual
      const response = await this.handleMessage(session, message.message, message.businessNumber);

      // Atualizar sessão
      this.updateSession(userId, session);

      // Enviar resposta via WhatsApp
      if (response && response.message) {
        await this.sendResponse(userId, response.message, message.businessNumber);
      }

    } catch (error) {
      console.error(`Erro ao processar mensagem única ${message.id}:`, error);
    }
  }

  /**
   * Processar grupo de mensagens similares
   */
  async processMessageGroup(userId, messages) {
    console.log(`📦 Processando grupo de ${messages.length} mensagens similares para ${userId}`);

    // Pegar a primeira mensagem do grupo
    const firstMessage = messages[0];

    // Marcar todas como processadas
    messages.forEach(msg => msg.processed = true);

    // Processar apenas a primeira
    const session = this.getSession(userId);
    const response = await this.handleMessage(session, firstMessage.message, firstMessage.businessNumber);

    this.updateSession(userId, session);

    if (response && response.message) {
      await this.sendResponse(userId, response.message, firstMessage.businessNumber);
    }
  }

  /**
   * Processar mensagem baseada no estado
   */
  async handleMessage(session, message, businessNumber) {
    const currentState = session.state;
    const cleanMessage = message.trim().toLowerCase();

    // Se está aguardando nome do cliente novo
    if (currentState === this.STATES.WAITING_CLIENT_NAME) {
      return await this.handleNewClient(session, message, businessNumber);
    }

    // Processar baseado no estado atual
    switch (currentState) {
      case this.STATES.IDLE:
        return this.handleIdleState(session, cleanMessage);

      case this.STATES.WAITING_SERVICE:
        return await this.handleServiceSelection(session, cleanMessage, businessNumber);

      case this.STATES.WAITING_DATE:
        return this.handleDateSelection(session, message);

      case this.STATES.WAITING_TIME:
        return await this.handleTimeSelection(session, message, businessNumber);

      case this.STATES.WAITING_CONFIRMATION:
        return await this.handleConfirmation(session, cleanMessage, businessNumber);

      default:
        return {
          message: 'Estado desconhecido. Voltando ao início.',
          state: this.STATES.IDLE
        };
    }
  }

  /**
   * Processar estado inicial
   */
  handleIdleState(session, message) {
    const flow = this.conversationFlow[this.STATES.IDLE];

    if (message === '1' || message.includes('agendar') || message.includes('marcar')) {
      session.state = this.STATES.WAITING_SERVICE;
      return {
        message: 'Excelente! Vamos agendar um serviço.\n\n' + this.getServiceSelectionMessage(session.data.businessNumber),
        state: this.STATES.WAITING_SERVICE
      };
    }

    if (message === '2' || message.includes('ver') || message.includes('meus')) {
      return this.handleShowAppointments(session);
    }

    if (message === '3' || message.includes('cancelar')) {
      return this.handleCancelAppointment(session);
    }

    // Comando não reconhecido
    return {
      message: 'Opção inválida. ' + flow.message + '\n\n' + flow.options.join('\n'),
      state: this.STATES.IDLE
    };
  }

  /**
   * Processar seleção de serviço
   */
  async handleServiceSelection(session, message, businessNumber) {
    try {
      // Buscar serviços disponíveis
      const services = await this.getAvailableServices(businessNumber);

      // Tentar encontrar serviço por número ou nome
      const selectedService = this.findServiceByInput(message, services);

      if (selectedService) {
        session.data.selectedService = selectedService;
        session.state = this.STATES.WAITING_DATE;

        return {
          message: `Perfeito! Você escolheu: *${selectedService.nome_servico}*\n💰 Valor: R$ ${selectedService.valor}\n⏱️ Duração: ${selectedService.duracao_min} minutos\n\nAgora informe a data desejada (formato: DD/MM/YYYY ou "hoje" ou "amanhã"):`,
          state: this.STATES.WAITING_DATE
        };
      }

      // Serviço não encontrado
      return {
        message: 'Serviço não encontrado. ' + this.getServiceSelectionMessage(businessNumber),
        state: this.STATES.WAITING_SERVICE
      };

    } catch (error) {
      console.error('Erro ao processar seleção de serviço:', error);
      return {
        message: 'Erro ao buscar serviços. Tente novamente.',
        state: this.STATES.WAITING_SERVICE
      };
    }
  }

  /**
   * Processar seleção de data
   */
  handleDateSelection(session, message) {
    const selectedDate = this.parseDate(message);

    if (selectedDate) {
      session.data.selectedDate = selectedDate;
      session.state = this.STATES.WAITING_TIME;

      return {
        message: `Data selecionada: *${selectedDate.toLocaleDateString('pt-BR')}*\n\nAgora informe o horário desejado (formato: HH:MM, ex: 14:30):`,
        state: this.STATES.WAITING_TIME
      };
    }

    return {
      message: 'Data inválida. Por favor, use o formato DD/MM/YYYY ou diga "hoje" ou "amanhã".',
      state: this.STATES.WAITING_DATE
    };
  }

  /**
   * Processar seleção de horário
   */
  async handleTimeSelection(session, message, businessNumber) {
    const selectedTime = this.parseTime(message);

    if (!selectedTime) {
      return {
        message: 'Horário inválido. Use o formato HH:MM (ex: 14:30).',
        state: this.STATES.WAITING_TIME
      };
    }

    // Combinar data e horário
    const dateTime = new Date(session.data.selectedDate);
    dateTime.setHours(selectedTime.hours, selectedTime.minutes, 0, 0);

    // Verificar se o horário está disponível
    const isAvailable = await this.checkAvailability(
      businessNumber,
      dateTime,
      session.data.selectedService.duracao_min
    );

    if (!isAvailable) {
      return {
        message: 'Horário não disponível. Por favor, escolha outro horário.',
        state: this.STATES.WAITING_TIME
      };
    }

    session.data.selectedDateTime = dateTime;
    session.state = this.STATES.WAITING_CONFIRMATION;

    const service = session.data.selectedService;
    const confirmationMessage = `📅 *Confirmação do Agendamento*\n\n` +
      `💇 Serviço: ${service.nome_servico}\n` +
      `📆 Data: ${dateTime.toLocaleDateString('pt-BR')}\n` +
      `🕐 Horário: ${dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
      `⏱️ Duração: ${service.duracao_min} minutos\n` +
      `💰 Valor: R$ ${service.valor}\n\n` +
      `1. ✅ Confirmar agendamento\n` +
      `2. 📅 Alterar data/hora\n` +
      `3. 💇 Escolher outro serviço\n` +
      `4. ❌ Cancelar`;

    return {
      message: confirmationMessage,
      state: this.STATES.WAITING_CONFIRMATION
    };
  }

  /**
   * Processar confirmação
   */
  async handleConfirmation(session, message, businessNumber) {
    if (message === '1' || message.includes('confirmar')) {
      try {
        // Criar agendamento
        const result = await this.createAppointment(session, businessNumber);

        if (result.success) {
          // Notificar criação do agendamento
          const NotificationService = require('./NotificationService');
          await NotificationService.notifyBookingCreated(result.bookingId);

          session.state = this.STATES.IDLE;
          session.data = {};

          return {
            message: `✅ *Agendamento confirmado!*\n\n` +
              `📅 Data: ${result.dateTime.toLocaleDateString('pt-BR')}\n` +
              `🕐 Horário: ${result.dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
              `💇 Serviço: ${result.serviceName}\n\n` +
              `Enviamos uma confirmação por WhatsApp. Qualquer dúvida, estamos aqui! 😊\n\n` +
              `Para agendar outro serviço, digite *1*.`,
            state: this.STATES.IDLE
          };
        } else {
          return {
            message: `❌ Não foi possível confirmar o agendamento: ${result.message}\n\nTente novamente.`,
            state: this.STATES.WAITING_CONFIRMATION
          };
        }

      } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return {
          message: 'Erro ao confirmar agendamento. Tente novamente.',
          state: this.STATES.WAITING_CONFIRMATION
        };
      }
    }

    if (message === '2') {
      session.state = this.STATES.WAITING_DATE;
      return {
        message: 'Ok, vamos alterar a data. Informe a nova data (DD/MM/YYYY):',
        state: this.STATES.WAITING_DATE
      };
    }

    if (message === '3') {
      session.state = this.STATES.WAITING_SERVICE;
      return {
        message: this.getServiceSelectionMessage(businessNumber),
        state: this.STATES.WAITING_SERVICE
      };
    }

    if (message === '4') {
      session.state = this.STATES.IDLE;
      session.data = {};
      return {
        message: 'Agendamento cancelado. Digite *1* para começar novamente.',
        state: this.STATES.IDLE
      };
    }

    // Opção inválida
    return {
      message: 'Opção inválida. Responda com 1, 2, 3 ou 4.',
      state: this.STATES.WAITING_CONFIRMATION
    };
  }

  /**
   * Processar cliente novo
   */
  async handleNewClient(session, message, businessNumber) {
    const name = message.trim();

    if (name.length < 2) {
      return {
        message: 'Nome muito curto. Por favor, informe seu nome completo:',
        state: this.STATES.WAITING_CLIENT_NAME
      };
    }

    try {
      // Criar cliente
      const Cliente = require('../models/Cliente');
      const Usuario = require('../models/Usuario');

      // Buscar usuário pelo número do WhatsApp
      const user = await Usuario.findByWhatsapp(businessNumber);
      if (!user) {
        return {
          message: 'Erro: Usuário não encontrado.',
          state: this.STATES.IDLE
        };
      }

      // Criar cliente
      await Cliente.create({
        id_usuario: user.id_usuario,
        whatsapp: session.userId,
        nome: name
      });

      session.state = this.STATES.IDLE;
      session.data = {};

      return {
        message: `Olá ${name}! 😊\n\nBem-vindo ao nosso sistema de agendamentos!\n\n` +
          this.getWelcomeMessage() + '\n\n' +
          this.conversationFlow[this.STATES.IDLE].options.join('\n'),
        state: this.STATES.IDLE
      };

    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return {
        message: 'Erro ao salvar seus dados. Tente novamente.',
        state: this.STATES.WAITING_CLIENT_NAME
      };
    }
  }

  /**
   * Mostrar agendamentos do cliente
   */
  async handleShowAppointments(session) {
    try {
      const appointments = await this.getClientAppointments(session.userId);

      if (appointments.length === 0) {
        return {
          message: 'Você não tem agendamentos marcados.\n\nDigite *1* para agendar um serviço.',
          state: this.STATES.IDLE
        };
      }

      let message = '📅 *Seus Agendamentos*\n\n';

      appointments.forEach((apt, index) => {
        message += `${index + 1}. ${apt.servico_nome}\n`;
        message += `   📆 ${new Date(apt.start_at).toLocaleDateString('pt-BR')}\n`;
        message += `   🕐 ${new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
        message += `   📊 Status: ${this.formatStatus(apt.status)}\n\n`;
      });

      message += 'Para cancelar um agendamento, digite *3*.';

      return {
        message: message,
        state: this.STATES.IDLE
      };

    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return {
        message: 'Erro ao buscar seus agendamentos. Tente novamente.',
        state: this.STATES.IDLE
      };
    }
  }

  /**
   * Cancelar agendamento
   */
  async handleCancelAppointment(session) {
    try {
      const appointments = await this.getClientAppointments(session.userId);

      if (appointments.length === 0) {
        return {
          message: 'Você não tem agendamentos para cancelar.\n\nDigite *1* para agendar um serviço.',
          state: this.STATES.IDLE
        };
      }

      let message = '❌ *Cancelar Agendamento*\n\n';
      message += 'Seus agendamentos ativos:\n\n';

      appointments.forEach((apt, index) => {
        if (apt.status === 'confirmed') {
          message += `${index + 1}. ${apt.servico_nome}\n`;
          message += `   📆 ${new Date(apt.start_at).toLocaleDateString('pt-BR')}\n`;
          message += `   🕐 ${new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
        }
      });

      message += 'Para cancelar, responda com o número do agendamento (ex: "1").\n';
      message += 'Para voltar, digite "voltar".';

      session.state = 'waiting_cancel_confirmation';
      session.data.appointmentsToCancel = appointments.filter(a => a.status === 'confirmed');

      return {
        message: message,
        state: 'waiting_cancel_confirmation'
      };

    } catch (error) {
      console.error('Erro ao buscar agendamentos para cancelamento:', error);
      return {
        message: 'Erro ao buscar agendamentos. Tente novamente.',
        state: this.STATES.IDLE
      };
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Verificar se é cliente novo
   */
  async isNewClient(whatsapp, businessNumber) {
    try {
      const Usuario = require('../models/Usuario');
      const Cliente = require('../models/Cliente');

      const user = await Usuario.findByWhatsapp(businessNumber);
      if (!user) return true;

      const client = await Cliente.findByWhatsapp(user.id_usuario, whatsapp);
      return !client;
    } catch (error) {
      console.error('Erro ao verificar cliente:', error);
      return true;
    }
  }

  /**
   * Obter mensagem de boas-vindas
   */
  getWelcomeMessage() {
    return `🏪 *Bem-vindo ao Sistema de Agendamentos!*\n\n` +
      `Escolha uma opção:\n\n`;
  }

  /**
   * Obter mensagem de seleção de serviços
   */
  async getServiceSelectionMessage(businessNumber) {
    try {
      const services = await this.getAvailableServices(businessNumber);

      if (services.length === 0) {
        return 'Nenhum serviço disponível no momento.';
      }

      let message = 'Escolha o serviço desejado:\n\n';

      services.forEach((service, index) => {
        message += `${index + 1}. ${service.nome_servico}\n`;
        message += `   💰 R$ ${service.valor}\n`;
        message += `   ⏱️ ${service.duracao_min} min\n\n`;
      });

      message += 'Digite o número do serviço ou o nome dele.';

      return message;
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      return 'Erro ao carregar serviços. Tente novamente.';
    }
  }

  /**
   * Buscar serviços disponíveis
   */
  async getAvailableServices(businessNumber) {
    try {
      const Usuario = require('../models/Usuario');
      const Servico = require('../models/Servico');

      const user = await Usuario.findByWhatsapp(businessNumber);
      if (!user) return [];

      return await Servico.findByUsuario(user.id_usuario);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      return [];
    }
  }

  /**
   * Encontrar serviço pela entrada do usuário
   */
  findServiceByInput(input, services) {
    // Tentar por número
    const serviceNumber = parseInt(input);
    if (!isNaN(serviceNumber) && serviceNumber > 0 && serviceNumber <= services.length) {
      return services[serviceNumber - 1];
    }

    // Tentar por nome (busca parcial, case insensitive)
    const serviceName = services.find(service =>
      service.nome_servico.toLowerCase().includes(input.toLowerCase())
    );

    return serviceName;
  }

  /**
   * Parse de data
   */
  parseDate(input) {
    const cleanInput = input.trim().toLowerCase();

    if (cleanInput === 'hoje') {
      return new Date();
    }

    if (cleanInput === 'amanhã' || cleanInput === 'amanha') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Tentar formato DD/MM/YYYY ou DD/MM
    const dateRegex = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
    const match = cleanInput.match(dateRegex);

    if (match) {
      const [, day, month, year] = match;
      const currentYear = new Date().getFullYear();
      const parsedYear = year ? parseInt(year) : currentYear;

      const date = new Date(parsedYear, parseInt(month) - 1, parseInt(day));

      // Verificar se a data é válida
      if (date.getDate() === parseInt(day) &&
          date.getMonth() === parseInt(month) - 1 &&
          date.getFullYear() === parsedYear) {
        return date;
      }
    }

    return null;
  }

  /**
   * Parse de horário
   */
  parseTime(input) {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = input.trim().match(timeRegex);

    if (match) {
      const [, hours, minutes] = match;
      const hour = parseInt(hours);
      const minute = parseInt(minutes);

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hours: hour, minutes: minute };
      }
    }

    return null;
  }

  /**
   * Verificar disponibilidade de horário
   */
  async checkAvailability(businessNumber, dateTime, durationMinutes) {
    try {
      const Usuario = require('../models/Usuario');
      const Agendamento = require('../models/Agendamento');

      const user = await Usuario.findByWhatsapp(businessNumber);
      if (!user) return false;

      const endTime = new Date(dateTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      return await Agendamento.checkAvailability(
        user.id_usuario,
        dateTime,
        null // serviceId - verificaremos apenas conflito de horário
      );
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return false;
    }
  }

  /**
   * Criar agendamento
   */
  async createAppointment(session, businessNumber) {
    try {
      const Usuario = require('../models/Usuario');
      const Cliente = require('../models/Cliente');
      const Agendamento = require('../models/Agendamento');

      const user = await Usuario.findByWhatsapp(businessNumber);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const client = await Cliente.findByWhatsapp(user.id_usuario, session.userId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const booking = await Agendamento.create({
        id_usuario: user.id_usuario,
        id_cliente: client.id_cliente,
        id_servico: session.data.selectedService.id_servico,
        start_at: session.data.selectedDateTime,
        status: 'confirmed'
      });

      return {
        success: true,
        bookingId: booking.id_agendamento,
        dateTime: session.data.selectedDateTime,
        serviceName: session.data.selectedService.nome_servico
      };

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Obter agendamentos do cliente
   */
  async getClientAppointments(whatsapp) {
    try {
      const Usuario = require('../models/Usuario');
      const Cliente = require('../models/Cliente');
      const Agendamento = require('../models/Agendamento');

      // Buscar todos os usuários (vários podem ter o mesmo WhatsApp em diferentes tenants)
      const users = await Usuario.query('SELECT * FROM usuarios');

      for (const user of users) {
        const client = await Cliente.findByWhatsapp(user.id_usuario, whatsapp);
        if (client) {
          return await Agendamento.findByCliente(client.id_cliente);
        }
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar agendamentos do cliente:', error);
      return [];
    }
  }

  /**
   * Formatar status para exibição
   */
  formatStatus(status) {
    const statusMap = {
      'confirmed': '✅ Confirmado',
      'completed': '✅ Concluído',
      'cancelled': '❌ Cancelado',
      'pending': '⏳ Pendente'
    };

    return statusMap[status] || status;
  }

  /**
   * Limpar sessões expiradas
   */
  cleanupExpiredSessions() {
    const now = Date.now();

    for (const [userId, session] of this.sessions) {
      if (now - session.createdAt > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
        console.log(`🧹 Sessão expirada removida: ${userId}`);
      }
    }
  }

  /**
   * Obter estatísticas das conversas
   */
  getConversationStats() {
    const stats = {
      activeSessions: this.sessions.size,
      sessionsByState: {}
    };

    for (const [userId, session] of this.sessions) {
      const state = session.state;
      stats.sessionsByState[state] = (stats.sessionsByState[state] || 0) + 1;
    }

    return stats;
  }

  /**
   * Resetar sessão do usuário
   */
  resetSession(userId) {
    this.sessions.delete(userId);
    console.log(`🔄 Sessão resetada: ${userId}`);
  }
}

module.exports = new ConversationService();
