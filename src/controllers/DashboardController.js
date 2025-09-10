const DashboardService = require('../services/DashboardService');

/**
 * Controlador para dashboard e métricas
 */
class DashboardController {
  /**
   * Obter métricas principais do dashboard
   */
  async getMainMetrics(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Tentar obter do cache primeiro
      const cacheKey = 'main_metrics';
      let metrics = await DashboardService.getCachedMetrics(userId, cacheKey, 15); // 15 minutos

      if (!metrics) {
        // Calcular métricas se não estiver em cache
        metrics = await DashboardService.getMainMetrics(userId);

        // Salvar no cache
        await DashboardService.setCachedMetrics(userId, cacheKey, metrics, 15);
      }

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Erro ao obter métricas do dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter métricas de hoje
   */
  async getTodayMetrics(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const metrics = await DashboardService.getTodayMetrics(userId);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Erro ao obter métricas de hoje:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter métricas da semana
   */
  async getWeekMetrics(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const metrics = await DashboardService.getWeekMetrics(userId);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Erro ao obter métricas da semana:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter métricas do mês
   */
  async getMonthMetrics(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const metrics = await DashboardService.getMonthMetrics(userId);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Erro ao obter métricas do mês:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter tendências
   */
  async getTrends(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const trends = await DashboardService.getTrends(userId);

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      console.error('Erro ao obter tendências:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter agendamentos por status
   */
  async getAppointmentsByStatus(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const appointmentsByStatus = await DashboardService.getAppointmentsByStatus(userId);

      res.json({
        success: true,
        data: appointmentsByStatus
      });

    } catch (error) {
      console.error('Erro ao obter agendamentos por status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter receita por serviço
   */
  async getRevenueByService(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const revenueByService = await DashboardService.getRevenueByService(userId);

      res.json({
        success: true,
        data: revenueByService
      });

    } catch (error) {
      console.error('Erro ao obter receita por serviço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter clientes mais frequentes
   */
  async getTopClients(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const topClients = await DashboardService.getTopClients(userId);

      res.json({
        success: true,
        data: topClients
      });

    } catch (error) {
      console.error('Erro ao obter top clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar relatório detalhado por período
   */
  async getDetailedReport(req, res) {
    try {
      const userId = req.user?.id;
      const { start_date, end_date } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Datas de início e fim são obrigatórias'
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Datas inválidas'
        });
      }

      // Validar período máximo (não mais que 1 ano)
      const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 ano em ms
      if (endDate - startDate > maxPeriod) {
        return res.status(400).json({
          success: false,
          message: 'Período máximo permitido: 1 ano'
        });
      }

      const report = await DashboardService.getDetailedReport(userId, startDate, endDate);

      res.json({
        success: true,
        data: report,
        meta: {
          period: {
            start: start_date,
            end: end_date,
            days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
          }
        }
      });

    } catch (error) {
      console.error('Erro ao gerar relatório detalhado:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Limpar cache do usuário
   */
  async clearCache(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const clearedCount = await DashboardService.clearUserCache(userId);

      res.json({
        success: true,
        message: `Cache limpo com sucesso`,
        data: {
          clearedItems: clearedCount
        }
      });

    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Exportar dados para CSV
   */
  async exportToCSV(req, res) {
    try {
      const userId = req.user?.id;
      const { type, start_date, end_date } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      let data = [];
      let filename = '';

      switch (type) {
        case 'appointments':
          // Buscar agendamentos para export
          const appointments = await require('../models/Agendamento').query(`
            SELECT
              a.start_at,
              c.nome as cliente,
              c.whatsapp,
              s.nome_servico as servico,
              s.valor,
              a.status
            FROM agendamentos a
            JOIN clientes c ON a.id_cliente = c.id_cliente
            JOIN servicos s ON a.id_servico = s.id_servico
            WHERE a.id_usuario = $1
            ORDER BY a.start_at DESC
          `, [userId]);

          data = appointments.map(item => ({
            'Data/Hora': new Date(item.start_at).toLocaleString('pt-BR'),
            'Cliente': item.cliente,
            'WhatsApp': item.whatsapp,
            'Serviço': item.servico,
            'Valor': `R$ ${item.valor}`,
            'Status': item.status
          }));

          filename = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'clients':
          // Buscar clientes para export
          const clients = await require('../models/Cliente').query(`
            SELECT
              c.nome,
              c.whatsapp,
              c.created_at,
              COUNT(a.id_agendamento) as total_agendamentos
            FROM clientes c
            LEFT JOIN agendamentos a ON c.id_cliente = a.id_cliente
            WHERE c.id_usuario = $1
            GROUP BY c.id_cliente, c.nome, c.whatsapp, c.created_at
            ORDER BY c.created_at DESC
          `, [userId]);

          data = clients.map(item => ({
            'Nome': item.nome,
            'WhatsApp': item.whatsapp,
            'Data Cadastro': new Date(item.created_at).toLocaleDateString('pt-BR'),
            'Total Agendamentos': item.total_agendamentos
          }));

          filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de exportação inválido. Use: appointments ou clients'
          });
      }

      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum dado encontrado para exportar'
        });
      }

      // Gerar CSV
      const csvContent = this.generateCSV(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(csvContent);

    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar conteúdo CSV a partir de dados
   */
  generateCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Adicionar headers
    csvRows.push(headers.join(','));

    // Adicionar dados
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escapar valores que contenham vírgulas ou aspas
        if (value.toString().includes(',') || value.toString().includes('"')) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}

module.exports = new DashboardController();
