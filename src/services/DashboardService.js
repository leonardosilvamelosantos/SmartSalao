const Agendamento = require('../models/Agendamento');
const Usuario = require('../models/Usuario');
const Servico = require('../models/Servico');
const Cliente = require('../models/Cliente');

/**
 * Serviço de dashboard com métricas e relatórios
 */
class DashboardService {
  /**
   * Obter métricas principais do dashboard
   */
  async getMainMetrics(userId) {
    try {
      // Métricas gerais
      const generalMetrics = await this.getGeneralMetrics(userId);

      // Métricas de hoje
      const todayMetrics = await this.getTodayMetrics(userId);

      // Métricas da semana
      const weekMetrics = await this.getWeekMetrics(userId);

      // Métricas do mês
      const monthMetrics = await this.getMonthMetrics(userId);

      // Tendências
      const trends = await this.getTrends(userId);

      // Status dos agendamentos
      const appointmentsByStatus = await this.getAppointmentsByStatus(userId);

      // Receita por serviço
      const revenueByService = await this.getRevenueByService(userId);

      // Clientes mais frequentes
      const topClients = await this.getTopClients(userId);

      return {
        general: generalMetrics,
        today: todayMetrics,
        week: weekMetrics,
        month: monthMetrics,
        trends,
        appointmentsByStatus,
        revenueByService,
        topClients,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Erro ao obter métricas do dashboard:', error);
      return { error: error.message };
    }
  }

  /**
   * Métricas gerais
   */
  async getGeneralMetrics(userId) {
    const metrics = await Agendamento.query(`
      SELECT
        COUNT(DISTINCT a.id_agendamento) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id_agendamento END) as completed_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id_agendamento END) as confirmed_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id_agendamento END) as cancelled_appointments,
        COUNT(DISTINCT c.id_cliente) as total_clients,
        COUNT(DISTINCT s.id_servico) as total_services,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as average_revenue
      FROM agendamentos a
      JOIN clientes c ON a.id_cliente = c.id_cliente
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
    `, [userId]);

    const result = metrics[0];

    return {
      totalAppointments: parseInt(result.total_appointments),
      completedAppointments: parseInt(result.completed_appointments),
      confirmedAppointments: parseInt(result.confirmed_appointments),
      cancelledAppointments: parseInt(result.cancelled_appointments),
      totalClients: parseInt(result.total_clients),
      totalServices: parseInt(result.total_services),
      totalRevenue: parseFloat(result.total_revenue),
      averageRevenue: parseFloat(result.average_revenue),
      completionRate: result.total_appointments > 0 ?
        (result.completed_appointments / result.total_appointments * 100).toFixed(1) : 0
    };
  }

  /**
   * Métricas de hoje
   */
  async getTodayMetrics(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const metrics = await Agendamento.query(`
      SELECT
        COUNT(*) as appointments_today,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_today,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN s.valor END), 0) as revenue_today
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
      AND a.start_at >= ?
      AND a.start_at < ?
    `, [userId, today, tomorrow]);

    const row = metrics[0] || {};
    return {
      appointments_today: parseInt(row.appointments_today || 0),
      confirmed_today: parseInt(row.confirmed_today || 0),
      completed_today: parseInt(row.completed_today || 0),
      revenue_today: parseFloat(row.revenue_today || 0)
    };
  }

  /**
   * Métricas da semana
   */
  async getWeekMetrics(userId) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const metrics = await Agendamento.query(`
      SELECT
        COUNT(*) as appointments_week,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_week,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN s.valor END), 0) as revenue_week
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
      AND a.start_at >= ?
      AND a.start_at < ?
    `, [userId, weekStart, weekEnd]);
    const row = metrics[0] || {};
    return {
      appointments_week: parseInt(row.appointments_week || 0),
      completed_week: parseInt(row.completed_week || 0),
      revenue_week: parseFloat(row.revenue_week || 0)
    };
  }

  /**
   * Métricas do mês
   */
  async getMonthMetrics(userId) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const metrics = await Agendamento.query(`
      SELECT
        COUNT(*) as appointments_month,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_month,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN s.valor END), 0) as revenue_month
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
      AND a.start_at >= ?
      AND a.start_at < ?
    `, [userId, monthStart, nextMonth]);
    const row = metrics[0] || {};
    return {
      appointments_month: parseInt(row.appointments_month || 0),
      completed_month: parseInt(row.completed_month || 0),
      revenue_month: parseFloat(row.revenue_month || 0)
    };
  }

  /**
   * Tendências (últimos 7 dias)
   */
  async getTrends(userId) {
    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayMetrics = await Agendamento.query(`
        SELECT
          COUNT(*) as appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN s.valor END), 0) as revenue
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_usuario = ?
        AND a.start_at >= ?
        AND a.start_at < ?
      `, [userId, date, nextDay]);

      trends.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        appointments: parseInt(dayMetrics[0].appointments),
        completed: parseInt(dayMetrics[0].completed),
        revenue: parseFloat(dayMetrics[0].revenue)
      });
    }

    return trends;
  }

  /**
   * Agendamentos por status
   */
  async getAppointmentsByStatus(userId) {
    const statusData = await Agendamento.query(`
      SELECT
        status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM agendamentos
      WHERE id_usuario = ?
      GROUP BY status
      ORDER BY count DESC
    `, [userId]);

    return statusData.map(item => ({
      status: item.status,
      count: parseInt(item.count),
      percentage: parseFloat(item.percentage).toFixed(1)
    }));
  }

  /**
   * Receita por serviço
   */
  async getRevenueByService(userId) {
    const revenueData = await Agendamento.query(`
      SELECT
        s.nome_servico as service_name,
        COUNT(a.id_agendamento) as appointments_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as average_revenue
      FROM servicos s
      LEFT JOIN agendamentos a ON s.id_servico = a.id_servico
      WHERE a.id_usuario = ?
      GROUP BY s.id_servico, s.nome_servico
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [userId]);

    return revenueData.map(item => ({
      serviceName: item.service_name,
      appointmentsCount: parseInt(item.appointments_count),
      totalRevenue: parseFloat(item.total_revenue),
      averageRevenue: parseFloat(item.average_revenue)
    }));
  }

  /**
   * Clientes mais frequentes
   */
  async getTopClients(userId) {
    const clientsData = await Agendamento.query(`
      SELECT
        c.nome as client_name,
        c.whatsapp,
        COUNT(a.id_agendamento) as appointments_count,
        MAX(a.data_agendamento) as last_appointment,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as total_spent
      FROM clientes c
      LEFT JOIN agendamentos a ON c.id_cliente = a.id_cliente
      LEFT JOIN servicos s ON a.id_servico = s.id_servico
      WHERE c.id_usuario = ?
      GROUP BY c.id_cliente, c.nome, c.whatsapp
      ORDER BY appointments_count DESC, last_appointment DESC
      LIMIT 10
    `, [userId]);

    return clientsData.map(item => ({
      clientName: item.client_name,
      whatsapp: item.whatsapp,
      appointmentsCount: parseInt(item.appointments_count),
      lastAppointment: item.last_appointment,
      totalSpent: parseFloat(item.total_spent)
    }));
  }

  /**
   * Relatório detalhado por período
   */
  async getDetailedReport(userId, startDate, endDate) {
    try {
      const report = await Agendamento.query(`
        SELECT
          DATE(a.start_at) as date,
          COUNT(*) as daily_appointments,
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as daily_completed,
          COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as daily_cancelled,
          COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.valor END), 0) as daily_revenue
        FROM agendamentos a
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_usuario = ?
        AND a.start_at >= ?
        AND a.start_at <= ?
        GROUP BY DATE(a.start_at)
        ORDER BY date
      `, [userId, startDate, endDate]);

      return report.map(item => ({
        date: item.date,
        appointments: parseInt(item.daily_appointments),
        completed: parseInt(item.daily_completed),
        cancelled: parseInt(item.daily_cancelled),
        revenue: parseFloat(item.daily_revenue)
      }));

    } catch (error) {
      console.error('Erro ao gerar relatório detalhado:', error);
      return [];
    }
  }

  /**
   * Cache de métricas para performance
   */
  async getCachedMetrics(userId, cacheKey, ttlMinutes = 30) {
    try {
      // Para SQLite, usar tabela com prefixo tenant
      const cachedData = await Agendamento.query(`
        SELECT dados, data_calculo
        FROM dashboard_cache
        WHERE id_usuario = ?
        AND tipo = ?
        AND expires_at > NOW()
        ORDER BY data_calculo DESC
        LIMIT 1
      `, [userId, cacheKey]);

      if (cachedData.length > 0) {
        return {
          ...JSON.parse(cachedData[0].dados),
          cached: true,
          cacheTime: cachedData[0].data_calculo
        };
      }

      return null; // Não encontrado no cache

    } catch (error) {
      console.error('Erro ao obter métricas do cache:', error);
      return null;
    }
  }

  /**
   * Salvar métricas no cache
   */
  async setCachedMetrics(userId, cacheKey, data, ttlMinutes = 30) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      await Agendamento.query(`
        INSERT INTO dashboard_cache (id_usuario, tipo, dados, expires_at, data_calculo)
        VALUES (?, ?, ?, ?, NOW())
        ON CONFLICT (id_usuario, tipo)
        DO UPDATE SET
          dados = EXCLUDED.dados,
          expires_at = EXCLUDED.expires_at,
          data_calculo = NOW()
      `, [userId, cacheKey, JSON.stringify(data), expiresAt.toISOString()]);

    } catch (error) {
      console.error('Erro ao salvar métricas no cache:', error);
    }
  }

  /**
   * Limpar cache de um usuário
   */
  async clearUserCache(userId) {
    try {
      const result = await Agendamento.query(`
        DELETE FROM dashboard_cache
        WHERE id_usuario = ?
      `, [userId]);

      return result.length;

    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return 0;
    }
  }
}

module.exports = new DashboardService();
