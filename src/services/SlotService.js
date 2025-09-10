const Slot = require('../models/Slot');
const Usuario = require('../models/Usuario');

/**
 * Serviço responsável por gerar e gerenciar slots de horário
 */
class SlotService {
  /**
   * Gerar slots para um usuário por um período
   */
  async generateSlotsForUser(idUsuario, startDate, endDate) {
    const usuario = await Usuario.findById(idUsuario);

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const configHorarios = usuario.config_horarios || [];
    const intervaloMin = usuario.intervalo_min || 15;
    const timezone = usuario.timezone || 'America/Sao_Paulo';

    const generatedSlots = [];

    // Iterar por cada dia no período
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.

      // Verificar se há configuração para este dia da semana
      const dayConfig = configHorarios.find(config => config.dia === dayOfWeek);

      if (dayConfig) {
        const slotsForDay = await this.generateSlotsForDay(
          idUsuario,
          currentDate,
          dayConfig,
          intervaloMin
        );
        generatedSlots.push(...slotsForDay);
      }

      // Próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return generatedSlots;
  }

  /**
   * Gerar slots para um dia específico
   */
  async generateSlotsForDay(idUsuario, date, dayConfig, intervaloMin) {
    const slots = [];

    if (!dayConfig.inicio || !dayConfig.fim) {
      return slots; // Dia sem horário configurado
    }

    // Parse dos horários
    const [startHour, startMinute] = dayConfig.inicio.split(':').map(Number);
    const [endHour, endMinute] = dayConfig.fim.split(':').map(Number);

    // Criar data de início
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    // Criar data de fim
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Gerar slots dentro do horário de funcionamento
    let currentTime = new Date(startDateTime);

    while (currentTime < endDateTime) {
      const slotEnd = new Date(currentTime.getTime() + intervaloMin * 60000);

      // Só criar slot se não ultrapassar o horário de fim
      if (slotEnd <= endDateTime) {
        // Verificar se o slot já existe
        const existingSlot = await Slot.query(`
          SELECT id_slot FROM slots
          WHERE id_usuario = $1 AND start_at = $2
        `, [idUsuario, currentTime]);

        if (existingSlot.length === 0) {
          const newSlot = await Slot.create({
            id_usuario: idUsuario,
            start_at: currentTime,
            end_at: slotEnd,
            status: 'free'
          });
          slots.push(newSlot);
        }
      }

      currentTime = new Date(currentTime.getTime() + intervaloMin * 60000);
    }

    return slots;
  }

  /**
   * Gerar slots para os próximos N dias
   */
  async generateSlotsForNextDays(idUsuario, daysAhead = 30) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return await this.generateSlotsForUser(idUsuario, startDate, endDate);
  }

  /**
   * Atualizar slots após mudança na configuração do usuário
   */
  async updateSlotsForUser(idUsuario) {
    const usuario = await Usuario.findById(idUsuario);

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Limpar slots futuros livres (não reservados)
    await Slot.query(`
      DELETE FROM slots
      WHERE id_usuario = $1
      AND start_at > now()
      AND status = 'free'
      AND id_agendamento IS NULL
    `, [idUsuario]);

    // Regenerar slots para os próximos 60 dias (config padrão)
    const maxAdvanceDays = usuario.max_advance_days || 60;
    await this.generateSlotsForNextDays(idUsuario, maxAdvanceDays);

    return { message: 'Slots atualizados com sucesso' };
  }

  /**
   * Buscar horários disponíveis para um serviço
   */
  async getAvailableSlots(idUsuario, idServico, date) {
    const Servico = require('../models/Servico');
    const servico = await Servico.findById(idServico);

    if (!servico) {
      throw new Error('Serviço não encontrado');
    }

    const usuario = await Usuario.findById(idUsuario);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Definir período do dia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar slots disponíveis
    const availableSlots = await Slot.findAvailableForService(
      idUsuario,
      idServico,
      startOfDay,
      endOfDay
    );

    return availableSlots;
  }

  /**
   * Verificar se um horário específico está disponível
   */
  async checkSlotAvailability(idUsuario, startAt, durationMin) {
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Buscar slots que se sobrepõem ao período necessário
    const overlappingSlots = await Slot.query(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'free' THEN 1 END) as free_count
      FROM slots
      WHERE id_usuario = $1
      AND start_at < $2
      AND end_at > $3
    `, [idUsuario, endDate, startDate]);

    if (overlappingSlots.length === 0 || overlappingSlots[0].total === 0) {
      return { available: false, reason: 'Nenhum slot encontrado para este período' };
    }

    const { total, free_count } = overlappingSlots[0];

    if (free_count < total) {
      return { available: false, reason: 'Alguns slots estão ocupados' };
    }

    return { available: true };
  }

  /**
   * Reservar slots para um agendamento
   */
  async reserveSlotsForBooking(idUsuario, startAt, durationMin, idAgendamento) {
    // Verificar disponibilidade primeiro
    const availability = await this.checkSlotAvailability(idUsuario, startAt, durationMin);

    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Reservar os slots
    const reservedSlots = await Slot.reserveSlots(idUsuario, startAt, durationMin, idAgendamento);

    return reservedSlots;
  }

  /**
   * Liberar slots de um agendamento cancelado
   */
  async releaseSlotsForBooking(idAgendamento) {
    const releasedSlots = await Slot.releaseSlots(idAgendamento);
    return releasedSlots;
  }

  /**
   * Confirmar slots de um agendamento
   */
  async confirmSlotsForBooking(idAgendamento) {
    const confirmedSlots = await Slot.confirmSlots(idAgendamento);
    return confirmedSlots;
  }

  /**
   * Limpeza periódica de slots antigos
   */
  async cleanupOldSlots(daysOld = 30) {
    const deletedCount = await Slot.cleanupOldSlots(daysOld);
    return { deletedCount, message: `${deletedCount} slots antigos removidos` };
  }

  /**
   * Obter estatísticas dos slots
   */
  async getSlotStats(idUsuario) {
    const stats = await Slot.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM slots
      WHERE id_usuario = $1
      GROUP BY status
    `, [idUsuario]);

    const totalSlots = stats.reduce((sum, stat) => sum + parseInt(stat.count), 0);

    return {
      total: totalSlots,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {}),
      utilizationRate: totalSlots > 0 ?
        ((stats.find(s => s.status === 'free')?.count || 0) / totalSlots * 100).toFixed(2) :
        0
    };
  }
}

module.exports = new SlotService();
