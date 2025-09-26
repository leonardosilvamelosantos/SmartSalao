const Agendamento = require('../models/Agendamento');
const Usuario = require('../models/Usuario');
const WhatsappService = require('./WhatsappService');

/**
 * Serviço de notificações e lembretes automáticos
 */
class NotificationService {
  constructor() {
    this.whatsappService = WhatsappService;
    this.templates = {
      booking_created: {
        title: '✅ Agendamento Confirmado',
        body: (booking) => `Olá! Seu agendamento foi confirmado.\n\n📅 Data: ${new Date(booking.data_agendamento).toLocaleDateString('pt-BR')}\n🕐 Horário: ${new Date(booking.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n💇 Serviço: ${booking.servico_nome}\n💰 Valor: R$ ${booking.valor}\n\nObrigado pela preferência!`
      },
      booking_cancelled: {
        title: '❌ Agendamento Cancelado',
        body: (booking) => `Olá! Seu agendamento foi cancelado.\n\n📅 Data: ${new Date(booking.data_agendamento).toLocaleDateString('pt-BR')}\n🕐 Horário: ${new Date(booking.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n💇 Serviço: ${booking.servico_nome}\n\nEntre em contato para reagendar.`
      },
      booking_reminder_24h: {
        title: '🔔 Lembrete: Agendamento Amanhã',
        body: (booking) => `Olá! Você tem um agendamento marcado para amanhã.\n\n📅 Data: ${new Date(booking.data_agendamento).toLocaleDateString('pt-BR')}\n🕐 Horário: ${new Date(booking.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n💇 Serviço: ${booking.servico_nome}\n📍 Local: ${booking.usuario_nome || 'Confirmar local'}\n\nEstamos te aguardando!`
      },
      booking_reminder_2h: {
        title: '🔔 Lembrete: Agendamento em 2 horas',
        body: (booking) => `Olá! Você tem um agendamento em 2 horas.\n\n📅 Data: ${new Date(booking.data_agendamento).toLocaleDateString('pt-BR')}\n🕐 Horário: ${new Date(booking.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n💇 Serviço: ${booking.servico_nome}\n📍 Local: ${booking.usuario_nome || 'Confirmar local'}\n\nNão se esqueça!`
      },
      booking_reminder_30m: {
        title: '🔔 Lembrete: Agendamento em 30 minutos',
        body: (booking) => `Olá! Você tem um agendamento em 30 minutos.\n\n📅 Data: ${new Date(booking.data_agendamento).toLocaleDateString('pt-BR')}\n🕐 Horário: ${new Date(booking.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n💇 Serviço: ${booking.servico_nome}\n📍 Local: ${booking.usuario_nome || 'Confirmar local'}\n\nChegaremos em breve!`
      }
    };
  }

  /**
   * Enviar notificação por WhatsApp
   */
  async sendNotification(type, booking, recipientWhatsapp = null) {
    try {
      const template = this.templates[type];
      if (!template) {
        throw new Error(`Template de notificação não encontrado: ${type}`);
      }

      const message = template.body(booking);
      const whatsapp = recipientWhatsapp || booking.cliente_whatsapp;

      if (!whatsapp) {
        console.warn(`WhatsApp não informado para notificação ${type}`);
        return { success: false, message: 'WhatsApp não informado' };
      }

      const result = await this.whatsappService.sendTextMessage(whatsapp, message);

      console.log(`📱 Notificação ${type} enviada para ${whatsapp}: ${result.success ? '✅' : '❌'}`);

      return result;

    } catch (error) {
      console.error(`Erro ao enviar notificação ${type}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Notificar criação de agendamento
   */
  async notifyBookingCreated(bookingId) {
    try {
      const booking = await Agendamento.findWithDetails(bookingId);
      if (!booking) {
        throw new Error('Agendamento não encontrado');
      }

      return await this.sendNotification('booking_created', booking);
    } catch (error) {
      console.error('Erro ao notificar criação de agendamento:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Notificar cancelamento de agendamento
   */
  async notifyBookingCancelled(bookingId) {
    try {
      const booking = await Agendamento.findWithDetails(bookingId);
      if (!booking) {
        throw new Error('Agendamento não encontrado');
      }

      return await this.sendNotification('booking_cancelled', booking);
    } catch (error) {
      console.error('Erro ao notificar cancelamento de agendamento:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Enviar lembretes automáticos
   */
  async sendReminders() {
    console.log('🔔 Enviando lembretes automáticos...');

    try {
      const now = new Date();

      // Lembretes de 24 horas
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await this.sendRemindersByTimeframe(twentyFourHoursFromNow, 'booking_reminder_24h', 24);

      // Lembretes de 2 horas
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      await this.sendRemindersByTimeframe(twoHoursFromNow, 'booking_reminder_2h', 2);

      // Lembretes de 30 minutos
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      await this.sendRemindersByTimeframe(thirtyMinutesFromNow, 'booking_reminder_30m', 0.5);

      console.log('✅ Lembretes enviados com sucesso');
      return { success: true, message: 'Lembretes enviados' };

    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Enviar lembretes para um período específico
   */
  async sendRemindersByTimeframe(targetTime, templateType, hoursAhead) {
    try {
      // PostgreSQL: usar tabelas padrão
      const bookings = await Agendamento.query(`
        SELECT
          a.*,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          s.nome_servico,
          s.duracao_min,
          s.valor,
          u.nome as usuario_nome
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN usuarios u ON a.id_usuario = u.id_usuario
        WHERE a.status = 'confirmed'
        AND a.data_agendamento >= $1
        AND a.data_agendamento < $2
        AND NOT EXISTS (
          SELECT 1 FROM notificacoes n
          WHERE n.id_agendamento = a.id_agendamento
          AND n.tipo = $3
          AND n.enviada = true
        )
      `, [
        new Date(targetTime.getTime() - 30 * 60 * 1000), // -30 min
        new Date(targetTime.getTime() + 30 * 60 * 1000), // +30 min
        templateType
      ]);

      console.log(`📅 Encontrados ${bookings.length} agendamentos para lembrete de ${hoursAhead}h`);

      let sentCount = 0;
      let failedCount = 0;

      for (const booking of bookings) {
        try {
          const result = await this.sendNotification(templateType, booking);

          if (result.success) {
            await this.logNotification(booking.id_agendamento, templateType, true, result.messageId);
            sentCount++;
          } else {
            await this.logNotification(booking.id_agendamento, templateType, false, result.message);
            failedCount++;
          }

          // Pequena pausa para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Erro ao enviar lembrete para agendamento ${booking.id_agendamento}:`, error);
          failedCount++;
        }
      }

      console.log(`📊 Lembretes ${templateType}: ${sentCount} enviados, ${failedCount} falharam`);

    } catch (error) {
      console.error(`Erro ao enviar lembretes ${templateType}:`, error);
    }
  }

  /**
   * Registrar envio de notificação no banco
   */
  async logNotification(bookingId, type, success, messageId = null) {
    try {
      await Agendamento.query(`
        INSERT INTO notificacoes (id_agendamento, tipo, enviada, message_id, enviada_em)
        VALUES ($1, $2, $3, $4, $5)
      `, [bookingId, type, success, messageId, new Date()]);
    } catch (error) {
      console.warn('Erro ao registrar notificação:', error);
    }
  }

  /**
   * Obter estatísticas de notificações
   */
  async getNotificationStats(userId = null, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = `
        SELECT
          tipo,
          COUNT(*) as total,
          COUNT(CASE WHEN enviada = true THEN 1 END) as enviadas,
          COUNT(CASE WHEN enviada = false THEN 1 END) as falhas
        FROM notificacoes n
        JOIN agendamentos a ON n.id_agendamento = a.id_agendamento
        WHERE n.enviada_em >= $1
      `;

      const params = [startDate];

      if (userId) {
        query += ' AND a.id_usuario = $2';
        params.push(userId);
      }

      query += `
        GROUP BY tipo
        ORDER BY tipo
      `;

      const stats = await Agendamento.query(query, params);

      return {
        period: `${days} dias`,
        userId,
        notifications: stats,
        summary: {
          total: stats.reduce((sum, stat) => sum + parseInt(stat.total), 0),
          sent: stats.reduce((sum, stat) => sum + parseInt(stat.enviadas), 0),
          failed: stats.reduce((sum, stat) => sum + parseInt(stat.falhas), 0)
        }
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas de notificações:', error);
      return { error: error.message };
    }
  }

  /**
   * Testar envio de notificação
   */
  async testNotification(whatsapp, type = 'booking_created') {
    try {
      const mockBooking = {
        cliente_nome: 'Cliente Teste',
        cliente_whatsapp: whatsapp,
        data_agendamento: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
        servico_nome: 'Corte de Cabelo',
        valor: 25.00,
        usuario_nome: 'Barbearia Teste'
      };

      console.log(`🧪 Enviando notificação de teste (${type}) para ${whatsapp}`);
      const result = await this.sendNotification(type, mockBooking, whatsapp);

      return {
        success: true,
        message: 'Notificação de teste enviada',
        result
      };

    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Configurar lembretes para um usuário
   */
  async configureReminders(userId, settings) {
    try {
      // Salvar configurações de lembretes no banco
      await Usuario.query(`
        UPDATE usuarios
        SET config_notificacoes = $1, updated_at = NOW()
        WHERE id_usuario = $2
      `, [JSON.stringify(settings), userId]);

      return {
        success: true,
        message: 'Configurações de lembretes atualizadas',
        settings
      };

    } catch (error) {
      console.error('Erro ao configurar lembretes:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obter configurações de lembretes de um usuário
   */
  async getReminderSettings(userId) {
    try {
      const user = await Usuario.findById(userId);
      return user?.config_notificacoes ? JSON.parse(user.config_notificacoes) : {
        enabled: true,
        reminders: {
          '24h': true,
          '2h': true,
          '30m': true
        },
        customMessage: null
      };

    } catch (error) {
      console.error('Erro ao obter configurações de lembretes:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();
