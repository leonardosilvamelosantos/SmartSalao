/**
 * Configuração de Banco de Dados - Detecção Automática
 * Sistema Multi-Tenant com suporte a SQLite (dev) e PostgreSQL (prod)
 */

// Detectar qual banco usar baseado no ambiente
const usePostgreSQL = process.env.NODE_ENV === 'production' || 
                     process.env.DB_TYPE === 'postgresql' || 
                     process.env.USE_POSTGRESQL === 'true' ||
                     process.env.USE_SQLITE === 'false';

let pool, dbConfig;

if (usePostgreSQL) {
  console.log('🐘 Usando PostgreSQL para produção');
  
  // Importar configuração PostgreSQL
  // Evitar qualquer confusão de importação: usar wrapper dedicado
  const postgresConfig = require('../../config/postgres-config');
  pool = postgresConfig;
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
  dbConfig = {
    type: 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'agendamento'
  };
} else {
  console.log('🗃️ Usando SQLite para desenvolvimento');
  
  // Importar configuração SQLite
  const sqliteConfig = require('./database-sqlite');
  pool = sqliteConfig.pool;
  dbConfig = sqliteConfig.dbConfig;
}

// Função para testar conexão
async function testConnection() {
  try {
    if (usePostgreSQL) {
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
    } else {
      const result = await pool.query('SELECT datetime("now") as current_time, sqlite_version() as db_version');
      return {
        success: true,
        type: 'sqlite',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].db_version,
        pool: {
          totalCount: 1,
          idleCount: 0,
          waitingCount: 0
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      type: usePostgreSQL ? 'postgresql' : 'sqlite',
      error: error.message
    };
  }
}

// Função para executar queries com compatibilidade
async function executeQuery(query, params = []) {
  if (usePostgreSQL) {
    return await pool.query(query, params);
  } else {
    // Converter placeholders PostgreSQL para SQLite
    const sqliteQuery = query.replace(/\$(\d+)/g, '?');
    return await pool.query(sqliteQuery, params);
  }
}

// Função para executar transações
async function executeTransaction(callback) {
  if (usePostgreSQL) {
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
  } else {
    // SQLite não tem transações explícitas como PostgreSQL
    try {
      await pool.query('BEGIN TRANSACTION');
      const result = await callback(pool);
      await pool.query('COMMIT');
      return { success: true, result };
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

// Anexar helpers ao próprio pool para compatibilidade total
// (vários módulos fazem require('../config/database') esperando o pool diretamente
//  e outros esperam um objeto com .pool/.isSQLite)
pool.testConnection = testConnection;
pool.executeQuery = executeQuery;
pool.executeTransaction = executeTransaction;
pool.isPostgreSQL = usePostgreSQL;
pool.isSQLite = !usePostgreSQL;
pool.dbConfig = dbConfig;
// Auto-referência para suportar padrões como `const { pool } = require('../config/database')`
pool.pool = pool;

module.exports = pool;
