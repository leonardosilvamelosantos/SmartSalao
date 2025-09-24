const { Pool } = require('pg');

// ====================
// CONFIGURAÇÃO OTIMIZADA DO BANCO DE DADOS (POSTGRESQL)
// ====================

// Configurações do banco de dados com valores otimizados
const useSSL = (() => {
  const env = (process.env.DB_SSL || '').toLowerCase();
  if (env === 'true') return true;
  if (env === 'false') return false;
  // Desabilitar SSL por padrão para desenvolvimento local
  return false;
})();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'agendamento',
  user: process.env.DB_USER || 'agendamento_user',
  password: process.env.DB_PASSWORD || 'agendamento_pass_2024',

  // Pool de conexões
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),

  // KeepAlive e SSL
  allowExitOnIdle: process.env.NODE_ENV === 'production',
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  ssl: useSSL ? { rejectUnauthorized: false } : false
};

// Criar pool de conexões
const pool = new Pool(dbConfig);

// Event listeners opcionais
pool.on('connect', () => {
  // console.log('Novo cliente conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente do banco:', err);
});

module.exports = pool;


