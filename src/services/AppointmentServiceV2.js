/**
 * Serviço Otimizado de Agendamentos v2
 * Lógica de negócio com foco em performance e concorrência
 * Refatorado para eliminar duplicações usando utilitários centralizados
 */
const pool = require('../config/database');
const moment = require('moment-timezone');
const { ValidationQueries, SlotOperations, PaginationUtils } = require('../utils/databaseUtils');
const { CONFIG, STATUS } = require('../constants');

class AppointmentServiceV2 {
  constructor() {
    this.DEFAULT_TIMEZONE = 'America/Sao_Paulo';
  }

  // ====================
  // SERVIÇOS
  // ====================

  /**
   * Busca serviços disponíveis de um barbeiro com paginação
   */
  async getServices(barberId, options = {}) {
    const { page = 1, limit = 20, active = true } = options;
    const offset = (page - 1) * limit;

    try {
      // Query otimizada com JOIN
      const query = `
        SELECT
          s.id_servico as id,
          s.nome_servico as name,
          s.duracao_min as duration_minutes,
          s.valor as price,
          s.descricao as description,
          s.ativo as is_active,
          s.created_at,
          COUNT(a.id_agendamento) as total_appointments
        FROM servicos s
        LEFT JOIN agendamentos a ON s.id_servico = a.id_servico
          AND a.status IN ('confirmed', 'completed')
          AND a.start_at >= NOW() - INTERVAL '30 days'
        WHERE s.id_usuario = $1
          AND ($2::boolean IS NULL OR s.ativo = $2)
        GROUP BY s.id_servico, s.nome_servico, s.duracao_min, s.valor, s.descricao, s.ativo, s.created_at
        ORDER BY s.ativo DESC, s.nome_servico ASC
        LIMIT $3 OFFSET $4
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM servicos
        WHERE id_usuario = $1 AND ($2::boolean IS NULL OR ativo = $2)
      `;

      const [servicesResult, countResult] = await Promise.all([
        pool.query(query, [barberId, active, limit, offset]),
        pool.query(countQuery, [barberId, active])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: {
          services: servicesResult.rows,
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
          }
        },
        _links: this.generatePaginationLinks(`/api/v2/barbers/${barberId}/services`, {
          page, limit, total_pages: totalPages, active
        })
      };

    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      throw error;
    }
  }

  // ====================
  // DISPONIBILIDADE
  // ====================

  /**
   * Busca dias disponíveis para agendamento
   */
  async getAvailableDays(barberId, serviceId, startDate, endDate, timezone = this.DEFAULT_TIMEZONE) {
    try {
      // Primeiro, verificar se serviço existe e obter duração
      const serviceQuery = `
        SELECT id_servico, duracao_min, ativo
        FROM servicos
        WHERE id_usuario = $1 AND id_servico = $2 AND ativo = true
      `;

      const serviceResult = await pool.query(serviceQuery, [barberId, serviceId]);

      if (serviceResult.rows.length === 0) {
        const error = new Error('Serviço não encontrado');
        error.code = 'SERVICE_NOT_FOUND';
        throw error;
      }

      const service = serviceResult.rows[0];
      const durationMinutes = service.duracao_min;

      // Query otimizada para dias disponíveis
      const query = `
        WITH available_days AS (
          SELECT
            DATE(s.start_at AT TIME ZONE $5) as local_date,
            COUNT(*) as total_slots,
            COUNT(*) FILTER (WHERE s.status = 'free') as free_slots
          FROM slots s
          WHERE s.id_usuario = $1
            AND s.start_at >= $3::timestamptz
            AND s.end_at <= $4::timestamptz + INTERVAL '1 day'
            AND s.status IN ('free', 'booked')
          GROUP BY DATE(s.start_at AT TIME ZONE $5)
          HAVING COUNT(*) FILTER (WHERE s.status = 'free') > 0
        ),
        day_schedule AS (
          SELECT
            DATE(s.start_at AT TIME ZONE $5) as local_date,
            MIN(s.start_at AT TIME ZONE $5) as first_slot,
            MAX(s.end_at AT TIME ZONE $5) as last_slot
          FROM slots s
          WHERE s.id_usuario = $1
            AND s.start_at >= $3::timestamptz
            AND s.end_at <= $4::timestamptz + INTERVAL '1 day'
          GROUP BY DATE(s.start_at AT TIME ZONE $5)
        )
        SELECT
          ad.local_date as date,
          TO_CHAR(ad.local_date, 'Day') as weekday,
          TO_CHAR(ad.local_date, 'Dy DD/MM') as display_name,
          ad.free_slots as available_slots,
          TO_CHAR(ds.first_slot, 'HH24:MI') || ' - ' || TO_CHAR(ds.last_slot, 'HH24:MI') as time_range
        FROM available_days ad
        JOIN day_schedule ds ON ad.local_date = ds.local_date
        ORDER BY ad.local_date ASC
      `;

      const result = await pool.query(query, [
        barberId,
        serviceId,
        startDate,
        endDate,
        timezone
      ]);

      return {
        data: {
          barber_id: barberId,
          service_id: serviceId,
          timezone,
          available_days: result.rows,
          period: {
            start_date: startDate,
            end_date: endDate,
            total_days_checked: result.rows.length,
            days_with_availability: result.rows.length
          }
        },
        _links: {
          self: `/api/v2/barbers/${barberId}/availability/days?service_id=${serviceId}&start_date=${startDate}&end_date=${endDate}`,
          service: `/api/v2/barbers/${barberId}/services/${serviceId}`
        }
      };

    } catch (error) {
      console.error('Erro ao buscar dias disponíveis:', error);
      throw error;
    }
  }

  /**
   * Busca horários disponíveis para um dia específico
   */
  async getAvailableSlots(barberId, serviceId, date, timezone, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    try {
      // Obter duração do serviço
      const serviceQuery = await pool.query(
        'SELECT duracao_min FROM servicos WHERE id_usuario = $1 AND id_servico = $2 AND ativo = true',
        [barberId, serviceId]
      );

      if (serviceQuery.rows.length === 0) {
        const error = new Error('Serviço não encontrado');
        error.code = 'SERVICE_NOT_FOUND';
        throw error;
      }

      const durationMinutes = serviceQuery.rows[0].duracao_min;

      // Query otimizada para slots disponíveis
      const query = `
        WITH available_slots AS (
          SELECT
            s.id_slot,
            s.start_at,
            s.end_at,
            s.start_at AT TIME ZONE $6 as local_start,
            s.end_at AT TIME ZONE $6 as local_end,
            ROW_NUMBER() OVER (ORDER BY s.start_at ASC) as row_num,
            COUNT(*) OVER() as total_count
          FROM slots s
          WHERE s.id_usuario = $1
            AND DATE(s.start_at AT TIME ZONE $6) = $3::date
            AND s.status = 'free'
            AND NOT EXISTS (
              SELECT 1 FROM slots s2
              WHERE s2.id_usuario = s.id_usuario
                AND s2.start_at < s.end_at
                AND s2.end_at > s.start_at
                AND s2.status = 'booked'
            )
          ORDER BY s.start_at ASC
        )
        SELECT
          id_slot as slot_id,
          TO_CHAR(local_start, 'HH24:MI') as start_time,
          TO_CHAR(local_end, 'HH24:MI') as end_time,
          start_at as datetime_utc,
          local_start as datetime_local,
          $5 as duration_minutes,
          true as is_available,
          total_count
        FROM available_slots
        WHERE row_num > $7 AND row_num <= $7 + $4
        ORDER BY local_start ASC
      `;

      const result = await pool.query(query, [
        barberId,
        serviceId,
        date,
        limit,
        durationMinutes,
        timezone,
        offset
      ]);

      const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(total / limit);

      // Estatísticas do dia
      const statsQuery = `
        SELECT
          COUNT(*) as total_slots,
          COUNT(*) FILTER (WHERE status = 'free') as available_slots,
          COUNT(*) FILTER (WHERE status = 'booked') as booked_slots,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'booked'))::numeric /
            NULLIF(COUNT(*), 0) * 100, 1
          ) as utilization_percentage
        FROM slots
        WHERE id_usuario = $1
          AND DATE(start_at AT TIME ZONE $2) = $3::date
      `;

      const statsResult = await pool.query(statsQuery, [barberId, timezone, date]);

      return {
        data: {
          barber_id: barberId,
          service_id: serviceId,
          date,
          timezone,
          available_slots: result.rows.map(row => {
            const { total_count, ...slot } = row;
            return slot;
          }),
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
          },
          summary: statsResult.rows[0] || {
            total_slots: 0,
            available_slots: 0,
            booked_slots: 0,
            utilization_percentage: 0
          }
        },
        _links: {
          self: `/api/v2/barbers/${barberId}/availability/slots?date=${date}&service_id=${serviceId}&page=${page}&limit=${limit}`,
          days: `/api/v2/barbers/${barberId}/availability/days?service_id=${serviceId}&start_date=${date}&end_date=${date}`
        }
      };

    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
      throw error;
    }
  }

  // ====================
  // AGENDAMENTOS
  // ====================

  /**
   * Cria agendamento com controle de concorrência
   */
  async createAppointmentWithLock(client, barberId, appointmentData) {
    const {
      service_id,
      slot_start_datetime,
      customer,
      notes,
      idempotency_key
    } = appointmentData;

    try {
      // 1. Verificar serviço usando utilitário
      const service = await ValidationQueries.validateService(barberId, service_id);

      const slotStart = new Date(slot_start_datetime);
      const slotEnd = new Date(slotStart.getTime() + service.duracao_min * 60000);

      // 2. Verificar slots disponíveis usando utilitário
      const availableSlots = await ValidationQueries.checkSlotAvailability(
        client,
        barberId,
        slotStart.toISOString(),
        slotEnd.toISOString()
      );

      // 3. Validar se há slots suficientes
      const requiredSlots = SlotOperations.calculateRequiredSlots(service.duracao_min);
      SlotOperations.validateSlotAvailability(availableSlots, requiredSlots);

      // 4. Verificar/criar cliente usando utilitário
      const customerRecord = await ValidationQueries.getOrCreateCustomer(client, barberId, customer);
      const customerId = customerRecord.id_cliente;

      // 5. Criar agendamento
      const appointmentResult = await client.query(
        `INSERT INTO agendamentos (
          id_usuario, id_servico, id_cliente, start_at, end_at,
          status, valor_total, observacoes, created_at, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        RETURNING id_agendamento`,
        [
          barberId,
          service_id,
          customerId,
          slotStart.toISOString(),
          slotEnd.toISOString(),
          STATUS.APPOINTMENT.CONFIRMED,
          service.valor,
          notes || null,
          idempotency_key
        ]
      );

      const appointmentId = appointmentResult.rows[0].id_agendamento;

      // 6. Reservar slots usando utilitário
      const slotIds = availableSlots.map(slot => slot.id_slot);
      await SlotOperations.reserveSlots(client, slotIds, appointmentId);

      // 6. Retornar dados completos
      const fullAppointment = await this.getAppointmentById(barberId, appointmentId);

      return {
        ...fullAppointment,
        _links: {
          self: `/api/v2/barbers/${barberId}/appointments/${appointmentId}`,
          cancel: `/api/v2/barbers/${barberId}/appointments/${appointmentId}/cancel`,
          customer: `/api/v2/barbers/${barberId}/customers/${customerId}`
        }
      };

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      throw error;
    }
  }

  /**
   * Cancela agendamento com controle de concorrência
   */
  async cancelAppointmentWithLock(client, barberId, appointmentId, options = {}) {
    const { reason, notify_customer = true } = options;

    try {
      // 1. Buscar agendamento usando utilitário
      const appointment = await ValidationQueries.validateAppointment(barberId, appointmentId);

      // 2. Verificar se pode cancelar usando utilitário de regras de negócio
      // Esta validação foi movida para um utilitário separado para reuso

      // 3. Verificar regras de negócio específicas de cancelamento
      if (appointment.status === STATUS.APPOINTMENT.CANCELLED) {
        const error = new Error('Agendamento já foi cancelado');
        error.code = 'APPOINTMENT_CANNOT_CANCEL';
        error.details = 'Agendamento já está cancelado';
        throw error;
      }

      if (appointment.status === STATUS.APPOINTMENT.COMPLETED) {
        const error = new Error('Não é possível cancelar agendamento já realizado');
        error.code = 'APPOINTMENT_CANNOT_CANCEL';
        error.details = 'Agendamento já foi realizado';
        throw error;
      }

      // Verificar tempo mínimo para cancelamento (2 horas antes)
      const now = new Date();
      const appointmentTime = new Date(appointment.start_at);
      const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 2) {
        const error = new Error('Cancelamento deve ser feito com pelo menos 2 horas de antecedência');
        error.code = 'APPOINTMENT_CANNOT_CANCEL';
        error.details = `Faltam ${hoursUntilAppointment.toFixed(1)} horas para o agendamento`;
        throw error;
      }

      // 4. Liberar slots usando utilitário
      const slotsFreed = await SlotOperations.releaseSlots(client, appointmentId);

      // 5. Atualizar agendamento
      await client.query(
        `UPDATE agendamentos
         SET status = $1, cancelled_at = NOW(), cancel_reason = $2
         WHERE id_agendamento = $3`,
        [STATUS.APPOINTMENT.CANCELLED, reason || null, appointmentId]
      );

      return {
        appointment_id: appointmentId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        refunded_slots: slotsFreed.rows.length,
        service_id: appointment.id_servico,
        start_datetime: appointment.start_at,
        notification_sent: notify_customer,
        _links: {
          self: `/api/v2/barbers/${barberId}/appointments/${appointmentId}`,
          reschedule: `/api/v2/barbers/${barberId}/availability/days?service_id=${appointment.id_servico}`
        }
      };

    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      throw error;
    }
  }

  // ====================
  // HELPERS
  // ====================

  /**
   * Verifica chave de idempotência
   */
  async checkIdempotency(idempotencyKey) {
    try {
      const result = await pool.query(
        'SELECT * FROM agendamentos WHERE idempotency_key = $1',
        [idempotencyKey]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Erro ao verificar idempotency:', error);
      return null;
    }
  }

  /**
   * Busca agendamento por ID
   */
  async getAppointmentById(barberId, appointmentId) {
    try {
      const query = `
        SELECT
          a.id_agendamento as id,
          a.id_usuario as barber_id,
          a.id_servico as service_id,
          a.id_cliente as customer_id,
          a.start_at,
          a.end_at,
          a.status,
          a.valor_total as total_price,
          a.observacoes as notes,
          a.created_at,
          a.cancelled_at,
          a.cancel_reason,
          s.nome_servico as service_name,
          s.duracao_min as service_duration,
          c.nome as customer_name,
          c.whatsapp as customer_phone,
          c.email as customer_email
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE a.id_agendamento = $1 AND a.id_usuario = $2
      `;

      const result = await pool.query(query, [appointmentId, barberId]);

      if (result.rows.length === 0) {
        return null;
      }

      const appointment = result.rows[0];

      return {
        ...appointment,
        _links: {
          self: `/api/v2/barbers/${barberId}/appointments/${appointmentId}`,
          cancel: `/api/v2/barbers/${barberId}/appointments/${appointmentId}/cancel`,
          customer: `/api/v2/barbers/${barberId}/customers/${appointment.customer_id}`,
          service: `/api/v2/barbers/${barberId}/services/${appointment.service_id}`
        }
      };

    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      throw error;
    }
  }

  /**
   * Lista agendamentos com filtros
   */
  async getAppointments(barberId, filters = {}) {
    const { page = 1, limit = 20, status, start_date, end_date } = filters;
    const offset = (page - 1) * limit;

    try {
      let whereConditions = ['a.id_usuario = $1'];
      let params = [barberId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`a.start_at >= $${paramIndex}::timestamptz`);
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`a.end_at <= $${paramIndex}::timestamptz`);
        params.push(end_date);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT
          a.id_agendamento as id,
          a.start_at,
          a.end_at,
          a.status,
          a.valor_total as total_price,
          a.created_at,
          s.nome_servico as service_name,
          c.nome as customer_name,
          c.whatsapp as customer_phone
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE ${whereClause}
        ORDER BY a.start_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM agendamentos a
        WHERE ${whereClause}
      `;

      const [appointmentsResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, -2)) // Remove limit e offset
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: {
          appointments: appointmentsResult.rows,
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
          }
        },
        _links: this.generatePaginationLinks(`/api/v2/barbers/${barberId}/appointments`, {
          page, limit, total_pages: totalPages, status, start_date, end_date
        })
      };

    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      throw error;
    }
  }

  // ====================
  // MÉTODOS REMOVIDOS - SUBSTITUÍDOS POR UTILITÁRIOS
  // ====================

  // generatePaginationLinks() - substituído por PaginationUtils.generatePaginationLinks
  // buildUrl() - substituído por PaginationUtils.buildUrl
}

module.exports = AppointmentServiceV2;
