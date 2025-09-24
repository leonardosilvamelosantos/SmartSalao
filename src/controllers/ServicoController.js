const Servico = require('../models/Servico');

/**
 * Controlador para operações com serviços
 */
class ServicoController {

  /**
   * Método estático para uso pelo bot WhatsApp - retorna todos os serviços sem paginação
   * @returns {Promise<Array>} Lista de serviços
   */
  static async getAllForBot() {
    try {
      const pool = require('../config/database');

      const query = `
        SELECT s.*, u.nome as usuario_nome
        FROM servicos s
        LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
        ORDER BY s.id_servico DESC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao obter serviços para bot:', error);
      return [];
    }
  }

  /**
   * Retorna serviços de um tenant específico (exclusivos daquela conta)
   * @param {number|string} tenantId
   * @returns {Promise<Array>} Lista de serviços do tenant
   */
  static async getForTenant(tenantId) {
    try {
      if (!tenantId) return [];
      const pool = require('../config/database');
      const query = `
        SELECT s.*, u.nome as usuario_nome, u.id_tenant
        FROM servicos s
        INNER JOIN usuarios u ON s.id_usuario = u.id_usuario
        WHERE u.id_tenant = ?
        ORDER BY s.id_servico DESC
      `;
      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao obter serviços por tenant:', error);
      return [];
    }
  }
  /**
   * Listar serviços com paginação e filtros
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user?.id;

      // Usar abordagem simplificada com SQLite diretamente
      const pool = require('../config/database');

      // Query simples para testar se o pool funciona
      const listQuery = `
        SELECT s.*, u.nome as usuario_nome
        FROM servicos s
        JOIN usuarios u ON s.id_usuario = u.id_usuario
        WHERE s.id_usuario = ?
        ORDER BY s.id_servico DESC
        LIMIT ? OFFSET ?
      `;

      const countQuery = `SELECT COUNT(*) as total FROM servicos WHERE id_usuario = ?`;

      const servicesResult = await pool.query(listQuery, [userId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);
      const countResult = await pool.query(countQuery, [userId]);

      const servicos = servicesResult.rows;
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: servicos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar serviços:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar serviço por ID
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      const schema = req.tenant?.schema;

      const servico = await Servico.findById(id, null, schema);

      if (!servico) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado'
        });
      }

      res.json({
        success: true,
        data: servico
      });

    } catch (error) {
      console.error('Erro ao buscar serviço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo serviço
   */
  async create(req, res) {
    try {
      const servicoData = req.body;
      const schema = req.tenant?.schema;

      // Verificar se o usuário existe
      const Usuario = require('../models/Usuario');
      const usuario = await Usuario.findById(servicoData.id_usuario, null, schema);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const servico = await Servico.create(servicoData, null, schema);

      res.status(201).json({
        success: true,
        message: 'Serviço criado com sucesso',
        data: servico
      });

    } catch (error) {
      console.error('Erro ao criar serviço:', error);

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
   * Atualizar serviço
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar se serviço existe
      const existingServico = await Servico.findById(id);
      if (!existingServico) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado'
        });
      }

      // Se está mudando o usuário, verificar se existe
      if (updateData.id_usuario && updateData.id_usuario !== existingServico.id_usuario) {
        const Usuario = require('../models/Usuario');
        const usuario = await Usuario.findById(updateData.id_usuario);
        if (!usuario) {
          return res.status(404).json({
            success: false,
            message: 'Novo usuário não encontrado'
          });
        }
      }

      const servico = await Servico.update(id, updateData);

      res.json({
        success: true,
        message: 'Serviço atualizado com sucesso',
        data: servico
      });

    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar serviço
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Verificar se serviço existe
      const servico = await Servico.findById(id);
      if (!servico) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado'
        });
      }

      // Verificar se tem agendamentos ativos
      const activeBookings = await Servico.query(`
        SELECT COUNT(*) as count FROM agendamentos
        WHERE id_servico = $1 AND status = 'confirmed'
      `, [id]);

      if (activeBookings[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar serviço com agendamentos ativos'
        });
      }

      await Servico.delete(id);

      res.json({
        success: true,
        message: 'Serviço deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar serviço com usuário
   */
  async showWithUsuario(req, res) {
    try {
      const { id } = req.params;

      const servico = await Servico.findWithUsuario(id);

      if (!servico) {
        return res.status(404).json({
          success: false,
          message: 'Serviço não encontrado'
        });
      }

      res.json({
        success: true,
        data: servico
      });

    } catch (error) {
      console.error('Erro ao buscar serviço com usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar serviços disponíveis em um período
   */
  async getAvailable(req, res) {
    try {
      const { id_usuario } = req.params;
      const { start_date, end_date } = req.query;

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

      const servicos = await Servico.findAvailable(parseInt(id_usuario), startDate, endDate);

      res.json({
        success: true,
        data: servicos,
        message: `${servicos.length} serviços disponíveis no período`
      });

    } catch (error) {
      console.error('Erro ao buscar serviços disponíveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar serviços populares
   */
  async getPopular(req, res) {
    try {
      const { id_usuario } = req.params;
      const { limit = 5 } = req.query;

      const servicos = await Servico.findPopular(parseInt(id_usuario), parseInt(limit));

      res.json({
        success: true,
        data: servicos
      });

    } catch (error) {
      console.error('Erro ao buscar serviços populares:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar serviços com estatísticas
   */
  async getWithStats(req, res) {
    try {
      const { id_usuario } = req.params;

      const servicos = await Servico.query(`
        SELECT
          s.*,
          COUNT(a.id_agendamento) as total_agendamentos,
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as agendamentos_concluidos,
          AVG(CASE WHEN a.status = 'completed' THEN s.preco END) as receita_media,
          MAX(a.data_agendamento) as ultimo_agendamento
        FROM servicos s
        LEFT JOIN agendamentos a ON s.id_servico = a.id_servico
        WHERE a.id_usuario = $1
        GROUP BY s.id_servico
        ORDER BY total_agendamentos DESC
      `, [id_usuario]);

      res.json({
        success: true,
        data: servicos
      });

    } catch (error) {
      console.error('Erro ao buscar serviços com estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = ServicoController;
