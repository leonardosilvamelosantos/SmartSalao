const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');

class Usuario extends BaseModel {
  constructor() {
    super('usuarios', 'id_usuario');
  }

  /**
   * Buscar usuário por WhatsApp
   */
  async findByWhatsapp(whatsapp, tenantId = null, schema = null) {
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `SELECT * FROM ${tablePrefix}usuarios WHERE whatsapp = $1`;
    const values = [whatsapp];

    const result = await this.query(query, values);
    return result[0] || null;
  }

  /**
   * Buscar usuário por ID
   */
  async findById(id, tenantId = null, schema = null) {
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `SELECT * FROM ${tablePrefix}usuarios WHERE id_usuario = $1`;
    const values = [id];

    const result = await this.query(query, values);
    return result[0] || null;
  }

  /**
   * Buscar usuários por tenant
   */
  async findByTenant(tenantId, schema = null) {
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `SELECT * FROM ${tablePrefix}usuarios WHERE id_tenant = $1 ORDER BY nome`;
    const values = [tenantId];

    const result = await this.query(query, values);
    return result || [];
  }

  async findWithServices(id, tenantId = null, schema = null) {
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `
      SELECT
        u.*,
        GROUP_CONCAT(s.id_servico || '|' || s.nome_servico || '|' || s.duracao_min || '|' || s.valor) as servicos
      FROM ${tablePrefix}usuarios u
      LEFT JOIN ${tablePrefix}servicos s ON u.id_usuario = s.id_usuario
      WHERE u.id_usuario = $1
    `;
    const values = [id];

    query += ' GROUP BY u.id_usuario';

    const result = await this.query(query, values);
    return result[0] || null;
  }

  /**
   * Criar usuário com validações
   */
  async create(data, tenantId = null) {
    // Validações básicas
    if (!data.nome) {
      throw new Error('Nome é obrigatório');
    }

    if (!data.whatsapp) {
      throw new Error('WhatsApp é obrigatório');
    }

    // Verificar se WhatsApp já existe (sem tenant no schema atual)
    const existingUser = await this.query(
      'SELECT * FROM usuarios WHERE whatsapp = $1',
      [data.whatsapp]
    );
    if (existingUser.length > 0) {
      throw new Error('WhatsApp já cadastrado');
    }

    // No schema SQLite atual, a tabela `usuarios` possui: id_usuario, nome, whatsapp, timezone, created_at
    const userData = {
      nome: data.nome,
      whatsapp: data.whatsapp,
      timezone: data.timezone || 'America/Sao_Paulo'
    };

    // Sanitizar campos não suportados no schema atual
    delete userData.senha;
    delete userData.senha_hash;

    return super.create(userData, null);
  }

  /**
   * Atualizar configuração de horários (não suportado no schema atual)
   */
  async updateHorarios(id, configHorarios, tenantId = null) {
    // No schema atual não há coluna config_horarios; retornar no-op
    return this.findById(id, null);
  }

  /**
   * Buscar usuários com estatísticas (simplificado para schema atual)
   */
  async findWithStats(options = {}) {
    const { limit = 10, offset = 0 } = options;

    let query = `
      SELECT
        u.*,
        COUNT(DISTINCT s.id_servico) as total_servicos
      FROM usuarios u
      LEFT JOIN servicos s ON u.id_usuario = s.id_usuario
      GROUP BY u.id_usuario
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    return await this.query(query, [limit, offset]);
  }

  /**
   * Buscar usuário para autenticação (por WhatsApp)
   */
  async findForAuth(whatsapp, tenantId = null, schema = null) {
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `
      SELECT id_usuario, nome, whatsapp, timezone
      FROM ${tablePrefix}usuarios
      WHERE whatsapp = $1
    `;
    const values = [whatsapp];

    const result = await this.query(query, values);
    return result[0] || null;
  }

  /**
   * Verificar senha do usuário
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Atualizar senha do usuário (não suportado no schema atual)
   */
  async updatePassword(id, newPassword, tenantId = null) {
    return this.findById(id, null);
  }

  /**
   * Buscar usuário com dados de tenant (não aplicável no schema atual)
   */
  async findWithTenant(id) {
    const query = `
      SELECT
        u.*
      FROM usuarios u
      WHERE u.id_usuario = $1
    `;

    const result = await this.query(query, [id]);
    return result[0] || null;
  }
}

module.exports = new Usuario();
