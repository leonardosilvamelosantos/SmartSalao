const BaseModel = require('./BaseModel');

class Cliente extends BaseModel {
  constructor() {
    super('clientes', 'id_cliente');
  }

  /**
   * Buscar cliente por WhatsApp e usuário
   */
  async findByWhatsapp(idUsuario, whatsapp, schema = null) {
    let tablePrefix = '';
    const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
    if (schema && !isSQLite) {
      tablePrefix = `${schema}.`;
    }

    // Usar formato compatível com SQLite quando não há schema
    // Detectar SQLite para placeholders
    const query = isSQLite
      ? `SELECT * FROM ${tablePrefix}clientes WHERE id_usuario = ? AND whatsapp = ?`
      : `SELECT * FROM ${tablePrefix}clientes WHERE id_usuario = $1 AND whatsapp = $2`;

    const result = await this.query(query, [idUsuario, whatsapp]);
    return result[0] || null;
  }

  /**
   * Buscar clientes por usuário
   */
  async findByUsuario(idUsuario, options = {}) {
    const { limit, offset, search, schema } = options;

    let tablePrefix = '';
    const isSQLite2 = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
    if (schema && !isSQLite2) {
      tablePrefix = `${schema}.`;
    }

    // Para SQLite, usar placeholders ?
    const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
    let query = `
      SELECT c.*, u.nome as usuario_nome
      FROM ${tablePrefix}clientes c
      JOIN ${tablePrefix}usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_usuario = ${isSQLite ? '?' : '$1'}
    `;

    const values = [idUsuario];
    let paramCount = isSQLite ? 1 : 2;

    // Adicionar busca por nome ou WhatsApp
    if (search) {
      if (isSQLite) {
        query += ` AND (c.nome LIKE ? OR c.whatsapp LIKE ?)`;
        values.push(`%${search}%`, `%${search}%`);
      } else {
        const ph1 = `$${paramCount}`;
        const ph2 = `$${paramCount + 1}`;
        query += ` AND (c.nome LIKE ${ph1} OR c.whatsapp LIKE ${ph2})`;
        values.push(`%${search}%`, `%${search}%`);
        paramCount += 2;
      }
    }

    // Corrigir coluna de ordenação para SQLite
    query += ` ORDER BY c.created_at DESC`;

    if (limit) {
      if (isSQLite) {
        query += ` LIMIT ?`;
      } else {
        query += ` LIMIT $${paramCount}`;
        paramCount++;
      }
      values.push(limit);
    }

    if (offset) {
      if (isSQLite) {
        query += ` OFFSET ?`;
      } else {
        query += ` OFFSET $${paramCount}`;
        paramCount++;
      }
      values.push(offset);
    }

    return await this.query(query, values);
  }

  /**
   * Criar ou buscar cliente existente
   */
  async findOrCreate(idUsuario, whatsapp, nome = null) {
    // Tentar encontrar cliente existente
    let cliente = await this.findByWhatsapp(idUsuario, whatsapp);

    if (cliente) {
      // Se encontrou e nome foi fornecido, atualizar
      if (nome && !cliente.nome) {
        cliente = await this.update(cliente.id_cliente, { nome });
      }
      return cliente;
    }

    // Criar novo cliente
    return await this.create({
      id_usuario: idUsuario,
      whatsapp,
      nome
    });
  }

  /**
   * Buscar cliente com histórico de agendamentos
   */
  async findWithHistory(id) {
    // Buscar dados do cliente + usuario
    const clienteRows = await this.query(`
      SELECT c.*, u.nome as usuario_nome
      FROM clientes c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_cliente = ?
    `, [id]);

    if (!clienteRows || clienteRows.length === 0) return null;

    const cliente = clienteRows[0];

    // Buscar agendamentos do cliente
    const agendamentos = await this.query(`
      SELECT a.id_agendamento, s.nome_servico as servico_nome, a.start_at, a.status, s.valor
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      WHERE a.id_cliente = ?
      ORDER BY a.start_at DESC
    `, [id]);

    return { ...cliente, agendamentos };
  }

  /**
   * Buscar clientes com estatísticas
   */
  async findWithStats(idUsuario, options = {}) {
    const { limit = 10, offset = 0 } = options;

    const query = `
      SELECT
        c.*,
        COUNT(a.id_agendamento) as total_agendamentos,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as agendamentos_concluidos,
        MAX(a.start_at) as ultimo_agendamento
      FROM clientes c
      LEFT JOIN agendamentos a ON c.id_cliente = a.id_cliente
      WHERE c.id_usuario = $1
      GROUP BY c.id_cliente
      ORDER BY ultimo_agendamento DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    return await this.query(query, [idUsuario, limit, offset]);
  }
}

module.exports = new Cliente();
