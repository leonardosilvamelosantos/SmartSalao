const Cliente = require('../models/Cliente');

/**
 * Controlador para operações com clientes
 */
class ClienteController {
  /**
   * Listar clientes com paginação e filtros
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const schema = req.tenant?.schema;
      const tenantId = req.user?.tenant_id || req.tenant?.id || null;

      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        search,
        schema
      };

      const clientes = await Cliente.findByUsuario(userId, options);
      // Evitar COUNT com string interpolada e incompatibilidades de placeholder
      const pool = require('../config/database');
      const countRes = await pool.query(
        'SELECT COUNT(*) as total FROM clientes WHERE id_usuario = ? AND (id_tenant = ? OR id_tenant IS NULL)',
        [userId, tenantId]
      );
      const total = parseInt(countRes.rows[0].total || 0);

      res.json({
        success: true,
        data: clientes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar cliente por ID
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

      const cliente = await Cliente.findById(parseInt(id));

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      // Verificar se o cliente pertence ao usuário
      if (cliente.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este cliente'
        });
      }

      res.json({
        success: true,
        data: cliente
      });

    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo cliente
   */
  async create(req, res) {
    try {
      const clienteData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Verificar se WhatsApp já existe para este usuário
      const existingCliente = await Cliente.findByWhatsapp(userId, clienteData.whatsapp);
      if (existingCliente) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp já cadastrado para este cliente'
        });
      }

      // Adicionar ID do usuário
      clienteData.id_usuario = userId;
      clienteData.id_tenant = tenantId;

      // Inserção direta para evitar inconsistências do BaseModel com SQLite
      const pool = require('../config/database');
      await pool.query(
        'INSERT INTO clientes (id_tenant, id_usuario, nome, whatsapp, email, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
        [clienteData.id_tenant, clienteData.id_usuario, clienteData.nome || null, clienteData.whatsapp, clienteData.email || null, clienteData.observacoes || null]
      );
      const sel = await pool.query('SELECT * FROM clientes WHERE id_usuario = ? AND whatsapp = ? AND (id_tenant IS ? OR id_tenant = ?) ORDER BY id_cliente DESC LIMIT 1', [userId, clienteData.whatsapp, null, tenantId]);
      const cliente = sel.rows[0];

      res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: cliente
      });

    } catch (error) {
      console.error('Erro ao criar cliente:', error);

      if (error.message.includes('já cadastrado')) {
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
   * Atualizar cliente
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

      // Verificar se cliente existe e pertence ao usuário
      const existingCliente = await Cliente.findById(parseInt(id));
      if (!existingCliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      if (existingCliente.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para editar este cliente'
        });
      }

      // Se está mudando o WhatsApp, verificar se já existe
      if (updateData.whatsapp && updateData.whatsapp !== existingCliente.whatsapp) {
        const whatsappExists = await Cliente.findByWhatsapp(userId, updateData.whatsapp);
        if (whatsappExists) {
          return res.status(400).json({
            success: false,
            message: 'WhatsApp já cadastrado para outro cliente'
          });
        }
      }

      const cliente = await Cliente.update(parseInt(id), updateData);

      res.json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: cliente
      });

    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar cliente
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

      // Verificar se cliente existe e pertence ao usuário
      const cliente = await Cliente.findById(parseInt(id));
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      if (cliente.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para deletar este cliente'
        });
      }

      // Verificar se tem agendamentos ativos
      const activeBookings = await Cliente.query(`
        SELECT COUNT(*) as count FROM agendamentos
        WHERE id_cliente = $1 AND status = 'confirmed'
      `, [parseInt(id)]);

      if (activeBookings[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar cliente com agendamentos ativos'
        });
      }

      await Cliente.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Cliente deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar cliente com histórico completo
   */
  async showWithHistory(req, res) {
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

      const cliente = await Cliente.findWithHistory(parseInt(id));

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      // Verificar se o cliente pertence ao usuário
      if (cliente.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este cliente'
        });
      }

      res.json({
        success: true,
        data: cliente
      });

    } catch (error) {
      console.error('Erro ao buscar cliente com histórico:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar clientes com estatísticas
   */
  async getWithStats(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const clientes = await Cliente.findWithStats(userId, options);
      const total = await Cliente.count(`id_usuario = ${userId}`, null, req.tenant?.schema);

      res.json({
        success: true,
        data: clientes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar clientes com estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar ou criar cliente por WhatsApp
   */
  async findOrCreateByWhatsapp(req, res) {
    try {
      const { whatsapp, nome } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!whatsapp) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp é obrigatório'
        });
      }

      const cliente = await Cliente.findOrCreate(userId, whatsapp, nome);

      res.json({
        success: true,
        data: cliente,
        message: cliente.created_at === cliente.updated_at ? 'Cliente criado' : 'Cliente encontrado'
      });

    } catch (error) {
      console.error('Erro ao buscar/criar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new ClienteController();