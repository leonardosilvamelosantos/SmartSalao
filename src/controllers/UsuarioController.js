const Usuario = require('../models/Usuario');
const SlotService = require('../services/SlotService');

/**
 * Controlador para operações com usuários
 */
class UsuarioController {
  /**
   * Listar usuários com paginação e filtros
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const currentUserId = req.user?.id;

      // Exibir somente o próprio usuário (MVP)
      let options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        where: 'id_usuario = $1',
        whereValues: [currentUserId]
      };

      let usuarios;

      const schema = null; // SQLite atual sem schemas/tenant em usuarios

      if (search) {
        options.where = `id_usuario = $1 AND (nome LIKE $2 OR whatsapp LIKE $2)`;
        options.whereValues = [currentUserId, `%${search}%`];
      }

      usuarios = await Usuario.findAll({
        ...options,
        schema
      });

      // Total com mesmo critério
      let countWhere = `id_usuario = ${currentUserId}`;
      if (search) {
        const s = (search || '').replace(/'/g, "''");
        countWhere += ` AND (nome LIKE '%${s}%' OR whatsapp LIKE '%${s}%')`;
      }
      const total = await Usuario.count(countWhere, null, schema);

      res.json({
        success: true,
        data: usuarios,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar usuário por ID
   */
  async show(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const usuario = await Usuario.findById(parseInt(id), null);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        data: usuario
      });

    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo usuário
   */
  async create(req, res) {
    try {
      const usuarioData = req.body;

      // Verificar se WhatsApp já existe dentro do tenant
      const existingUser = await Usuario.findByWhatsapp(usuarioData.whatsapp, null);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp já cadastrado para este tenant'
        });
      }

      const usuario = await Usuario.create(usuarioData, null);

      // Gerar slots iniciais para o usuário
      try {
        await SlotService.generateSlotsForNextDays(usuario.id_usuario, usuario.max_advance_days || 60);
      } catch (slotError) {
        console.warn('Erro ao gerar slots iniciais:', slotError);
        // Não falhar a criação do usuário por causa dos slots
      }

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: usuario
      });

    } catch (error) {
      console.error('Erro ao criar usuário:', error);

      if (error.message.includes('WhatsApp já cadastrado')) {
        return res.status(400).json({
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
   * Atualizar usuário
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se usuário existe dentro do tenant
      const existingUser = await Usuario.findById(parseInt(id), null);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Se está mudando o WhatsApp, verificar se já existe dentro do tenant
      if (updateData.whatsapp && updateData.whatsapp !== existingUser.whatsapp) {
        const whatsappExists = await Usuario.findByWhatsapp(updateData.whatsapp, null);
        if (whatsappExists) {
          return res.status(400).json({
            success: false,
            message: 'WhatsApp já cadastrado para outro usuário neste tenant'
          });
        }
      }

      const usuario = await Usuario.update(parseInt(id), updateData, null);

      // Se mudou configuração de horários, atualizar slots
      if (updateData.config_horarios) {
        try {
          await SlotService.updateSlotsForUser(id);
        } catch (slotError) {
          console.warn('Erro ao atualizar slots:', slotError);
        }
      }

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: usuario
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar usuário
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar se usuário existe dentro do tenant
      const usuario = await Usuario.findById(parseInt(id), null);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se tem agendamentos ativos dentro do tenant
      const activeBookings = await Usuario.query(`
        SELECT COUNT(*) as count FROM agendamentos
        WHERE id_usuario = $1 AND status = 'confirmed'
      `, [parseInt(id)]);

      if (activeBookings[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar usuário com agendamentos ativos'
        });
      }

      await Usuario.delete(parseInt(id), null);

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar usuário com serviços e estatísticas
   */
  async showWithDetails(req, res) {
    try {
      const { id } = req.params;

      const usuario = await Usuario.findWithServices(id);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Buscar estatísticas
      const stats = await Usuario.query(`
        SELECT
          COUNT(DISTINCT s.id_servico) as total_servicos,
          COUNT(DISTINCT c.id_cliente) as total_clientes,
          COUNT(DISTINCT a.id_agendamento) as total_agendamentos,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id_agendamento END) as agendamentos_concluidos
        FROM usuarios u
        LEFT JOIN servicos s ON u.id_usuario = s.id_usuario
        LEFT JOIN clientes c ON u.id_usuario = c.id_usuario
        LEFT JOIN agendamentos a ON u.id_usuario = a.id_usuario
        WHERE u.id_usuario = $1
      `, [id]);

      res.json({
        success: true,
        data: {
          ...usuario,
          estatisticas: stats[0]
        }
      });

    } catch (error) {
      console.error('Erro ao buscar usuário com detalhes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar configuração de horários
   */
  async updateHorarios(req, res) {
    try {
      const { id } = req.params;
      const { config_horarios } = req.body;

      if (!Array.isArray(config_horarios)) {
        return res.status(400).json({
          success: false,
          message: 'Configuração de horários deve ser um array'
        });
      }

      // Verificar se usuário existe
      const usuario = await Usuario.findById(id);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const updatedUsuario = await Usuario.updateHorarios(id, config_horarios);

      // Atualizar slots baseado na nova configuração
      try {
        await SlotService.updateSlotsForUser(id);
      } catch (slotError) {
        console.warn('Erro ao atualizar slots:', slotError);
      }

      res.json({
        success: true,
        message: 'Horários atualizados com sucesso',
        data: updatedUsuario
      });

    } catch (error) {
      console.error('Erro ao atualizar horários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Regenerar slots do usuário
   */
  async regenerateSlots(req, res) {
    try {
      const { id } = req.params;

      // Verificar se usuário existe
      const usuario = await Usuario.findById(id);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const result = await SlotService.updateSlotsForUser(id);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erro ao regenerar slots:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new UsuarioController();
