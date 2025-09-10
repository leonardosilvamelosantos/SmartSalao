const path = require('path');

// Forçar carregamento direto do SQLite para evitar problemas de cache
const sqliteConfig = require(path.join(__dirname, '../config/database-sqlite'));
const pool = sqliteConfig.pool;
const isSQLiteRuntime = sqliteConfig.dbConfig && sqliteConfig.dbConfig.type === 'sqlite';

/**
 * Classe base para todos os modelos
 * Fornece métodos CRUD comuns
 */
class BaseModel {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    // Compatibilidade com código legado que usava idColumn
    this.idColumn = primaryKey;
  }

  /**
   * Buscar todos os registros
   */
  async findAll(options = {}) {
    const { limit, offset, orderBy, where, tenantId, schema } = options;

    // Para SQLite, usar prefixo em vez de schema
    let tableName = this.tableName;
    if (schema) {
      // Detectar se é SQLite (não suporta schemas como PostgreSQL)
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      if (isSQLite) {
        tableName = `${schema}_${this.tableName}`;
      } else {
        tableName = `${schema}.${this.tableName}`;
      }
    }
    let query = `SELECT * FROM ${tableName}`;
    const values = [];
    let paramCount = 1;

    // Lista de condições WHERE
    const whereConditions = [];

    // Adicionar isolamento de tenant se fornecido (apenas para tabelas com id_tenant)
    if (tenantId && !schema) {
      whereConditions.push(`id_tenant = $${paramCount}`);
      values.push(tenantId);
      paramCount++;
    }

    // Adicionar WHERE adicional se fornecido
    if (where) {
      whereConditions.push(where.replace(/\$(\d+)/g, (match, num) => {
        const newNum = parseInt(num) + (tenantId ? 1 : 0);
        return `$${newNum}`;
      }));
      // Adicionar valores do where adicional
      if (options.whereValues) {
        values.push(...options.whereValues);
      }
    }

    // Construir cláusula WHERE final
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Adicionar ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    } else {
      query += ` ORDER BY ${this.primaryKey}`;
    }

    // Adicionar LIMIT e OFFSET
    if (limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(limit);
      paramCount++;
    }

    if (offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(offset);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Buscar registro por ID
   */
  async findById(id, tenantId = null, schema = null) {
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    let query = `SELECT * FROM ${tableName} WHERE ${this.primaryKey} = $1`;
    const values = [id];

    if (tenantId && !schema) {
      query += ` AND id_tenant = $2`;
      values.push(tenantId);
    }

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Criar novo registro
   */
  async create(data, tenantId = null, schema = null) {
    const dataWithTenant = { ...data };
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }

    // Se a tabela tem tenant_id e foi fornecido, adicionar automaticamente
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      dataWithTenant.id_tenant = tenantId;
    }

    const columns = Object.keys(dataWithTenant);
    const values = Object.values(dataWithTenant);

    // Usar placeholders compatíveis com SQLite
    const isSQLite = isSQLiteRuntime;
    const placeholders = columns.map((_, index) => isSQLite ? '?' : `$${index + 1}`);

    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    // Executar INSERT
    await pool.query(insertQuery, values);

    // Para SQLite: obter o registro recém-inserido via last_insert_rowid()
    if (isSQLite) {
      const selectInserted = `SELECT * FROM ${tableName} WHERE rowid = last_insert_rowid()`;
      const result = await pool.query(selectInserted);
      return (result && result.rows && result.rows[0]) ? result.rows[0] : { ...dataWithTenant };
    } else {
      // Para PostgreSQL, usar RETURNING
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      const result = await pool.query(query, values);
      return result.rows[0];
    }
  }

  /**
   * Atualizar registro por ID
   */
  async update(id, data, tenantId = null, schema = null) {
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = isSQLiteRuntime;
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    let query = `
      UPDATE ${tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $${columns.length + 1}
    `;

    values.push(id);

    // Adicionar condição de tenant se fornecido
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      query += ` AND id_tenant = $${columns.length + 2}`;
      values.push(tenantId);
    }

    query += ` RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Deletar registro por ID
   */
  async delete(id, tenantId = null, schema = null) {
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    let query = `DELETE FROM ${tableName} WHERE ${this.primaryKey} = $1`;
    const values = [id];

    // Adicionar condição de tenant se fornecido
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      query += ` AND id_tenant = $2`;
      values.push(tenantId);
    }

    query += ` RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Contar registros
   */
  async count(where = '', tenantId = null, schema = null) {
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    let query = `SELECT COUNT(*) as total FROM ${tableName}`;
    const values = [];
    let paramCount = 1;

    // Lista de condições WHERE
    const whereConditions = [];

    // Adicionar isolamento de tenant se fornecido
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      whereConditions.push(`id_tenant = $${paramCount}`);
      values.push(tenantId);
      paramCount++;
    }

    // Adicionar WHERE adicional se fornecido
    if (where) {
      whereConditions.push(where.replace(/\$(\d+)/g, (match, num) => {
        const newNum = parseInt(num) + (tenantId ? 1 : 0);
        return `$${newNum}`;
      }));
    }

    // Construir cláusula WHERE final
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total);
  }

  /**
   * Buscar com query customizada
   */
  async query(sql, values = []) {
    const result = await pool.query(sql, values);
    return result.rows;
  }
}

module.exports = BaseModel;
