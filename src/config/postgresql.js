/**
 * Configuração PostgreSQL Centralizada
 * Usa variáveis de ambiente padrão do PostgreSQL
 */
const { Pool } = require('pg');

// Configuração PostgreSQL com variáveis de ambiente
const config = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5433', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME || 'agendamento',
  user: process.env.PGUSER || process.env.DB_USER || 'agendamento_user',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'agendamento_pass_2024',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  allowExitOnIdle: process.env.NODE_ENV === 'production',
  keepAlive: true,
  keepAliveInitialDelayMillis: 0
};

// Criar pool de conexões
const pool = new Pool(config);

// Event listeners para monitoramento
pool.on('connect', () => {
  console.log('🐘 Nova conexão PostgreSQL estabelecida');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool PostgreSQL:', err);
});

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

// Anexar helpers ao pool
pool.testConnection = testConnection;
pool.executeTransaction = executeTransaction;
pool.isPostgreSQL = true;
pool.isSQLite = false;
pool.dbConfig = config;

module.exports = pool;
