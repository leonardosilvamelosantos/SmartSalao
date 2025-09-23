/**
 * Utilitário para formatação de mensagens do bot WhatsApp
 * Padroniza respostas e formatação de texto
 */
class MessageFormatter {

  constructor() {
    this.maxMessageLength = 4096; // Limite do WhatsApp
    this.lineBreak = '\n';
  }

  /**
   * Formata mensagem de boas-vindas
   */
  formatWelcomeMessage(customerName = null) {
    const greeting = customerName ? `Olá ${customerName}! 👋` : 'Olá! 👋';

    return `${greeting}

Bem-vindo ao nosso sistema de agendamento!
Como posso ajudá-lo hoje?

${this.formatOptions([
  '📅 *Agendar Serviço*',
  '📋 *Meus Agendamentos*',
  'ℹ️ *Ver Serviços*',
  '❓ *Ajuda*'
])}

Responda com o número da opção desejada ou digite sua solicitação.`;
  }

  /**
   * Formata lista de serviços disponíveis
   */
  formatServicesList(services) {
    if (!services || services.length === 0) {
      return '❌ Nenhum serviço disponível no momento.';
    }

    let message = '💇‍♀️ *Serviços Disponíveis*\n\n';

    services.forEach((service, index) => {
      message += `${index + 1}. ${service.nome_servico}\n`;
      message += `   💰 R$ ${service.valor}\n`;
      message += `   ⏱️ ${service.duracao_min} minutos\n`;

      if (service.descricao) {
        message += `   📝 ${service.descricao}\n`;
      }

      message += '\n';
    });

    message += 'Digite o *número* do serviço desejado ou "voltar" para retornar.';

    return this.ensureMaxLength(message);
  }

  /**
   * Formata horários disponíveis
   */
  formatAvailableSlots(slots, serviceName, date) {
    if (!slots || slots.length === 0) {
      return `❌ Nenhum horário disponível para ${serviceName} em ${date}.\n\nTente outra data ou serviço diferente.`;
    }

    // Ordenar por horário por segurança
    const ordered = [...slots].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    let message = `📅 *Horários Disponíveis*\n`;
    message += `Serviço: ${serviceName}\n`;
    message += `Data: ${date}\n\n`;

    // Numeração global sequencial e cabeçalhos por período sem reiniciar a contagem
    let counter = 1;
    let lastPeriod = '';

    for (const slot of ordered) {
      const hour = new Date(slot.start_at).getHours();
      const period = hour >= 6 && hour < 12 ? 'Manhã' : hour < 18 ? 'Tarde' : 'Noite';

      if (period !== lastPeriod) {
        if (lastPeriod !== '') message += '\n';
        message += `🕐 *${period}*\n`;
        lastPeriod = period;
      }

      const timeFormatted = this.formatTime(slot.start_at);
      message += `${counter}. ${timeFormatted}\n`;
      counter += 1;
    }

    message += `\nDigite o *número* do horário desejado ou "voltar" para escolher outro serviço.`;

    return this.ensureMaxLength(message);
  }

  /**
   * Formata confirmação de agendamento
   */
  formatBookingConfirmation(bookingData) {
    let message = '✅ *AGENDAMENTO CONFIRMADO!*\n\n';
    message += '📋 *Detalhes do Agendamento:*\n\n';

    message += `👤 Cliente: ${bookingData.customerName}\n`;
    message += `📱 Telefone: ${this.formatPhone(bookingData.customerPhone)}\n`;
    message += `💇‍♀️ Serviço: ${bookingData.serviceName}\n`;
    message += `💰 Valor: R$ ${bookingData.serviceValue}\n`;
    message += `📅 Data: ${this.formatDate(bookingData.dateTime)}\n`;
    message += `🕐 Horário: ${this.formatTime(bookingData.dateTime)}\n`;
    message += `⏱️ Duração: ${bookingData.serviceDuration} minutos\n`;

    if (bookingData.notes) {
      message += `📝 Observações: ${bookingData.notes}\n`;
    }

    message += '\n';
    message += '🎉 *Obrigado pela preferência!*\n';
    message += '📱 Você receberá lembretes antes do horário marcado.\n\n';

    message += 'Digite "menu" para voltar ao início ou "agendar" para novo agendamento.';

    return this.ensureMaxLength(message);
  }

  /**
   * Formata lista de agendamentos do cliente
   */
  formatCustomerBookings(bookings) {
    if (!bookings || bookings.length === 0) {
      return '📋 Você não possui agendamentos marcados.\n\nDigite "agendar" para fazer um novo agendamento.';
    }

    let message = '📋 *Seus Agendamentos*\n\n';

    bookings.forEach((booking, index) => {
      message += `${index + 1}. *${booking.serviceName}*\n`;
      message += `   📅 ${this.formatDate(booking.dateTime)}\n`;
      message += `   🕐 ${this.formatTime(booking.dateTime)}\n`;
      message += `   💰 R$ ${booking.serviceValue}\n`;
      message += `   📊 Status: ${this.formatStatus(booking.status)}\n\n`;
    });

    message += 'Digite o *número* do agendamento para ver mais detalhes ou "voltar" para o menu.';

    return this.ensureMaxLength(message);
  }

  /**
   * Formata detalhes de um agendamento específico
   */
  formatBookingDetails(booking) {
    let message = '📋 *Detalhes do Agendamento*\n\n';

    message += `🆔 ID: ${booking.id}\n`;
    message += `💇‍♀️ Serviço: ${booking.serviceName}\n`;
    message += `👤 Cliente: ${booking.customerName}\n`;
    message += `📱 Telefone: ${this.formatPhone(booking.customerPhone)}\n`;
    message += `📅 Data: ${this.formatDate(booking.dateTime)}\n`;
    message += `🕐 Horário: ${this.formatTime(booking.dateTime)}\n`;
    message += `💰 Valor: R$ ${booking.serviceValue}\n`;
    message += `⏱️ Duração: ${booking.serviceDuration} minutos\n`;
    message += `📊 Status: ${this.formatStatus(booking.status)}\n`;

    if (booking.notes) {
      message += `📝 Observações: ${booking.notes}\n`;
    }

    message += '\n';

    if (booking.status === 'scheduled') {
      message += '*Opções:*\n';
      message += '1. ⚠️ Reagendar\n';
      message += '2. ❌ Cancelar\n';
      message += '3. 📞 Ligar para o estabelecimento\n\n';
      message += 'Digite o número da opção desejada.';
    }

    return this.ensureMaxLength(message);
  }

  /**
   * Formata mensagem de erro
   */
  formatErrorMessage(error, suggestion = null) {
    let message = '❌ *Ops! Algo deu errado*\n\n';

    if (typeof error === 'string') {
      message += `${error}\n`;
    } else {
      message += 'Ocorreu um erro inesperado.\n';
    }

    if (suggestion) {
      message += `\n💡 ${suggestion}`;
    } else {
      message += '\n💡 Tente novamente ou digite "menu" para voltar ao início.';
    }

    return message;
  }

  /**
   * Formata mensagem de ajuda
   */
  formatHelpMessage() {
    let message = '❓ *Ajuda - Como usar o bot*\n\n';

    message += '*Comandos disponíveis:*\n\n';
    message += '📅 *Agendar* - Fazer novo agendamento\n';
    message += '📋 *Agendamentos* - Ver meus agendamentos\n';
    message += 'ℹ️ *Serviços* - Ver serviços disponíveis\n';
    message += '❓ *Ajuda* - Ver esta mensagem\n';
    message += '🏠 *Menu* - Voltar ao menu principal\n\n';

    message += '*Como agendar:*\n';
    message += '1. Digite "agendar" ou escolha a opção\n';
    message += '2. Escolha o serviço desejado\n';
    message += '3. Escolha a data e horário\n';
    message += '4. Confirme os dados\n\n';

    message += '*Dicas:*\n';
    message += '• Use linguagem natural: "amanhã às 14h"\n';
    message += '• Digite "voltar" a qualquer momento\n';
    message += '• Horário de atendimento: 8h às 18h\n\n';

    message += 'Digite qualquer comando para começar!';

    return this.ensureMaxLength(message);
  }

  /**
   * Formata mensagem de processamento
   */
  formatProcessingMessage(action) {
    const processingMessages = {
      'checking_slots': '🔍 Verificando horários disponíveis...',
      'saving_booking': '💾 Salvando agendamento...',
      'sending_confirmation': '📤 Enviando confirmação...',
      'updating_booking': '🔄 Atualizando agendamento...',
      'cancelling_booking': '❌ Cancelando agendamento...'
    };

    return processingMessages[action] || '⏳ Processando...';
  }

  /**
   * Formata lembrete de agendamento
   */
  formatReminderMessage(booking, hoursUntil) {
    let message = '🔔 *LEMBRETE DE AGENDAMENTO*\n\n';

    message += `Olá ${booking.customerName}!\n\n`;
    message += `Você tem um horário marcado em *${hoursUntil} hora(s)*:\n\n`;
    message += `💇‍♀️ ${booking.serviceName}\n`;
    message += `📅 ${this.formatDate(booking.dateTime)}\n`;
    message += `🕐 ${this.formatTime(booking.dateTime)}\n`;
    message += `📍 ${booking.location || 'Confirme o local'}\n\n`;

    if (hoursUntil <= 2) {
      message += '⚠️ *Chegue com antecedência!*\n\n';
    }

    message += 'Para reagendar ou cancelar, responda a esta mensagem.';

    return message;
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Formata lista de opções numeradas
   */
  formatOptions(options) {
    return options.map((option, index) =>
      `${index + 1}. ${option}`
    ).join('\n');
  }

  /**
   * Agrupa horários por período do dia
   */
  groupSlotsByPeriod(slots) {
    const groups = {
      'Manhã': [],
      'Tarde': [],
      'Noite': []
    };

    slots.forEach(slot => {
      const hour = new Date(slot.start_at).getHours();

      if (hour >= 6 && hour < 12) {
        groups['Manhã'].push(slot);
      } else if (hour >= 12 && hour < 18) {
        groups['Tarde'].push(slot);
      } else {
        groups['Noite'].push(slot);
      }
    });

    // Remover grupos vazios
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }

  /**
   * Obtém número do slot para exibição
   */
  getSlotNumber(slot, index) {
    return String(index + 1).padStart(2, '0');
  }

  /**
   * Formata hora para exibição
   */
  formatTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formata data para exibição
   */
  formatDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formata telefone para exibição
   */
  formatPhone(phone) {
    if (!phone) return 'Não informado';

    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Formata como (XX) XXXXX-XXXX
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }

    return phone;
  }

  /**
   * Formata status do agendamento
   */
  formatStatus(status) {
    const statusMap = {
      'scheduled': '✅ Agendado',
      'confirmed': '✅ Confirmado',
      'completed': '✅ Concluído',
      'cancelled': '❌ Cancelado',
      'no_show': '⚠️ Não compareceu'
    };

    return statusMap[status] || status;
  }

  /**
   * Garante que a mensagem não exceda o limite máximo
   */
  ensureMaxLength(message) {
    if (message.length <= this.maxMessageLength) {
      return message;
    }

    // Trunca mensagem e adiciona indicador
    const truncated = message.substring(0, this.maxMessageLength - 3);
    return truncated + '...';
  }

  /**
   * Quebra mensagem longa em partes
   */
  splitLongMessage(message) {
    const parts = [];
    let remaining = message;

    while (remaining.length > this.maxMessageLength) {
      let splitPoint = this.maxMessageLength;

      // Tentar quebrar em quebra de linha
      const lastLineBreak = remaining.lastIndexOf('\n', this.maxMessageLength);
      if (lastLineBreak > this.maxMessageLength * 0.8) {
        splitPoint = lastLineBreak;
      }

      parts.push(remaining.substring(0, splitPoint));
      remaining = remaining.substring(splitPoint).trim();
    }

    if (remaining.length > 0) {
      parts.push(remaining);
    }

    return parts;
  }
}

module.exports = new MessageFormatter();


