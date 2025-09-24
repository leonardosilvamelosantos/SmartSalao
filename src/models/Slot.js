const BaseModel = require('./BaseModel');

class Slot extends BaseModel {
  constructor() {
    super('slots', 'id_slot');
  }

  /**
   * Buscar slots por usuário e período
   */
  async findByUsuarioAndPeriod(idUsuario, startDate, endDate, status = null) {
    let query = `
      SELECT * FROM slots
      WHERE id_usuario = $1
      AND start_at >= $2
      AND start_at <= $3
    `;

    const values = [idUsuario, startDate, endDate];
    let paramCount = 4;

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY start_at ASC`;

    return await this.query(query, values);
  }

  /**
   * Buscar slots livres por período
   */
  async findFreeSlots(idUsuario, startDate, endDate) {
    return await this.findByUsuarioAndPeriod(idUsuario, startDate, endDate, 'free');
  }

  /**
   * Reservar slots para um agendamento
   */
  async reserveSlots(idUsuario, startAt, durationMin, idAgendamento) {
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);

    // Buscar slots que se sobrepõem ao período necessário
    const overlappingSlots = await this.query(`
      SELECT * FROM slots
      WHERE id_usuario = $1
      AND start_at < $2
      AND end_at > $3
      AND status = 'free'
      ORDER BY start_at ASC
    `, [idUsuario, endDate, startDate]);

    if (overlappingSlots.length === 0) {
      throw new Error('Nenhum slot livre encontrado para o período solicitado');
    }

    // Verificar se os slots encontrados cobrem completamente o período necessário
    const slotsStart = new Date(overlappingSlots[0].start_at);
    const slotsEnd = new Date(overlappingSlots[overlappingSlots.length - 1].end_at);

    if (slotsStart > startDate || slotsEnd < endDate) {
      throw new Error('Slots disponíveis não cobrem completamente o período necessário');
    }

    // Reservar os slots
    const slotIds = overlappingSlots.map(slot => slot.id_slot);
    const updateQuery = `
      UPDATE slots
      SET status = 'reserved', id_agendamento = $1, updated_at = now()
      WHERE id_slot = ANY($2)
      RETURNING *
    `;

    const result = await this.query(updateQuery, [idAgendamento, slotIds]);
    return result;
  }

  /**
   * Liberar slots de um agendamento (cancelamento)
   */
  async releaseSlots(idAgendamento) {
    const query = `
      UPDATE slots
      SET status = 'free', id_agendamento = NULL, updated_at = now()
      WHERE id_agendamento = $1
      RETURNING *
    `;
    const result = await this.query(query, [idAgendamento]);
    return result;
  }

  /**
   * Confirmar reserva de slots (marcar como booked)
   */
  async confirmSlots(idAgendamento) {
    const query = `
      UPDATE slots
      SET status = 'booked', updated_at = now()
      WHERE id_agendamento = $1
      RETURNING *
    `;
    const result = await this.query(query, [idAgendamento]);
    return result;
  }

  /**
   * Bloquear slots (manualmente)
   */
  async blockSlots(idUsuario, startAt, endAt, reason = null) {
    // Criar slots bloqueados se não existirem
    const slots = await this.generateSlotsForPeriod(idUsuario, startAt, endAt);

    const slotIds = slots.map(slot => slot.id_slot);
    const updateQuery = `
      UPDATE slots
      SET status = 'blocked', updated_at = now()
      WHERE id_slot = ANY($1)
      RETURNING *
    `;

    const result = await this.query(updateQuery, [slotIds]);
    return result;
  }

  /**
   * Gerar slots para um período específico
   */
  async generateSlotsForPeriod(idUsuario, startDate, endDate) {
    const Usuario = require('./Usuario');
    const usuario = await Usuario.findById(idUsuario);

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const intervaloMin = usuario.intervalo_min || 15;
    const slots = [];

    let currentTime = new Date(startDate);

    while (currentTime < endDate) {
      const slotEnd = new Date(currentTime.getTime() + intervaloMin * 60000);

      // Verificar se o slot já existe
      const existingSlot = await this.query(`
        SELECT id_slot FROM slots
        WHERE id_usuario = $1 AND start_at = $2 AND end_at = $3
      `, [idUsuario, currentTime, slotEnd]);

      if (existingSlot.length === 0) {
        // Criar novo slot
        const newSlot = await this.create({
          id_usuario: idUsuario,
          start_at: currentTime,
          end_at: slotEnd,
          status: 'free'
        });
        slots.push(newSlot);
      }

      currentTime = slotEnd;
    }

    return slots;
  }

  /**
   * Limpar slots antigos (manutenção)
   */
  async cleanupOldSlots(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const query = `
      DELETE FROM slots
      WHERE start_at < $1
      AND status IN ('free', 'blocked')
      AND id_agendamento IS NULL
    `;

    const result = await this.query(query, [cutoffDate]);
    return result.length;
  }

  /**
   * Buscar slots disponíveis para um serviço específico
   */
  async findAvailableForService(idUsuario, idServico, startDate, endDate) {
    const Servico = require('./Servico');
    const servico = await Servico.findById(idServico);

    if (!servico) {
      throw new Error('Serviço não encontrado');
    }

    // Calcular quantos slots consecutivos são necessários
    const Usuario = require('./Usuario');
    const usuario = await Usuario.findById(idUsuario);
    const slotsNeeded = Math.ceil(servico.duracao_min / usuario.intervalo_min);

    // Buscar grupos de slots consecutivos livres
    const query = `
      SELECT * FROM (
        SELECT
          s.*,
          ROW_NUMBER() OVER (ORDER BY s.start_at) as row_num,
          s.start_at - (ROW_NUMBER() OVER (ORDER BY s.start_at) * INTERVAL '${usuario.intervalo_min} minutes') as grp
        FROM slots s
        WHERE a.id_usuario = $1
        AND s.start_at >= $2
        AND s.start_at <= $3
        AND s.status = 'free'
        ORDER BY s.start_at
      ) grouped
      GROUP BY grp
      HAVING COUNT(*) >= $4
      ORDER BY MIN(start_at)
    `;

    const availableGroups = await this.query(query, [idUsuario, startDate, endDate, slotsNeeded]);

    return availableGroups;
  }
}

module.exports = new Slot();
