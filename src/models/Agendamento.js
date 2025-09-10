const BaseModel = require('./BaseModel');

class Agendamento extends BaseModel {
  constructor() {
    super('agendamentos', 'id_agendamento');
  }

  /**
   * Buscar agendamentos por usuário
   */
  async findByUsuario(idUsuario, options = {}) {
    const { limit, offset, status, startDate, endDate, schema } = options;

    // Determinar prefixo baseado no schema (não usar prefixo em SQLite)
    const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
    const prefix = schema && !isSQLite ? `${schema}.` : '';

    let query = `
      SELECT
        a.*,
        c.nome as cliente_nome,
        c.whatsapp as cliente_whatsapp,
        s.nome_servico,
        s.duracao_min,
        s.valor
      FROM ${prefix}agendamentos a
      JOIN ${prefix}clientes c ON a.id_cliente = c.id_cliente
      JOIN ${prefix}servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
    `;

    const values = [idUsuario];

    if (status) {
      query += ` AND a.status = ?`;
      values.push(status);
    }

    if (startDate) {
      query += ` AND a.start_at >= ?`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND a.start_at <= ?`;
      values.push(endDate);
    }

    query += ` ORDER BY a.start_at ASC`;

    if (limit) {
      query += ` LIMIT ?`;
      values.push(limit);
    }

    if (offset) {
      query += ` OFFSET ?`;
      values.push(offset);
    }

    const result = await this.query(query, values);
    return result;
  }

  /**
   * Buscar agendamentos por cliente
   */
  async findByCliente(idCliente, options = {}) {
    const { limit, offset, status } = options;

    let query = `
      SELECT
        a.*,
        s.nome_servico,
        s.duracao_min,
        s.valor,
        u.nome as usuario_nome
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      JOIN usuarios u ON a.id_usuario = u.id_usuario
      WHERE a.id_cliente = ?
    `;

    const values = [idCliente];

    if (status) {
      query += ` AND a.status = ?`;
      values.push(status);
    }

    query += ` ORDER BY a.start_at DESC`;

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
   * Buscar agendamento com detalhes completos
   */
  async findWithDetails(id) {
    const query = `
      SELECT
        a.*,
        c.nome as cliente_nome,
        c.whatsapp as cliente_whatsapp,
        s.nome_servico,
        s.duracao_min,
        s.valor,
        u.nome as usuario_nome,
        u.timezone
      FROM agendamentos a
      JOIN clientes c ON a.id_cliente = c.id_cliente
      JOIN servicos s ON a.id_servico = s.id_servico
      JOIN usuarios u ON a.id_usuario = u.id_usuario
      WHERE a.id_agendamento = ?
    `;
    const result = await this.query(query, [id]);
    return result[0] || null;
  }

  /**
   * Criar agendamento com validações e verificação de disponibilidade
   */
  async create(data) {
    // Validações básicas
    if (!data.id_usuario) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!data.id_cliente) {
      throw new Error('ID do cliente é obrigatório');
    }

    if (!data.id_servico) {
      throw new Error('ID do serviço é obrigatório');
    }

    if (!data.start_at) {
      throw new Error('Data/hora de início é obrigatória');
    }

    // Verificar se o horário está disponível
    await this.checkAvailability(data.id_usuario, data.start_at, data.id_servico);

    // Calcular end_at baseado na duração do serviço
    const Servico = require('./Servico');
    const servico = await Servico.findById(data.id_servico);

    if (!servico) {
      throw new Error('Serviço não encontrado');
    }

    const startAt = new Date(data.start_at);
    const endAt = new Date(startAt.getTime() + servico.duracao_min * 60000);

    const agendamentoData = {
      ...data,
      start_at: startAt,
      end_at: endAt,
      status: data.status || 'confirmed'
    };

    return super.create(agendamentoData);
  }

  /**
   * Verificar disponibilidade de horário
   */
  async checkAvailability(idUsuario, startAt, idServico) {
    const Servico = require('./Servico');
    const servico = await Servico.findById(idServico);

    if (!servico) {
      throw new Error('Serviço não encontrado');
    }

    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + servico.duracao_min * 60000);

    // Verificar se há conflitos com agendamentos existentes
    const conflictQuery = `
      SELECT id_agendamento
      FROM agendamentos
      WHERE id_usuario = ?
      AND status = 'confirmed'
      AND (
        (start_at <= ? AND end_at > ?) OR
        (start_at < ? AND end_at >= ?) OR
        (start_at >= ? AND end_at <= ?)
      )
      LIMIT 1
    `;

    const conflict = await this.query(conflictQuery, [idUsuario, startDate, startDate, startDate, endDate, endDate]);

    if (conflict.length > 0) {
      throw new Error('Horário não disponível - conflito com agendamento existente');
    }

    return true;
  }

  /**
   * Cancelar agendamento
   */
  async cancel(id) {
    const query = `
      UPDATE agendamentos
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id_agendamento = ?
    `;
    await this.query(query, [id]);
    const sel = await this.query('SELECT * FROM agendamentos WHERE id_agendamento = ?', [id]);
    return sel[0] || null;
  }

  /**
   * Marcar agendamento como concluído
   */
  async complete(id) {
    const query = `
      UPDATE agendamentos
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id_agendamento = ?
    `;
    await this.query(query, [id]);
    const sel = await this.query('SELECT * FROM agendamentos WHERE id_agendamento = ?', [id]);
    return sel[0] || null;
  }

  /**
   * Buscar agendamentos por período
   */
  async findByPeriod(idUsuario, startDate, endDate, status = null) {
    let query = `
      SELECT
        a.*,
        c.nome as cliente_nome,
        c.whatsapp as cliente_whatsapp,
        s.nome_servico,
        s.duracao_min,
        s.valor
      FROM agendamentos a
      JOIN clientes c ON a.id_cliente = c.id_cliente
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_usuario = ?
      AND a.start_at >= ?
      AND a.start_at <= ?
    `;

    const values = [idUsuario, startDate, endDate];

    if (status) {
      query += ` AND a.status = ?`;
      values.push(status);
    }

    query += ` ORDER BY a.start_at ASC`;

    return await this.query(query, values);
  }
}

module.exports = new Agendamento();
