const BotActivationService = require('./BotActivationService');
const BotStateService = require('./BotStateService');
const DateParser = require('../utils/DateParser');
const ConfirmationService = require('../utils/ConfirmationService');
const MessageFormatter = require('../utils/MessageFormatter');

// Importar serviços do sistema principal
const ServicoController = require('../../controllers/ServicoController');
const AgendamentoService = require('../../services/AgendamentoService');
const ClienteController = require('../../controllers/ClienteController');

/**
 * Serviço principal do processador de bot WhatsApp
 * Coordena todas as funcionalidades do bot e processamento de mensagens
 */
class BotProcessorService {

  constructor() {
    this.activationService = BotActivationService;
    this.stateService = BotStateService;
    this.dateParser = DateParser;
    this.confirmationService = ConfirmationService;
    this.messageFormatter = MessageFormatter;

    this.services = {
      servico: ServicoController,
      agendamento: new AgendamentoService(),
      cliente: ClienteController
    };
  }

  /**
   * Processa mensagem recebida do WhatsApp
   * @param {Object} message - Mensagem recebida
   * @returns {Object} - Resposta do bot
   */
  async processMessage(message) {
    try {
      const { phoneNumber, content, messageType, messageContext, isGroup, isFromMe } = this.parseIncomingMessage(message);
      const tenantId = message.tenantId || null;

      // console.log(`📱 Processando mensagem de ${phoneNumber || 'desconhecido'}: ${content || ''}`);

      // Ignorar grupos e mensagens enviadas pelo próprio bot
      if (isGroup || isFromMe) {
        return null;
      }

      // Iniciação apenas por gatilho !bot ou conversa já ativa
      const activationCheck = this.activationService.shouldRespond(phoneNumber, content, messageContext);
      if (!activationCheck.shouldRespond) {
        // Silencioso se não estiver ativado (sem logs irritantes)
        return null;
      }

      // Atualizar estado da conversa
      this.stateService.incrementMessageCount(phoneNumber);
      const currentState = this.stateService.getConversationState(phoneNumber);

      // Processar mensagem baseada no estado atual
      const response = await this.processMessageByState(phoneNumber, content, currentState, tenantId);

      return response;

    } catch (error) {
      console.error('❌ Erro no processamento da mensagem:', error);
      return this.handleError(phoneNumber, error);
    }
  }

  /**
   * Processa mensagem baseada no estado atual da conversa
   */
  async processMessageByState(phoneNumber, content, currentState, tenantId = null) {
    const normalizedContent = this.normalizeContent(content);

    switch (currentState.currentState) {
      case 'INITIAL':
        return await this.handleInitialState(phoneNumber, normalizedContent, tenantId);

      case 'WAITING_SERVICE_SELECTION':
        return await this.handleServiceSelection(phoneNumber, normalizedContent, tenantId);

      case 'WAITING_DATE_TIME':
      case 'WAITING_DAY_SELECTION':
      case 'WAITING_TIME_SELECTION':
      case 'WAITING_ADD_MORE':
        return await this.handleDateTimeSelection(phoneNumber, normalizedContent, tenantId);

      case 'WAITING_CONFIRMATION':
        return await this.handleConfirmation(phoneNumber, normalizedContent, tenantId);

      case 'WAITING_CUSTOMER_INFO':
        return await this.handleCustomerInfo(phoneNumber, normalizedContent, tenantId);

      case 'VIEWING_BOOKINGS':
        return await this.handleViewingBookings(phoneNumber, normalizedContent, tenantId);

      case 'HELP_REQUESTED':
        return await this.handleHelpRequest(phoneNumber, normalizedContent, tenantId);

      case 'ERROR_STATE':
        return await this.handleErrorState(phoneNumber, normalizedContent, tenantId);

      default:
        // Fallback inteligente: se houver contexto de dias/horas aguardando e o usuário enviou número, encaminhar
        const daysCtx = this.stateService.getTemporaryData(phoneNumber, 'days');
        const slotsCtx = this.stateService.getTemporaryData(phoneNumber, 'slots');
        if ((Array.isArray(daysCtx) || Array.isArray(slotsCtx)) && /^\d+$/.test(normalizedContent)) {
          return await this.handleDateTimeSelection(phoneNumber, normalizedContent, tenantId);
        }
        return await this.handleUnknownState(phoneNumber, normalizedContent, tenantId);
    }
  }

  /**
   * Trata estado inicial - menu principal
   */
  async handleInitialState(phoneNumber, content, tenantId = null) {
    const command = this.extractCommand(content);

    // Navegação: voltar com '#'
    if (content.trim() === '#') {
      const back = this.stateService.goBack(phoneNumber, 1);
      return this.showMainMenu(phoneNumber);
    }

    switch (command) {
      case 'AGENDAR':
      case 'MARCAR':
        return await this.startBookingFlow(phoneNumber, tenantId);

      case 'AGENDAMENTOS':
      case 'MEUS':
        return await this.showUserBookings(phoneNumber, tenantId);

      case 'SERVICOS':
        return await this.showServices(phoneNumber, tenantId);

      case 'AJUDA':
      case 'HELP':
        return await this.showHelp(phoneNumber, tenantId);

      case 'MENU':
        return this.showMainMenu(phoneNumber);

      default:
        // Tentar interpretar como comando natural
        if (this.containsBookingIntent(content)) {
          return await this.startBookingFlow(phoneNumber, tenantId);
        }

        return this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Inicia fluxo de agendamento
   */
  async startBookingFlow(phoneNumber, tenantId = null) {
    try {
      // Obter serviços disponíveis
      // Buscar exclusivamente os serviços do tenant atual (usuários do tenant)
      const ServicoController = require('../../controllers/ServicoController');
      const services = tenantId
        ? await ServicoController.getForTenant(tenantId)
        : await ServicoController.getAllForBot();
      if (!services || services.length === 0) {
        return {
          to: phoneNumber,
          message: this.messageFormatter.formatErrorMessage(
            'Nenhum serviço disponível no momento.',
            'Tente novamente mais tarde ou entre em contato conosco.'
          )
        };
      }

      // Atualizar estado
      this.stateService.setNextState(phoneNumber, 'REQUEST_SERVICES', { services });

      // Anexar instruções e loading informativo
      const listMsg = '⏳ Carregando serviços...\n\n' + this.messageFormatter.formatServicesList(services) + '\n\n# Voltar\n* Menu Principal';
      return {
        to: phoneNumber,
        message: listMsg
      };

    } catch (error) {
      console.error('Erro ao iniciar agendamento:', error);
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Erro ao carregar serviços.',
          'Tente novamente em alguns instantes.'
        )
      };
    }
  }

  /**
   * Trata seleção de serviço
   */
  async handleServiceSelection(phoneNumber, content, tenantId = null) {
    if (content.trim() === '#') {
      this.stateService.goBack(phoneNumber, 1);
      return this.showMainMenu(phoneNumber);
    }
    const serviceNumber = this.extractNumber(content);
    const availableServices = this.stateService.getTemporaryData(phoneNumber, 'availableServices');

    if (!serviceNumber || !availableServices) {
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Seleção de serviço inválida.',
          'Digite o número do serviço desejado.'
        )
      };
    }

    const selectedService = availableServices[serviceNumber - 1];
    if (!selectedService) {
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Número de serviço inválido.',
          'Verifique a lista e digite um número válido.'
        )
      };
    }

    // Atualizar estado
    this.stateService.setNextState(phoneNumber, 'SELECT_SERVICE', { service: selectedService });

    // Obter horários disponíveis reais do usuário do serviço, respeitando configurações
    try {
      const AgendamentoValidationService = require('../../services/AgendamentoValidationService');
      const validationService = new AgendamentoValidationService();

      const barberUserId = selectedService.id_usuario; // dono do serviço

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Buscar dias com disponibilidade (próximos 7 dias)
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd2 = String(d.getDate()).padStart(2, '0');
        const ds = `${yyyy}-${mm}-${dd2}`;
        const gen = await validationService.gerarSlotsDisponiveis(barberUserId, ds);
        if (gen && gen.length > 0) {
          days.push({ date: ds, slots: gen });
        }
      }

      if (days.length === 0) {
        return {
          to: phoneNumber,
          message: this.messageFormatter.formatErrorMessage(
            'Nenhum horário disponível nos próximos dias.',
            'Tente outro serviço ou volte mais tarde.'
          )
        };
      }

      // Guardar dias e serviço selecionado
      this.stateService.setNextState(phoneNumber, 'WAITING_DAY_SELECTION', { days, service: selectedService, barberUserId });

      // Mensagem de seleção de dia
      let msgDays = `📅 Escolha o dia para ${selectedService.nome_servico} (próximos dias):\n\n`;
      days.forEach((d, idx) => {
        const date = new Date(d.date);
        const label = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        msgDays += `${idx + 1}. ${label} (${d.slots.length} horários)\n`;
      });
      msgDays += `\n# Voltar\n* Menu Principal`;

      return { to: phoneNumber, message: msgDays };

      if (!slots || slots.length === 0) {
        return {
          to: phoneNumber,
          message: this.messageFormatter.formatErrorMessage(
            'Nenhum horário disponível para este serviço.',
            'Tente outro serviço ou entre em contato conosco.'
          )
        };
      }

      // (removido: seleção direta de horários). Passo agora é escolher o dia primeiro.

    } catch (error) {
      console.error('Erro ao obter horários:', error);
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Erro ao carregar horários.',
          'Tente novamente ou escolha outro serviço.'
        )
      };
    }
  }

  /**
   * Trata seleção de data/hora
   */
  async handleDateTimeSelection(phoneNumber, content, tenantId = null) {
    // Atalhos de navegação
    if (content.trim() === '*') {
      this.stateService.setNextState(phoneNumber, 'BACK_TO_MENU');
      return this.showMainMenu(phoneNumber);
    }
    if (content.trim() === '#') {
      this.stateService.goBack(phoneNumber, 1);
      return this.showMainMenu(phoneNumber);
    }
    // Novo fluxo: delegar para seleção numérica de dias/horas
    const stateData = this.stateService.getTemporaryData(phoneNumber) || {};
    const days = this.stateService.getTemporaryData(phoneNumber, 'days');
    const service = this.stateService.getTemporaryData(phoneNumber, 'service');
    const barberUserId = this.stateService.getTemporaryData(phoneNumber, 'barberUserId');

    // Se estamos em seleção de hora (aceita variações como "8.", "8)", "8️⃣") - PRIORIDADE SOBRE DIA
    const currentSlots = this.stateService.getTemporaryData(phoneNumber, 'slots');
    const selectedTimeNumber = this.extractFirstNumber(content);
    if (currentSlots && Array.isArray(currentSlots) && Number.isInteger(selectedTimeNumber)) {
      const idx = selectedTimeNumber - 1;
      const slots = currentSlots;
      if (idx < 0 || idx >= slots.length) {
        return { to: phoneNumber, message: 'Opção inválida. Escolha um dos horários listados ou # para voltar.' };
      }
      const slot = slots[idx];
      const bookingData = {
        tenantId: tenantId || null,
        serviceId: service.id_servico,
        userId: service.id_usuario,
        serviceName: service.nome_servico,
        serviceValue: service.valor,
        serviceDuration: service.duracao_min,
        dateTime: slot.start_at,
        customerPhone: phoneNumber,
        customerName: null
      };
      this.stateService.setNextState(phoneNumber, 'WAITING_ADD_MORE', { bookingData, selectedTime: slot.start_at });
      return { to: phoneNumber, message: 'Deseja adicionar mais um serviço? Responda "sim" para adicionar, ou "não" para seguir para confirmação.' };
    }

    // Se estamos em seleção de dia (aceita variações como "8.", "8)", "8️⃣")
    const selectedDayNumber = this.extractFirstNumber(content);
    if (Array.isArray(days) && Number.isInteger(selectedDayNumber)) {
      const idx = selectedDayNumber - 1;
      if (idx < 0 || idx >= days.length) {
        return { to: phoneNumber, message: 'Opção inválida. Escolha um dos dias listados ou # para voltar.' };
      }
      const chosenDay = days[idx];
      const slots = (chosenDay.slots || []).map(s => ({
        start_at: s.datetime,
        end_at: new Date(new Date(s.datetime).getTime() + (service.duracao_min || 30) * 60000).toISOString()
      }));
      this.stateService.setNextState(phoneNumber, 'WAITING_TIME_SELECTION', { service, barberUserId, chosenDay: chosenDay.date, slots });
      const msg = this.messageFormatter.formatAvailableSlots(slots, service.nome_servico, chosenDay.date) + '\n\n# Voltar\n* Menu Principal';
      return { to: phoneNumber, message: msg };
    }

    // Se estamos perguntando para adicionar mais
    if (stateData.bookingData && content) {
      const answer = content.trim().toLowerCase();
      if (['sim','s','yes','y'].includes(answer)) {
        return await this.startBookingFlow(phoneNumber, tenantId);
      }
      if (['não','nao','n','no'].includes(answer)) {
        this.confirmationService.startConfirmation(phoneNumber, stateData.bookingData);
        const confirmationMessage = this.messageFormatter.formatBookingConfirmation(stateData.bookingData);
        this.stateService.setNextState(phoneNumber, 'WAITING_CONFIRMATION', { bookingData: stateData.bookingData });
        return { to: phoneNumber, message: confirmationMessage };
      }
    }

    return { to: phoneNumber, message: 'Não entendi. Escolha uma opção válida, use # para voltar ou * para o menu principal.' };
  }

  /**
   * Extrai o primeiro número inteiro presente no texto (suporta dígitos com pontuação/emoji keycap)
   * @param {string} text
   * @returns {number|null}
   */
  extractFirstNumber(text) {
    if (!text) return null;
    const str = String(text).normalize('NFKD');
    const match = str.match(/(\d{1,3})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Trata confirmação de agendamento
   */
  async handleConfirmation(phoneNumber, content) {
    const confirmationResult = this.confirmationService.processResponse(phoneNumber, content);

    switch (confirmationResult.type) {
      case 'CONFIRMED':
        return await this.confirmBooking(phoneNumber, confirmationResult.bookingData);

      case 'CANCELLED':
        this.stateService.setNextState(phoneNumber, 'BACK_TO_MENU');
        return {
          to: phoneNumber,
          message: '❌ Agendamento cancelado.\n\nDigite "menu" para voltar ao início.'
        };

      case 'COLLECT_INFO':
        this.stateService.setNextState(phoneNumber, 'WAITING_CUSTOMER_INFO');
        return {
          to: phoneNumber,
          message: confirmationResult.message
        };

      case 'INVALID_RESPONSE':
      case 'CLARIFY_CONFIRMATION':
        return {
          to: phoneNumber,
          message: confirmationResult.message
        };

      case 'MAX_ATTEMPTS_EXCEEDED':
        this.stateService.setNextState(phoneNumber, 'BACK_TO_MENU');
        return {
          to: phoneNumber,
          message: '❌ Número máximo de tentativas excedido.\n\nDigite "menu" para recomeçar.'
        };

      default:
        return {
          to: phoneNumber,
          message: 'Não entendi sua resposta. Responda "sim" para confirmar ou "não" para cancelar.'
        };
    }
  }

  /**
   * Confirma e salva agendamento
   */
  async confirmBooking(phoneNumber, bookingData) {
    try {
      // Criar ou atualizar cliente
      let cliente = await this.findOrCreateCustomer(phoneNumber, bookingData.customerName);

      // Criar agendamento
      const agendamentoData = {
        id_cliente: cliente.id_cliente,
        id_servico: bookingData.serviceId,
        start_at: bookingData.dateTime,
        status: 'pending',
        observacoes: bookingData.notes || '',
        id_usuario: bookingData.userId,
        id_tenant: bookingData.tenantId
      };

      // Checar auto-confirmação do WhatsApp nas configurações do usuário
      let autoConfirm = false;
      try {
        const ConfiguracaoService = require('../../services/ConfiguracaoService');
        const cfgSvc = new ConfiguracaoService();
        const cfg = await cfgSvc.getConfiguracoes(bookingData.userId);
        autoConfirm = !!(cfg && (cfg.auto_confirm_whatsapp === 1 || cfg.auto_confirm_whatsapp === true));
      } catch (_) {}

      // Reservar slots antes de confirmar
      const SlotService = require('../../services/SlotService');
      const slotService = new SlotService.constructor ? new SlotService() : require('../../services/SlotService');
      if (slotService && slotService.reserveSlotsForBooking) {
        await slotService.reserveSlotsForBooking(bookingData.userId, bookingData.dateTime, bookingData.serviceDuration, null);
      }

      // Se autoConfirm true, marcar como 'confirmed'
      if (autoConfirm) {
        agendamentoData.status = 'confirmed';
      }

      const agendamento = await this.services.agendamento.criarAgendamento(bookingData.userId, agendamentoData);

      // Atualizar estado
      this.stateService.setNextState(phoneNumber, 'CONFIRM_BOOKING', { booking: agendamento });

      // Limpar dados temporários
      this.confirmationService.removeConfirmation(phoneNumber);

      return {
        to: phoneNumber,
        message: this.messageFormatter.formatBookingConfirmation({
          ...bookingData,
          id: agendamento.id_agendamento
        })
      };

    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      this.stateService.setNextState(phoneNumber, 'ERROR_OCCURRED', { error });
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Erro ao salvar agendamento.',
          'Tente novamente ou entre em contato conosco.'
        )
      };
    }
  }

  /**
   * Mostra agendamentos do usuário
   */
  async showUserBookings(phoneNumber) {
    try {
      const cliente = await this.findCustomerByPhone(phoneNumber);

      if (!cliente) {
        return {
          to: phoneNumber,
          message: 'Não encontrei seus dados. Para ver seus agendamentos, primeiro faça um agendamento conosco.'
        };
      }

      const bookings = await this.services.agendamento.buscarAgendamentos(1, { cliente_id: cliente.id_cliente }); // Usando userId=1 por enquanto

      if (!bookings || bookings.length === 0) {
        return {
          to: phoneNumber,
          message: this.messageFormatter.formatCustomerBookings([])
        };
      }

      this.stateService.setNextState(phoneNumber, 'VIEW_BOOKINGS', { bookings });

      return {
        to: phoneNumber,
        message: this.messageFormatter.formatCustomerBookings(bookings)
      };

    } catch (error) {
      console.error('Erro ao obter agendamentos:', error);
      return {
        to: phoneNumber,
        message: this.messageFormatter.formatErrorMessage(
          'Erro ao carregar agendamentos.',
          'Tente novamente ou escolha outro serviço.'
        )
      };
    }
  }

  /**
   * Mostra ajuda
   */
  async showHelp(phoneNumber) {
    this.stateService.setNextState(phoneNumber, 'HELP_REQUESTED');
    return {
      to: phoneNumber,
      message: this.messageFormatter.formatHelpMessage()
    };
  }

  /**
   * Mostra menu principal
   */
  showMainMenu(phoneNumber) {
    const customerName = this.stateService.getTemporaryData(phoneNumber, 'customerName');
    return {
      to: phoneNumber,
      message: this.messageFormatter.formatWelcomeMessage(customerName)
    };
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Interpreta intenção de agendamento na mensagem
   */
  containsBookingIntent(content) {
    const bookingKeywords = [
      'agendar', 'marcar', 'horario', 'hora', 'servico', 'serviço',
      'corte', 'penteado', 'manicure', 'pedicure', 'atendimento'
    ];

    return bookingKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Extrai comando da mensagem
   */
  extractCommand(content) {
    // Mapear números do menu principal (tolerante: 1, 1., 1), 1️⃣, etc.)
    const raw = content.trim();
    // Converter emojis numéricos para dígitos simples
    const replaced = raw
      .replace(/1\uFE0F?\u20E3|\u0031\uFE0F\u20E3/g, '1')
      .replace(/2\uFE0F?\u20E3|\u0032\uFE0F\u20E3/g, '2')
      .replace(/3\uFE0F?\u20E3|\u0033\uFE0F\u20E3/g, '3')
      .replace(/4\uFE0F?\u20E3|\u0034\uFE0F\u20E3/g, '4');
    const leadingDigitMatch = replaced.match(/^\s*(\d)/);
    if (leadingDigitMatch) {
      switch (leadingDigitMatch[1]) {
        case '1': return 'AGENDAR';
        case '2': return 'AGENDAMENTOS';
        case '3': return 'SERVICOS';
        case '4': return 'AJUDA';
        default: break;
      }
    }

    const commands = {
      'agendar': 'AGENDAR',
      'marcar': 'MARCAR',
      'agendamentos': 'AGENDAMENTOS',
      'meus': 'AGENDAMENTOS',
      'servicos': 'SERVICOS',
      'serviços': 'SERVICOS',
      'ajuda': 'AJUDA',
      'help': 'AJUDA',
      'menu': 'MENU',
      'voltar': 'MENU'
    };

    for (const [keyword, command] of Object.entries(commands)) {
      if (content.includes(keyword)) {
        return command;
      }
    }

    return null;
  }

  /**
   * Extrai número da mensagem
   */
  extractNumber(content) {
    const numberMatch = content.match(/\d+/);
    return numberMatch ? parseInt(numberMatch[0]) : null;
  }

  /**
   * Normaliza conteúdo da mensagem
   */
  normalizeContent(content) {
    return content
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Parse da mensagem recebida
   */
  parseIncomingMessage(message) {
    // Suporte ao formato do Baileys (messages.upsert) e formato legado { from, body }
    const wm = (message && Array.isArray(message.messages) ? message.messages[0] : message) || {};
    const remoteJid = wm?.key?.remoteJid || wm?.from || '';
    const isGroup = typeof remoteJid === 'string' && remoteJid.endsWith('@g.us');

    // Extrair texto de múltiplos tipos
    const msgContent = wm?.message || {};
    const text = (
      msgContent.conversation ||
      msgContent?.extendedTextMessage?.text ||
      msgContent?.imageMessage?.caption ||
      msgContent?.videoMessage?.caption ||
      msgContent?.documentMessage?.caption ||
      wm?.body || // legado
      ''
    );

    return {
      phoneNumber: remoteJid,
      content: text || '',
      messageType: Object.keys(msgContent)[0] || (wm?.type || 'text'),
      messageContext: {
        isReplyToBot: wm?.key?.fromMe || wm?.context?.fromMe || false,
        quotedMessage: msgContent?.extendedTextMessage?.contextInfo?.quotedMessage || wm?.quoted,
        timestamp: wm?.messageTimestamp || wm?.timestamp
      },
      isGroup,
      isFromMe: !!(wm?.key?.fromMe)
    };
  }

  /**
   * Trata resposta quando bot não deve ser ativado
   */
  handleNonActivationResponse() { return null; }

  /**
   * Trata erros no processamento
   */
  handleError(phoneNumber, error) {
    this.stateService.incrementErrorCount(phoneNumber);

    return {
      to: phoneNumber,
      message: this.messageFormatter.formatErrorMessage(
        'Ocorreu um erro inesperado.',
        'Tente novamente ou digite "menu" para recomeçar.'
      )
    };
  }

  /**
   * Formata próximo horário comercial
   */
  formatNextBusinessHour(nextTime) { return ''; }

  // === MÉTODOS DE INTEGRAÇÃO COM BANCO DE DADOS ===

  /**
   * Obtém horários disponíveis para um serviço
   */
  async getAvailableSlots(serviceId, date = null) {
    try {
      // TODO: Implementar busca de slots disponíveis
      // Por enquanto retorna slots mockados
      const mockSlots = this.generateMockSlots(date);
      return mockSlots;
    } catch (error) {
      console.error('Erro ao obter slots:', error);
      return [];
    }
  }

  /**
   * Verifica disponibilidade de horário
   */
  async checkSlotAvailability(serviceId, dateTime) {
    try {
      // TODO: Implementar verificação real de disponibilidade
      // Por enquanto sempre retorna true
      return true;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return false;
    }
  }

  /**
   * Encontra ou cria cliente
   */
  async findOrCreateCustomer(phoneNumber, customerName = null) {
    try {
      let cliente = await this.findCustomerByPhone(phoneNumber);

      if (!cliente) {
        // Criar novo cliente
        cliente = await this.services.cliente.createForBot({
          nome: customerName || 'Cliente WhatsApp',
          telefone: phoneNumber,
          email: null,
          tenant_id: 1
        });
      }

      return cliente;
    } catch (error) {
      console.error('Erro ao encontrar/criar cliente:', error);
      throw error;
    }
  }

  /**
   * Encontra cliente por telefone
   */
  async findCustomerByPhone(phoneNumber) {
    try {
      // TODO: Implementar busca real por telefone
      // Por enquanto retorna null
      return null;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }
  }

  /**
   * Gera slots mockados para desenvolvimento
   */
  generateMockSlots(baseDate = null) {
    const slots = [];
    const base = baseDate ? new Date(baseDate) : new Date();

    // Próximos 5 dias
    for (let day = 0; day < 5; day++) {
      const date = new Date(base);
      date.setDate(base.getDate() + day);

      // Horários de 9h às 17h
      for (let hour = 9; hour <= 17; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);

        slots.push({
          start_at: slotTime.toISOString(),
          end_at: new Date(slotTime.getTime() + 60 * 60 * 1000).toISOString(),
          available: Math.random() > 0.3 // 70% de chance de estar disponível
        });
      }
    }

    return slots.filter(slot => slot.available);
  }

  // === MÉTODOS PARA HANDLERS PENDENTES ===

  async handleCustomerInfo(phoneNumber, content) {
    // TODO: Implementar coleta de informações do cliente
    return {
      to: phoneNumber,
      message: 'Funcionalidade em desenvolvimento.'
    };
  }

  async handleViewingBookings(phoneNumber, content) {
    // TODO: Implementar navegação nos agendamentos
    return {
      to: phoneNumber,
      message: 'Funcionalidade em desenvolvimento.'
    };
  }

  async handleHelpRequest(phoneNumber, content) {
    // Já implementado em showHelp
    return this.showHelp(phoneNumber);
  }

  async handleErrorState(phoneNumber, content) {
    // Resetar estado e voltar ao menu
    this.stateService.setNextState(phoneNumber, 'BACK_TO_MENU');
    return this.showMainMenu(phoneNumber);
  }

  async handleUnknownState(phoneNumber, content) {
    // Resetar para estado inicial
    this.stateService.setNextState(phoneNumber, 'BACK_TO_MENU');
    return this.showMainMenu(phoneNumber);
  }

  async showServices(phoneNumber, tenantId = null) {
    // Reutilizar lógica de startBookingFlow com tenantId
    return await this.startBookingFlow(phoneNumber, tenantId);
  }
}

module.exports = new BotProcessorService();
