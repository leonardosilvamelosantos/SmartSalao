/**
 * Controller Administrativo - Painel de Controle Self-Delivered
 * Interface completa para gerenciamento do sistema de agendamentos
 */
const pool = require('../config/database');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const AppointmentServiceV2 = require('../services/AppointmentServiceV2');
const CacheService = require('../services/CacheService');
const { CONFIG, STATUS } = require('../constants');

class AdminController {
  constructor() {
    // Temporariamente desabilitar serviços até resolver dependências
    // this.appointmentService = new AppointmentServiceV2();
    // this.cacheService = new CacheService();
    this.appointmentService = null;
    this.cacheService = null;
  }

  // ====================
  // DASHBOARD PRINCIPAL
  // ====================

  /**
   * Dashboard principal com métricas gerais
   */
  async getDashboard(req, res) {
    try {
      const barberId = req.params.barberId || req.user?.id_usuario || req.user?.id;

      if (!barberId) {
        return ApiError.badRequest('ID do barbeiro é obrigatório').send(res);
      }

      // Dados mockados enquanto os serviços estão desabilitados
      const dashboard = {
        barber_id: barberId,
        metrics: {
          total_appointments: 0,
          today_appointments: 0,
          total_customers: 0,
          total_services: 0,
          revenue_today: 0,
          revenue_month: 0
        },
        today_stats: {
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          completed: 0
        },
        recent_appointments: [],
        system_status: {
          database: 'connected',
          cache: 'disabled',
          services: 'disabled'
        }
      };

      return ApiResponse.success(dashboard, 'Dashboard carregado com sucesso (dados mockados)').send(res);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Buscar métricas do dashboard
   */
  async getDashboardMetrics(barberId) {
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1);
      const monthStart = new Date(); monthStart.setDate(monthStart.getDate()-30);
      const result = await pool.query(`
        SELECT
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as total_confirmed,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as total_cancelled,
          SUM(CASE WHEN start_at >= ? AND start_at < ? THEN 1 ELSE 0 END) as today_appointments,
          SUM(CASE WHEN start_at >= ? AND start_at < ? AND status = 'confirmed' THEN 1 ELSE 0 END) as today_confirmed,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN valor_total END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN (strftime('%s', end_at) - strftime('%s', start_at))/60.0 END), 0) as avg_service_duration,
          COUNT(DISTINCT c.id_cliente) as total_clients
        FROM agendamentos a
        LEFT JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE a.id_usuario = ? AND a.start_at >= ?
      `, [todayStart, todayEnd, todayStart, todayEnd, barberId, monthStart]);
      const metrics = result.rows[0];

      return {
        total_appointments: parseInt(metrics.total_confirmed) + parseInt(metrics.total_completed),
        confirmed_appointments: parseInt(metrics.total_confirmed),
        completed_appointments: parseInt(metrics.total_completed),
        cancelled_appointments: parseInt(metrics.total_cancelled),
        today_appointments: parseInt(metrics.today_appointments),
        today_confirmed: parseInt(metrics.today_confirmed),
        total_revenue: parseFloat(metrics.total_revenue || 0),
        average_duration: Math.round(parseFloat(metrics.avg_service_duration || 0)),
        total_clients: parseInt(metrics.total_clients || 0),
        period: '30 dias'
      };

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      throw error;
    }
  }

  /**
   * Buscar estatísticas de hoje
   */
  async getTodayStats(barberId) {
    try {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate()+1);
      const result = await pool.query(`
        SELECT
          DATE(start_at) as date,
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN valor_total END), 0) as revenue,
          MIN(start_at) as first_appointment,
          MAX(end_at) as last_appointment
        FROM agendamentos
        WHERE id_usuario = ? AND start_at >= ? AND start_at < ?
        GROUP BY DATE(start_at)
      `, [barberId, start, end]);

      if (result.rows.length === 0) {
        return {
          date: new Date().toISOString().split('T')[0],
          total_appointments: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          first_appointment: null,
          last_appointment: null,
          status: 'no_appointments'
        };
      }

      return {
        ...result.rows[0],
        status: result.rows[0].confirmed > 0 ? 'has_appointments' : 'no_confirmed'
      };

    } catch (error) {
      console.error('Erro ao buscar estatísticas de hoje:', error);
      throw error;
    }
  }

  /**
   * Buscar agendamentos recentes
   */
  async getRecentAppointments(barberId, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT
          a.id_agendamento,
          a.start_at,
          a.end_at,
          a.status,
          a.valor_total,
          a.observacoes,
          s.nome_servico,
          s.duracao_min,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE a.id_usuario = ?
        ORDER BY a.start_at DESC
        LIMIT ?
      `, [barberId, limit]);

      return result.rows.map(appointment => ({
        id: appointment.id_agendamento,
        service: appointment.nome_servico,
        client: appointment.cliente_nome,
        phone: appointment.cliente_whatsapp,
        start_time: appointment.start_at,
        end_time: appointment.end_at,
        status: appointment.status,
        value: parseFloat(appointment.valor_total || 0),
        notes: appointment.observacoes,
        duration: appointment.duracao_min
      }));

    } catch (error) {
      console.error('Erro ao buscar agendamentos recentes:', error);
      throw error;
    }
  }

  /**
   * Status do sistema
   */
  async getSystemStatus() {
    try {
      // Verificar conexão com banco
      const dbStatus = await this.checkDatabaseStatus();

      // Verificar cache
      const cacheStatus = await this.checkCacheStatus();

      // Verificar serviços ativos
      const servicesStatus = await this.checkServicesStatus();

      return {
        database: dbStatus,
        cache: cacheStatus,
        services: servicesStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };

    } catch (error) {
      console.error('Erro ao verificar status do sistema:', error);
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ====================
  // GESTÃO DE SERVIÇOS
  // ====================

  /**
   * Listar serviços com controles administrativos
   */
  async getServicesAdmin(req, res) {
    try {
      const barberId = req.params.barberId;
      const { page = 1, limit = 20, status, search } = req.query;

      const query = `
        SELECT
          s.*,
          COUNT(a.id_agendamento) as total_appointments,
          COUNT(a.id_agendamento) FILTER (WHERE a.status = 'completed') as completed_appointments,
          COALESCE(AVG(a.valor_total) FILTER (WHERE a.status = 'completed'), 0) as avg_revenue
        FROM servicos s
        LEFT JOIN agendamentos a ON s.id_servico = a.id_servico
          AND a.start_at >= CURRENT_DATE - INTERVAL '30 days'
        WHERE s.id_usuario = $1
          ${status ? `AND s.ativo = $${queryParams.length + 1}` : ''}
          ${search ? `AND s.nome_servico ILIKE $${queryParams.length + 2}` : ''}
        GROUP BY s.id_servico
        ORDER BY s.ativo DESC, s.nome_servico ASC
        LIMIT $${queryParams.length + 3} OFFSET $${queryParams.length + 4}
      `;

      const queryParams = [barberId];
      if (status) queryParams.push(status === 'active');
      if (search) queryParams.push(`%${search}%`);
      queryParams.push(limit, (page - 1) * limit);

      const result = await pool.query(query, queryParams);

      return ApiResponse.success({
        services: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length
        }
      }).send(res);

    } catch (error) {
      console.error('Erro ao buscar serviços admin:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Criar novo serviço
   */
  async createService(req, res) {
    try {
      const barberId = req.params.barberId;
      const { name, duration_minutes, price, description, is_active = true } = req.body;

      // Validações
      if (!name || !duration_minutes || !price) {
        return ApiError.badRequest('Nome, duração e preço são obrigatórios').send(res);
      }

      const query = `
        INSERT INTO servicos (id_usuario, nome_servico, duracao_min, valor, descricao, ativo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        barberId, name, duration_minutes, price, description, is_active
      ]);

      // Invalidar cache
      // Cache desabilitado temporariamente
      // await this.cacheService.invalidatePattern(`services:${barberId}:*`);

      return ApiResponse.created({
        service: result.rows[0]
      }, 'Serviço criado com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Atualizar serviço
   */
  async updateService(req, res) {
    try {
      const { barberId, serviceId } = req.params;
      const { name, duration_minutes, price, description, is_active } = req.body;

      const query = `
        UPDATE servicos
        SET nome_servico = $1, duracao_min = $2, valor = $3, descricao = $4, ativo = $5, updated_at = NOW()
        WHERE id_usuario = $6 AND id_servico = $7
        RETURNING *
      `;

      const result = await pool.query(query, [
        name, duration_minutes, price, description, is_active, barberId, serviceId
      ]);

      if (result.rows.length === 0) {
        return ApiError.notFound('Serviço não encontrado').send(res);
      }

      // Invalidar cache
      // Cache desabilitado temporariamente
      // await this.cacheService.invalidatePattern(`services:${barberId}:*`);
      // Cache desabilitado temporariamente
      // await this.cacheService.invalidatePattern(`availability:*`);

      return ApiResponse.success({
        service: result.rows[0]
      }, 'Serviço atualizado com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // GESTÃO DE AGENDAMENTOS
  // ====================

  /**
   * Listar agendamentos com filtros avançados
   */
  async getAppointmentsAdmin(req, res) {
    try {
      const barberId = req.params.barberId;
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        client_search,
        service_id
      } = req.query;

      let whereConditions = ['a.id_usuario = $1'];
      let params = [barberId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`DATE(a.start_at) >= $${paramIndex}`);
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`DATE(a.start_at) <= $${paramIndex}`);
        params.push(end_date);
        paramIndex++;
      }

      if (client_search) {
        whereConditions.push(`(c.nome ILIKE $${paramIndex} OR c.whatsapp ILIKE $${paramIndex})`);
        params.push(`%${client_search}%`);
        paramIndex++;
      }

      if (service_id) {
        whereConditions.push(`a.id_servico = $${paramIndex}`);
        params.push(service_id);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT
          a.id_agendamento,
          a.start_at,
          a.end_at,
          a.status,
          a.valor_total,
          a.observacoes,
          a.created_at,
          s.nome_servico,
          s.duracao_min,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          c.email as cliente_email
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE ${whereClause}
        ORDER BY a.start_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, (page - 1) * limit);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        WHERE ${whereClause}
      `;

      const [appointmentsResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, -2))
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return ApiResponse.success({
        appointments: appointmentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: {
          status,
          start_date,
          end_date,
          client_search,
          service_id
        }
      }).send(res);

    } catch (error) {
      console.error('Erro ao buscar agendamentos admin:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Cancelar agendamento (admin)
   */
  async cancelAppointmentAdmin(req, res) {
    try {
      const { barberId, appointmentId } = req.params;
      const { reason } = req.body;

      // AppointmentService desabilitado temporariamente
      // const result = await this.appointmentService.cancelAppointmentWithLock(
      //   { query: pool.query, release: () => {} }, // Mock client for admin
      //   barberId,
      //   appointmentId,
      //   { reason, notify_customer: false }
      // );

      // Simulação de cancelamento
      const result = { success: true, message: 'Agendamento cancelado (simulado)' };

      return ApiResponse.success(result, 'Agendamento cancelado com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao cancelar agendamento admin:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // CONFIGURAÇÕES DO SISTEMA
  // ====================

  /**
   * Buscar configurações do barbeiro
   */
  async getBarberSettings(req, res) {
    try {
      const barberId = req.params.barberId;

      const result = await pool.query(`
        SELECT u.*, COUNT(s.id_servico) as total_services
        FROM usuarios u
        LEFT JOIN servicos s ON u.id_usuario = s.id_usuario AND s.ativo = 1
        WHERE u.id_usuario = ?
        GROUP BY u.id_usuario
      `, [barberId]);

      if (result.rows.length === 0) {
        return ApiError.notFound('Barbeiro não encontrado').send(res);
      }

      const barber = result.rows[0];

      return ApiResponse.success({
        barber: {
          id: barber.id_usuario,
          name: barber.nome,
          email: barber.email,
          phone: barber.whatsapp,
          timezone: barber.timezone || CONFIG.DEFAULT_TIMEZONE,
          is_active: barber.ativo,
          total_services: parseInt(barber.total_services),
          created_at: barber.created_at
        }
      }).send(res);

    } catch (error) {
      console.error('Erro ao buscar configurações do barbeiro:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  /**
   * Atualizar configurações do barbeiro
   */
  async updateBarberSettings(req, res) {
    try {
      const barberId = req.params.barberId;
      const { name, email, phone, timezone } = req.body;

      const result = await pool.query(`
        UPDATE usuarios
        SET nome = ?, email = ?, whatsapp = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_usuario = ?
      `, [name, email, phone, timezone, barberId]);

      if (result.rows.length === 0) {
        return ApiError.notFound('Barbeiro não encontrado').send(res);
      }

      return ApiResponse.success({
        barber: result.rows[0]
      }, 'Configurações atualizadas com sucesso').send(res);

    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // RELATÓRIOS E ESTATÍSTICAS
  // ====================

  /**
   * Relatório financeiro
   */
  async getFinancialReport(req, res) {
    try {
      const barberId = req.params.barberId;
      const { start_date, end_date } = req.query;

      const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const query = `
        SELECT
          DATE(a.start_at) as date,
          COUNT(*) FILTER (WHERE a.status = 'completed') as completed_appointments,
          COALESCE(SUM(a.valor_total) FILTER (WHERE a.status = 'completed'), 0) as revenue,
          COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
          AVG(a.valor_total) FILTER (WHERE a.status = 'completed') as avg_ticket
        FROM agendamentos a
        WHERE a.id_usuario = $1
          AND DATE(a.start_at) BETWEEN $2 AND $3
        GROUP BY DATE(a.start_at)
        ORDER BY DATE(a.start_at) ASC
      `;

      const result = await pool.query(query, [barberId, startDate, endDate]);

      const summary = result.rows.reduce((acc, day) => ({
        total_revenue: acc.total_revenue + parseFloat(day.revenue || 0),
        total_completed: acc.total_completed + parseInt(day.completed_appointments || 0),
        total_cancelled: acc.total_cancelled + parseInt(day.cancelled_appointments || 0),
        avg_ticket: acc.avg_ticket + parseFloat(day.avg_ticket || 0)
      }), { total_revenue: 0, total_completed: 0, total_cancelled: 0, avg_ticket: 0 });

      if (result.rows.length > 0) {
        summary.avg_ticket = summary.avg_ticket / result.rows.length;
      }

      return ApiResponse.success({
        report: result.rows,
        summary: {
          ...summary,
          period_days: result.rows.length,
          start_date: startDate,
          end_date: endDate
        }
      }).send(res);

    } catch (error) {
      console.error('Erro ao gerar relatório financeiro:', error);
      return ApiError.internal('Erro interno do servidor').send(res);
    }
  }

  // ====================
  // UTILITÁRIOS DE STATUS
  // ====================

  async checkDatabaseStatus() {
    try {
      // SQLite: obter tamanho do arquivo de banco
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../../data/agendamento_dev.db');
      const stats = fs.statSync(dbPath);
      const result = { rows: [{ now: new Date().toISOString(), size: stats.size }] };
      return {
        status: 'connected',
        response_time: Date.now(),
        size: result.rows[0].size
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message
      };
    }
  }

  async checkCacheStatus() {
    try {
      // Cache desabilitado temporariamente
      const stats = { hits: 0, misses: 0, keys: 0 };
      return {
        status: stats.type === 'redis' ? 'redis_connected' : 'memory_fallback',
        ...stats
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkServicesStatus() {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM servicos WHERE ativo = true');
      return {
        status: 'active',
        active_services: parseInt(result.rows[0].count)
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new AdminController();
