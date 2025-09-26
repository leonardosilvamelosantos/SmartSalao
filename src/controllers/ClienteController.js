const Cliente = require('../models/Cliente');

/**
 * Controlador para operações com clientes
 */
class ClienteController {

  /**
   * Método estático para uso pelo bot WhatsApp - cria cliente sem autenticação
   * @param {Object} clienteData - Dados do cliente
   * @returns {Promise<Object>} Cliente criado
   */
  static async createForBot(clienteData) {
    try {
      const Cliente = require('../models/Cliente');

      // Verificar se já existe um cliente com esse telefone
      const existingCliente = await Cliente.findByTelefone(clienteData.telefone || clienteData.phone);
      if (existingCliente) {
        return existingCliente;
      }

      // Criar novo cliente
      const novoCliente = {
        nome: clienteData.nome || clienteData.name,
        telefone: clienteData.telefone || clienteData.phone,
        email: clienteData.email || null,
        whatsapp: clienteData.whatsapp || clienteData.phone,
        tenant_id: clienteData.tenant_id || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const clienteId = await Cliente.create(novoCliente);
      const clienteCriado = await Cliente.findById(clienteId);

      return clienteCriado;
    } catch (error) {
      console.error('Erro ao criar cliente para bot:', error);
      throw error;
    }
  }
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
      // Compatível com bases sem coluna id_tenant
      let countSql = 'SELECT COUNT(*) as total FROM clientes WHERE id_usuario = $1';
      const countParams = [userId];
      // Verificar existência da coluna id_tenant
      const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='id_tenant'");
      if (col.rows.length > 0 && tenantId) {
        countSql += ' AND (id_tenant = $2 OR id_tenant IS NULL)';
        countParams.push(tenantId);
      }
      const countRes = await pool.query(countSql, countParams);
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
   * Exportar clientes do usuário logado (JSON)
   */
  async export(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const clientes = await Cliente.findByUsuario(userId, { limit: null, offset: null });

      // Mapear campos essenciais
      const data = clientes.map(c => ({
        nome: c.nome || '',
        whatsapp: c.whatsapp || '',
        email: c.email || ''
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="clientes-${new Date().toISOString().split('T')[0]}.json"`);
      return res.status(200).send(JSON.stringify({ success: true, data }, null, 2));
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Importar clientes em massa (JSON)
   */
  async import(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const payload = req.body;
      const lista = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(lista)) {
        return res.status(400).json({ success: false, message: 'Formato inválido. Envie um array de clientes ou { data: [...] }' });
      }

      // Verificar se a tabela tem coluna email
      const pool = require('../config/database');
      const isSQLite = pool.isSQLite;
      
      let hasEmailColumn = false;
      if (isSQLite) {
        // Para SQLite, usar PRAGMA
        const result = await pool.query("PRAGMA table_info(clientes)");
        hasEmailColumn = result.rows.some(col => col.name === 'email');
      } else {
        // Para PostgreSQL, usar information_schema
        const result = await pool.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clientes' AND column_name = 'email'
        `);
        hasEmailColumn = result.rows.length > 0;
      }

      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;
      const resultados = [];

      for (const item of lista) {
        const nome = (item.nome || item.name || '').toString().trim();
        const whatsapp = (item.whatsapp || item.phone || '').toString().trim();
        const email = (item.email || '').toString().trim();

        if (!whatsapp) {
          ignorados++;
          resultados.push({ status: 'ignored', reason: 'whatsapp ausente', item });
          continue;
        }

        // Verificar existente por whatsapp
        const existente = await Cliente.findByWhatsapp(userId, whatsapp);
        if (existente) {
          // Atualizar campos simples se vierem preenchidos
          const update = {};
          if (nome && !existente.nome) update.nome = nome;
          if (hasEmailColumn && email && !existente.email) update.email = email;
          if (Object.keys(update).length > 0) {
            await Cliente.update(existente.id_cliente, update);
            atualizados++;
            resultados.push({ status: 'updated', id_cliente: existente.id_cliente, whatsapp });
          } else {
            ignorados++;
            resultados.push({ status: 'skipped', id_cliente: existente.id_cliente, whatsapp });
          }
          continue;
        }

        // Criar novo - só incluir email se a coluna existir
        const clienteData = {
          id_usuario: userId,
          nome: nome || null,
          whatsapp
        };
        
        if (hasEmailColumn && email) {
          clienteData.email = email;
        }

        const novo = await Cliente.create(clienteData);
        inseridos++;
        resultados.push({ status: 'inserted', id_cliente: novo.id_cliente || novo.id, whatsapp });
      }

      return res.status(201).json({
        success: true,
        message: 'Importação concluída',
        data: { inseridos, atualizados, ignorados, total: lista.length, resultados }
      });
    } catch (error) {
      console.error('Erro ao importar clientes:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
      const tenantId = req.user?.tenant_id;

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

      // Inserção dinâmica compatível com bases com/sem coluna id_tenant
      const pool = require('../config/database');
      const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes' AND column_name='id_tenant'");
      const hasTenantCol = col.rows.length > 0;

      const cols = ['id_usuario', 'nome', 'whatsapp', 'email'];
      const vals = [clienteData.id_usuario, clienteData.nome || null, clienteData.whatsapp, clienteData.email || null];
      if (hasTenantCol) {
        cols.unshift('id_tenant');
        vals.unshift(clienteData.id_tenant || tenantId || null);
      }
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const insertSql = `INSERT INTO clientes (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const insertRes = await pool.query(insertSql, vals);
      const cliente = insertRes.rows[0];

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
      const pool = require('../config/database');
      const countRes = await pool.query('SELECT COUNT(*) as total FROM clientes WHERE id_usuario = $1', [userId]);
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