/**
 * Configuração de Banco de Dados - PostgreSQL Only
 * Sistema Multi-Tenant usando exclusivamente PostgreSQL
 */

// Forçar uso do PostgreSQL sempre
const usePostgreSQL = true;

console.log('🐘 Usando PostgreSQL (configuração forçada)');

// Importar configuração PostgreSQL
const postgresConfig = require('../../config/postgres-config.js');
const pool = postgresConfig;

// Adaptar placeholders '?' -> $1, $2... para compatibilidade com código legado
const originalQuery = pool.query.bind(pool);
pool.query = async (sql, params = []) => {
  try {
    if (Array.isArray(params) && params.length > 0 && typeof sql === 'string' && sql.includes('?')) {
      let i = 0;
      const converted = sql.replace(/\?/g, () => `$${++i}`);
      return await originalQuery(converted, params);
    }
    return await originalQuery(sql, params);
  } catch (err) {
    throw err;
  }
};

const dbConfig = {
  type: 'postgresql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
};

// Função para testar conexão
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    return {
      success: true,
      type: 'postgresql',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version,
      pool: {
        totalCount: pool.totalCount || 0,
        idleCount: pool.idleCount || 0,
        waitingCount: pool.waitingCount || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      type: 'postgresql',
      error: error.message
    };
  }
}

// Função para executar queries
async function executeQuery(query, params = []) {
  return await pool.query(query, params);
}

// Função para executar transações
async function executeTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return { success: true, result };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Anexar helpers ao próprio pool para compatibilidade total
pool.testConnection = testConnection;
pool.executeQuery = executeQuery;
pool.executeTransaction = executeTransaction;
pool.isPostgreSQL = true;
pool.isSQLite = false;
pool.dbConfig = dbConfig;
// Auto-referência para suportar padrões como `const { pool } = require('../config/database')`
pool.pool = pool;

module.exports = pool;
