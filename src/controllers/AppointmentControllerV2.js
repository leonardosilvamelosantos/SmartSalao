/**
 * Controller Otimizado para Agendamentos v2
 * API REST melhorada com foco em performance e concorrência
 * Refatorado para eliminar duplicações usando utilitários centralizados
 */
const AppointmentServiceV2 = require('../services/AppointmentServiceV2');
const CacheService = require('../services/CacheService');
const { TransactionManager, PaginationUtils, CacheUtils } = require('../utils/databaseUtils');
const { ParameterValidation, BusinessValidation } = require('../utils/validationUtils');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const { CONFIG, CACHE_CONFIG } = require('../constants');

class AppointmentControllerV2 {
  constructor() {
    this.appointmentService = new AppointmentServiceV2();
    this.cacheService = new CacheService();
  }

  // ====================
  // SERVIÇOS DISPONÍVEIS
  // ====================

  /**
   * Lista serviços disponíveis de um barbeiro
   * GET /api/v2/barbers/:barberId/services
   */
  async getServices(req, res) {
    try {
      const { barberId } = req.params;
      const { page, limit, active = true } = req.query;

      // Validações usando utilitários centralizados
      const barberIdNum = ParameterValidation.validateId(barberId, 'ID do barbeiro');
      const { page: pageNum, limit: limitNum } = PaginationUtils.normalizePagination(page, limit);

      // Cache key padronizado
      const cacheKey = CacheUtils.generateKey('services', barberIdNum, pageNum, limitNum, active);
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return ApiResponse.success(cached.data, 'Dados do cache')
          .withLinks(cached._links)
          .send(res);
      }

      // Buscar serviços
      const result = await this.appointmentService.getServices(
        barberIdNum,
        { page: pageNum, limit: limitNum, active: active === 'true' }
      );

      // Cache com TTL padronizado
      await this.cacheService.set(cacheKey, result, CACHE_CONFIG.services.ttl);

      return ApiResponse.success(result.data, 'Serviços encontrados')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // DISPONIBILIDADE
  // ====================

  /**
   * Lista dias disponíveis para agendamento
   * GET /api/v2/barbers/:barberId/availability/days
   */
  async getAvailableDays(req, res) {
    try {
      const { barberId } = req.params;
      const {
        service_id,
        start_date,
        end_date,
        timezone = 'America/Sao_Paulo'
      } = req.query;

      // Validação obrigatória
      if (!service_id || !start_date || !end_date) {
        return ApiError.badRequest('Parâmetros obrigatórios: service_id, start_date, end_date').send(res);
      }

      // Validação de datas
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const maxDays = 30;

      if (startDate > endDate) {
        return ApiError.badRequest('Data inicial deve ser anterior à data final').send(res);
      }

      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (diffDays > maxDays) {
        return ApiError.badRequest(`Período máximo de ${maxDays} dias excedido`).send(res);
      }

      // Cache key
      const cacheKey = `availability_days:${barberId}:${service_id}:${start_date}:${end_date}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return ApiResponse.success(cached.data, 'Dados do cache')
          .withLinks(cached._links)
          .send(res);
      }

      // Buscar dias disponíveis
      const result = await this.appointmentService.getAvailableDays(
        barberId,
        service_id,
        start_date,
        end_date,
        timezone
      );

      // Cache por 15 minutos
      await this.cacheService.set(cacheKey, result, 900);

      return ApiResponse.success(result.data, 'Dias disponíveis encontrados')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao buscar dias disponíveis:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Lista horários disponíveis para um dia específico
   * GET /api/v2/barbers/:barberId/availability/slots
   */
  async getAvailableSlots(req, res) {
    try {
      const { barberId } = req.params;
      const {
        service_id,
        date,
        timezone = 'America/Sao_Paulo',
        page = 1,
        limit = 10
      } = req.query;

      // Validação obrigatória
      if (!service_id || !date) {
        return ApiError.badRequest('Parâmetros obrigatórios: service_id, date').send(res);
      }

      // Validação de paginação
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 20); // Max 20

      if (pageNum < 1 || limitNum < 1) {
        return ApiError.badRequest('Parâmetros de paginação inválidos').send(res);
      }

      // Cache key
      const cacheKey = `availability_slots:${barberId}:${service_id}:${date}:${pageNum}:${limitNum}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return ApiResponse.success(cached.data, 'Dados do cache')
          .withLinks(cached._links)
          .send(res);
      }

      // Buscar slots disponíveis
      const result = await this.appointmentService.getAvailableSlots(
        barberId,
        service_id,
        date,
        timezone,
        { page: pageNum, limit: limitNum }
      );

      // Cache por 5 minutos
      await this.cacheService.set(cacheKey, result, 300);

      return ApiResponse.success(result.data, 'Horários disponíveis encontrados')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // AGENDAMENTOS
  // ====================

  /**
   * Criar novo agendamento com controle de concorrência
   * POST /api/v2/barbers/:barberId/appointments
   */
  async createAppointment(req, res) {
    const transactionManager = new TransactionManager();

    try {
      const { barberId } = req.params;
      const appointmentData = req.body;

      // Validações usando utilitários centralizados
      const barberIdNum = ParameterValidation.validateId(barberId, 'ID do barbeiro');
      const validatedData = ParameterValidation.validateAppointment(appointmentData);

      // Verificar idempotency key (opcional)
      const idempotencyKey = BusinessValidation.validateIdempotencyKey(
        req.headers['x-idempotency-key']
      );

      if (idempotencyKey) {
        const existingBooking = await this.appointmentService.checkIdempotency(idempotencyKey);
        if (existingBooking) {
          return ApiResponse.success(existingBooking, 'Agendamento já existe (idempotency)')
            .withLinks(existingBooking._links)
            .send(res);
        }
      }

      // Executar operação dentro de transação com lock
      const result = await transactionManager.executeInTransaction(async (client) => {
        return await this.appointmentService.createAppointmentWithLock(
          client,
          barberIdNum,
          {
            ...validatedData,
            idempotency_key: idempotencyKey
          }
        );
      }, barberIdNum);

      // Invalidar caches relacionados
      await CacheUtils.invalidateAppointmentCache(
        this.cacheService,
        barberIdNum,
        validatedData.service_id,
        validatedData.slot_start_datetime
      );

      return ApiResponse.created(result, 'Agendamento criado com sucesso')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);

      // Tratamento específico de erros usando códigos padronizados
      if (error.code === 'SLOT_NOT_AVAILABLE') {
        return ApiError.conflict('Horário não está mais disponível')
          .withDetails(error.details)
          .withSuggestion('Escolha outro horário disponível')
          .withLinks({
            retry: `/api/v2/barbers/${barberId}/availability/slots?date=${appointmentData.slot_start_datetime?.split('T')[0]}&service_id=${appointmentData.service_id}`
          })
          .send(res);
      }

      if (error.code === 'SERVICE_NOT_FOUND') {
        return ApiError.notFound('Serviço não encontrado').send(res);
      }

      return ApiError.internal('Erro interno do servidor').send(res);
    } finally {
      transactionManager.release();
    }
  }

  /**
   * Cancelar agendamento
   * POST /api/v2/barbers/:barberId/appointments/:appointmentId/cancel
   */
  async cancelAppointment(req, res) {
    const transactionManager = new TransactionManager();

    try {
      const { barberId, appointmentId } = req.params;
      const { reason, notify_customer = true } = req.body;

      // Validações usando utilitários centralizados
      const barberIdNum = ParameterValidation.validateId(barberId, 'ID do barbeiro');
      const appointmentIdNum = ParameterValidation.validateId(appointmentId, 'ID do agendamento');

      // Executar operação dentro de transação com lock
      const result = await transactionManager.executeInTransaction(async (client) => {
        return await this.appointmentService.cancelAppointmentWithLock(
          client,
          barberIdNum,
          appointmentIdNum,
          { reason, notify_customer }
        );
      }, barberIdNum);

      // Invalidar caches relacionados
      await CacheUtils.invalidateAppointmentCache(
        this.cacheService,
        barberIdNum,
        result.service_id,
        result.start_datetime
      );

      return ApiResponse.success(result, 'Agendamento cancelado com sucesso')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);

      // Tratamento específico de erros
      if (error.code === 'APPOINTMENT_NOT_FOUND') {
        return ApiError.notFound('Agendamento não encontrado').send(res);
      }

      if (error.code === 'APPOINTMENT_CANNOT_CANCEL') {
        return ApiError.badRequest('Este agendamento não pode ser cancelado')
          .withDetails({ reason: error.details })
          .send(res);
      }

      return ApiError.internal('Erro interno do servidor').send(res);
    } finally {
      transactionManager.release();
    }
  }

  // ====================
  // HELPERS REMOVIDOS
  // ====================

  // Método invalidateAppointmentCaches removido - substituído por CacheUtils.invalidateAppointmentCache

  /**
   * Lista agendamentos do barbeiro (admin)
   * GET /api/v2/barbers/:barberId/appointments
   */
  async getAppointments(req, res) {
    try {
      const { barberId } = req.params;
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date
      } = req.query;

      const result = await this.appointmentService.getAppointments(
        barberId,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          start_date,
          end_date
        }
      );

      return ApiResponse.success(result.data, 'Agendamentos encontrados')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Detalhes de um agendamento específico
   * GET /api/v2/barbers/:barberId/appointments/:appointmentId
   */
  async getAppointment(req, res) {
    try {
      const { barberId, appointmentId } = req.params;

      const result = await this.appointmentService.getAppointmentById(
        barberId,
        appointmentId
      );

      if (!result) {
        return ApiError.notFound('Agendamento não encontrado').send(res);
      }

      return ApiResponse.success(result, 'Agendamento encontrado')
        .withLinks(result._links)
        .send(res);

    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }
}

module.exports = new AppointmentControllerV2();
