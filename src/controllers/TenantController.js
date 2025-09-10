const Tenant = require('../models/Tenant');

/**
 * Controlador para operações com Tenants
 */
class TenantController {
  /**
   * Listar tenants com paginação
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      let options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      let tenants;

      if (search) {
        // Busca por nome ou domínio
        tenants = await Tenant.query(`
          SELECT * FROM tenants
          WHERE nome_tenant ILIKE $1 OR dominio ILIKE $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `, [`%${search}%`, options.limit, options.offset]);
      } else {
        tenants = await Tenant.findAll(options);
      }

      const total = await Tenant.count(search ? `nome_tenant ILIKE '%${search}%' OR dominio ILIKE '%${search}%'` : '');

      res.json({
        success: true,
        data: tenants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao listar tenants:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar tenant por ID
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

      const tenant = await Tenant.findById(parseInt(id));

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      res.json({
        success: true,
        data: tenant
      });

    } catch (error) {
      console.error('Erro ao buscar tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo tenant
   */
  async create(req, res) {
    try {
      const tenantData = req.body;

      const tenant = await Tenant.create(tenantData);

      res.status(201).json({
        success: true,
        message: 'Tenant criado com sucesso',
        data: tenant
      });

    } catch (error) {
      console.error('Erro ao criar tenant:', error);

      if (error.message.includes('Domínio já está em uso')) {
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
   * Atualizar tenant
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

      // Verificar se tenant existe
      const existingTenant = await Tenant.findById(parseInt(id));
      if (!existingTenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      const tenant = await Tenant.update(parseInt(id), updateData);

      res.json({
        success: true,
        message: 'Tenant atualizado com sucesso',
        data: tenant
      });

    } catch (error) {
      console.error('Erro ao atualizar tenant:', error);

      if (error.message.includes('Domínio já está em uso')) {
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
   * Deletar tenant
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

      // Verificar se tenant existe
      const tenant = await Tenant.findById(parseInt(id));
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      // Verificar se tem usuários associados
      const usersCount = await Tenant.query(`
        SELECT COUNT(*) as count FROM usuarios WHERE id_tenant = $1
      `, [parseInt(id)]);

      if (usersCount[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar tenant com usuários associados'
        });
      }

      await Tenant.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Tenant deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar tenant por domínio
   */
  async findByDomain(req, res) {
    try {
      const { dominio } = req.params;

      if (!dominio) {
        return res.status(400).json({
          success: false,
          message: 'Domínio é obrigatório'
        });
      }

      const tenant = await Tenant.findByDomain(dominio);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      res.json({
        success: true,
        data: tenant
      });

    } catch (error) {
      console.error('Erro ao buscar tenant por domínio:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new TenantController();
