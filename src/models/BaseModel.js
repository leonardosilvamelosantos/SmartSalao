const path = require('path');

// Usar configuração automática de banco
const dbConfig = require('../config/database');
const pool = dbConfig.pool;
const isSQLiteRuntime = dbConfig.isSQLite;

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
   * Buscar registros por condições
   */
  async findBy(conditions, tenantId = null, schema = null) {
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    
    const whereConditions = [];
    const values = [];
    let paramCount = 1;

    // Adicionar isolamento de tenant se fornecido
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      whereConditions.push(`id_tenant = $${paramCount}`);
      values.push(tenantId);
      paramCount++;
    }

    // Adicionar condições fornecidas
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        whereConditions.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    let query = `SELECT * FROM ${tableName}`;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Buscar registro por ID
   */
  async findById(id, tenantId = null, schema = null) {
    console.log(`🔍 BaseModel.findById: ${this.tableName} - ID: ${id}, tenantId: ${tenantId}, schema: ${schema}`);
    
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

    console.log(`🔍 Query: ${query}`);
    console.log(`🔍 Values:`, values);

    const result = await pool.query(query, values);
    console.log(`🔍 Resultado:`, result.rows[0] || null);
    
    return result.rows[0] || null;
  }

  /**
   * Criar novo registro
   */
  async create(data, tenantId = null, schema = null) {
    // Log reduzido para evitar spam
    // console.log('🔍 [DEBUG] BaseModel.create chamado para tabela:', this.tableName);
    
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

    // Fluxo por banco de dados: evitar INSERT duplo em PostgreSQL
    if (isSQLite) {
      // Executar INSERT simples
      // Log reduzido para evitar spam
      // console.log('🔍 [DEBUG] Executando INSERT (SQLite) na tabela:', tableName);
      await pool.query(insertQuery, values);
      // Log reduzido
      // console.log('🔍 [DEBUG] INSERT (SQLite) executado com sucesso');

      // Obter o registro recém-inserido via last_insert_rowid()
      const selectInserted = `SELECT * FROM ${tableName} WHERE rowid = last_insert_rowid()`;
      const result = await pool.query(selectInserted);
      return (result && result.rows && result.rows[0]) ? result.rows[0] : { ...dataWithTenant };
    } else {
      // PostgreSQL: executar apenas UMA vez com RETURNING
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;
      // Log reduzido
      // console.log('🔍 [DEBUG] Executando query com RETURNING:', query);
      const result = await pool.query(query, values);
      // console.log('🔍 [DEBUG] Resultado do RETURNING:', result.rows[0]);
      return result.rows[0];
    }
  }

  /**
   * Atualizar registro por ID
   */
  async update(id, data, tenantId = null, schema = null) {
    console.log(`🔄 BaseModel.update: ${this.tableName} - ID: ${id}, data:`, data, `tenantId: ${tenantId}, schema: ${schema}`);
    
    let tableName = this.tableName;
    if (schema) {
      const isSQLite = isSQLiteRuntime;
      tableName = isSQLite ? `${schema}_${this.tableName}` : `${schema}.${this.tableName}`;
    }
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    // Usar placeholders compatíveis com SQLite
    const isSQLite = isSQLiteRuntime;
    const setClause = columns.map((col, index) => `${col} = ${isSQLite ? '?' : `$${index + 1}`}`).join(', ');

    let query = `
      UPDATE ${tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = ${isSQLite ? '?' : `$${columns.length + 1}`}
    `;

    values.push(id);

    // Adicionar condição de tenant se fornecido
    if (tenantId && this.tableName !== 'tenants' && !schema) {
      query += ` AND id_tenant = ${isSQLite ? '?' : `$${columns.length + 2}`}`;
      values.push(tenantId);
    }

    console.log(`🔄 Query: ${query}`);
    console.log(`🔄 Values:`, values);
    
    // Executar UPDATE
    const result = await pool.query(query, values);
    console.log(`🔄 Resultado do UPDATE:`, result);

    // Para SQLite, buscar o registro atualizado
    if (isSQLite) {
      const selectQuery = `SELECT * FROM ${tableName} WHERE ${this.primaryKey} = ?`;
      const selectValues = [id];
      
      if (tenantId && this.tableName !== 'tenants' && !schema) {
        selectQuery += ` AND id_tenant = ?`;
        selectValues.push(tenantId);
      }
      
      const result = await pool.query(selectQuery, selectValues);
      return result.rows[0] || null;
    } else {
      // Para PostgreSQL, usar RETURNING
      query += ` RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    }
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
   * IMPORTANTE: Sempre usar prepared statements para evitar SQL injection
   */
  async query(sql, values = []) {
    try {
      // Validar se a query contém apenas operações permitidas
      this.validateQuery(sql);
      
      const result = await pool.query(sql, values);
      return result.rows;
    } catch (error) {
      // Se for erro de validação de SQL injection, registrar alerta
      if (error.message.includes('padrões suspeitos') || error.message.includes('SQL injection')) {
        const SecurityAlertService = require('../services/SecurityAlertService');
        const securityAlert = new SecurityAlertService();
        
        await securityAlert.logSQLInjectionAttempt(sql, 'unknown', 'unknown');
      }
      throw error;
    }
  }

  /**
   * Validar query para prevenir SQL injection
   */
  validateQuery(sql) {
    const upperSQL = sql.toUpperCase().trim();
    
    // Lista de operações permitidas
    const allowedOperations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH'];
    const hasAllowedOperation = allowedOperations.some(op => upperSQL.startsWith(op));
    
    if (!hasAllowedOperation) {
      throw new Error('Operação SQL não permitida');
    }
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = [
      /UNION\s+SELECT/i,
      /DROP\s+TABLE/i,
      /TRUNCATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /EXEC\s*\(/i,
      /EXECUTE\s*\(/i,
      /--/,
      /\/\*/,
      /\*\//
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sql)) {
        throw new Error('Query contém padrões suspeitos que podem indicar SQL injection');
      }
    }
  }
}

module.exports = BaseModel;
