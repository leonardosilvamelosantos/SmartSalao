const Agendamento = require('../models/Agendamento');
const Cliente = require('../models/Cliente');
const Servico = require('../models/Servico');
const SlotService = require('../services/SlotService');

/**
 * Controlador para operações com agendamentos
 */
class AgendamentoController {
  /**
   * Listar agendamentos com paginação e filtros
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10, status, start_date, end_date } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const schema = req.tenant?.schema;
      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        status,
        startDate: start_date ? new Date(start_date) : null,
        endDate: end_date ? new Date(end_date) : null,
        schema
      };


      const agendamentos = await Agendamento.findByUsuario(userId, options);
      const total = await Agendamento.count(`id_usuario = ${userId}`, null, schema);

      res.json({
        success: true,
        data: agendamentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar agendamento por ID
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const agendamento = await Agendamento.findWithDetails(parseInt(id));

      if (!agendamento) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado'
        });
      }

      // Verificar se o agendamento pertence ao usuário
      if (agendamento.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este agendamento'
        });
      }

      res.json({
        success: true,
        data: agendamento
      });

    } catch (error) {
      console.error('Erro ao buscar agendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo agendamento
   */
  async create(req, res) {
    try {
      const agendamentoData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Verificar se o cliente existe e pertence ao usuário
      const cliente = await Cliente.findById(agendamentoData.id_cliente, req.user?.tenant_id);
      if (!cliente || cliente.id_usuario !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado ou não pertence ao usuário'
        });
      }

      // Verificar se o serviço existe e pertence ao usuário
      const servico = await Servico.findById(agendamentoData.id_servico);
      if (!servico || servico.id_usuario !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado ou não pertence ao usuário'
        });
      }

      // Adicionar ID do usuário
      agendamentoData.id_usuario = userId;

      const agendamento = await Agendamento.create(agendamentoData);

      res.status(201).json({
        success: true,
        message: 'Agendamento criado com sucesso',
        data: agendamento
      });

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);

      if (error.message.includes('não disponível') ||
          error.message.includes('conflito')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('não encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar agendamento
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se agendamento existe e pertence ao usuário
      const existingAgendamento = await Agendamento.findById(parseInt(id));
      if (!existingAgendamento) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado'
        });
      }

      if (existingAgendamento.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para editar este agendamento'
        });
      }

      // Se está mudando data/hora ou serviço, verificar disponibilidade
      if (updateData.data_agendamento || updateData.id_servico) {
        const checkData = {
          id_usuario: userId,
          data_agendamento: updateData.data_agendamento || existingAgendamento.data_agendamento,
          id_servico: updateData.id_servico || existingAgendamento.id_servico
        };

        await Agendamento.checkAvailability(
          checkData.id_usuario,
          checkData.data_agendamento,
          checkData.id_servico
        );

        // Recalcular end_at se necessário
        if (updateData.data_agendamento || updateData.id_servico) {
          const servicoId = updateData.id_servico || existingAgendamento.id_servico;
          const servico = await Servico.findById(servicoId);
          const startAt = new Date(updateData.data_agendamento || existingAgendamento.data_agendamento);

          updateData.end_at = new Date(startAt.getTime() + servico.duracao_min * 60000);
        }
      }

      const agendamento = await Agendamento.update(parseInt(id), updateData);

      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: agendamento
      });

    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);

      if (error.message.includes('não disponível') ||
          error.message.includes('conflito')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cancelar agendamento
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se agendamento existe e pertence ao usuário
      const agendamento = await Agendamento.findById(parseInt(id));
      if (!agendamento) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado'
        });
      }

      if (agendamento.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para cancelar este agendamento'
        });
      }

      if (agendamento.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: 'Apenas agendamentos confirmados podem ser cancelados'
        });
      }

      const cancelledAgendamento = await Agendamento.cancel(parseInt(id));

      res.json({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        data: cancelledAgendamento
      });

    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Marcar agendamento como concluído
   */
  async complete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se agendamento existe e pertence ao usuário
      const agendamento = await Agendamento.findById(parseInt(id));
      if (!agendamento) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado'
        });
      }

      if (agendamento.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para editar este agendamento'
        });
      }

      if (agendamento.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: 'Apenas agendamentos confirmados podem ser concluídos'
        });
      }

      const completedAgendamento = await Agendamento.complete(parseInt(id));

      res.json({
        success: true,
        message: 'Agendamento marcado como concluído',
        data: completedAgendamento
      });

    } catch (error) {
      console.error('Erro ao completar agendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar agendamentos por período
   */
  async getByPeriod(req, res) {
    try {
      const { start_date, end_date, status } = req.query;
      const userId = req.user?.id;

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

      const agendamentos = await Agendamento.findByPeriod(userId, startDate, endDate, status);

      res.json({
        success: true,
        data: agendamentos,
        message: `${agendamentos.length} agendamentos encontrados no período`
      });

    } catch (error) {
      console.error('Erro ao buscar agendamentos por período:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar agendamentos de hoje
   */
  async getToday(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const agendamentos = await Agendamento.findByPeriod(userId, today, tomorrow, 'confirmed');

      res.json({
        success: true,
        data: agendamentos,
        message: `${agendamentos.length} agendamentos para hoje`
      });

    } catch (error) {
      console.error('Erro ao buscar agendamentos de hoje:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter estatísticas de agendamentos
   */
  async getStats(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Estatísticas gerais
      const stats = await Agendamento.query(`
        SELECT
          COUNT(*) as total_agendamentos,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmados,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidos,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelados,
          AVG(CASE WHEN status = 'completed' THEN s.valor END) as receita_media,
          SUM(CASE WHEN status = 'completed' THEN s.valor END) as receita_total
        FROM agendamentos a
        LEFT JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_usuario = $1
      `, [userId]);

      // Agendamentos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStats = await Agendamento.query(`
        SELECT COUNT(*) as agendamentos_hoje
        FROM agendamentos
        WHERE id_usuario = $1
        AND data_agendamento >= $2
        AND data_agendamento < $3
        AND status = 'confirmed'
      `, [userId, today, tomorrow]);

      const result = {
        ...stats[0],
        agendamentos_hoje: parseInt(todayStats[0].agendamentos_hoje)
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar agendamento
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se agendamento existe e pertence ao usuário
      const agendamento = await Agendamento.findById(parseInt(id));
      if (!agendamento) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado'
        });
      }

      if (agendamento.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para deletar este agendamento'
        });
      }

      // Só permitir deletar agendamentos cancelados ou muito antigos
      if (agendamento.status === 'confirmed') {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar agendamentos confirmados. Cancele primeiro.'
        });
      }

      await Agendamento.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Agendamento deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new AgendamentoController();