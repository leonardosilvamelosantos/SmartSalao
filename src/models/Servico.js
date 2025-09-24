const BaseModel = require('./BaseModel');

class Servico extends BaseModel {
  constructor() {
    super('servicos', 'id_servico');
  }

  /**
   * Buscar serviços por usuário
   */
  async findByUsuario(idUsuario, options = {}) {
    const { limit, offset, schema } = options;
    let tablePrefix = '';
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tablePrefix = isSQLite ? `${schema}_` : `${schema}.`;
    }

    let query = `
      SELECT s.*, u.nome as usuario_nome
      FROM ${tablePrefix}servicos s
      JOIN ${tablePrefix}usuarios u ON s.id_usuario = u.id_usuario
      WHERE s.id_usuario = ?
      ORDER BY s.created_at DESC
    `;

    const values = [idUsuario];

    if (limit) {
      query += ` LIMIT ?`;
      values.push(limit);
    }

    if (offset) {
      query += ` OFFSET ?`;
      values.push(offset);
    }

    return await this.query(query, values);
  }

  /**
   * Criar serviço com validações
   */
  async create(data, schema = null) {
    // Validações básicas
    if (!data.id_usuario) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!data.nome_servico) {
      throw new Error('Nome do serviço é obrigatório');
    }

    if (!data.duracao_min || data.duracao_min <= 0) {
      throw new Error('Duração deve ser maior que 0 minutos');
    }

    if (!data.valor || data.valor < 0) {
      throw new Error('Valor deve ser maior ou igual a 0');
    }

    return super.create(data, null, schema);
  }

  /**
   * Buscar serviço com usuário
   */
  async findWithUsuario(id) {
    const query = `
      SELECT s.*, u.nome as usuario_nome, u.timezone
      FROM servicos s
      JOIN usuarios u ON s.id_usuario = u.id_usuario
      WHERE s.id_servico = ?
    `;
    const result = await this.query(query, [id]);
    return result[0] || null;
  }

  /**
   * Buscar serviços disponíveis (não têm agendamentos conflitantes)
   */
  async findAvailable(idUsuario, startDate, endDate) {
    const query = `
      SELECT DISTINCT s.*
      FROM servicos s
      WHERE s.id_usuario = ?
      AND NOT EXISTS (
        SELECT 1 FROM agendamentos a
        WHERE a.id_servico = s.id_servico
        AND a.status = 'confirmed'
        AND (
          (a.data_agendamento <= ? AND a.end_at > ?) OR
          (a.data_agendamento < ? AND a.end_at >= ?) OR
          (a.data_agendamento >= ? AND a.end_at <= ?)
        )
      )
      ORDER BY s.nome_servico
    `;

    return await this.query(query, [idUsuario, startDate, startDate, startDate, endDate, endDate]);
  }

  /**
   * Buscar serviços mais populares (por número de agendamentos)
   */
  async findPopular(idUsuario, limit = 5) {
    const query = `
      SELECT
        s.*,
        COUNT(a.id_agendamento) as total_agendamentos,
        AVG(a.status = 'completed') as taxa_conclusao
      FROM servicos s
      LEFT JOIN agendamentos a ON s.id_servico = a.id_servico
      WHERE a.id_usuario = ?
      GROUP BY s.id_servico
      ORDER BY total_agendamentos DESC
      LIMIT ?
    `;

    return await this.query(query, [idUsuario, limit]);
  }
}

module.exports = new Servico();
