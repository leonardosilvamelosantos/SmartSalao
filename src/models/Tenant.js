const BaseModel = require('./BaseModel');

/**
 * Modelo para Tenants (Clientes/Organizações)
 */
class Tenant extends BaseModel {
  constructor() {
    super('tenants', 'id_tenant');
  }

  /**
   * Buscar tenant por domínio
   */
  async findByDomain(dominio) {
    const query = 'SELECT * FROM tenants WHERE dominio = $1 AND status = $2';
    const result = await this.query(query, [dominio, 'ativo']);
    return result[0] || null;
  }

  /**
   * Buscar tenant por ID com validação de status
   */
  async findByIdActive(id) {
    const query = 'SELECT * FROM tenants WHERE id_tenant = $1 AND status = $2';
    const result = await this.query(query, [id, 'ativo']);
    return result[0] || null;
  }

  /**
   * Criar tenant com domínio único
   */
  async create(data) {
    // Verificar se domínio já existe
    if (data.dominio) {
      const existingTenant = await this.findByDomain(data.dominio);
      if (existingTenant) {
        throw new Error('Domínio já está em uso');
      }
    }

    const tenantData = {
      ...data,
      status: data.status || 'ativo',
      config_tenant: data.config_tenant || {}
    };

    return super.create(tenantData);
  }

  /**
   * Atualizar tenant
   */
  async update(id, data) {
    // Verificar se domínio já existe para outro tenant
    if (data.dominio) {
      const existingTenant = await this.query(
        'SELECT * FROM tenants WHERE dominio = $1 AND id_tenant != $2',
        [data.dominio, id]
      );
      if (existingTenant.length > 0) {
        throw new Error('Domínio já está em uso por outro tenant');
      }
    }

    return super.update(id, data);
  }

  /**
   * Listar tenants ativos
   */
  async findActive(options = {}) {
    const whereClause = 'status = \'ativo\'';
    return this.findAll({ ...options, where: whereClause });
  }
}

module.exports = new Tenant();
