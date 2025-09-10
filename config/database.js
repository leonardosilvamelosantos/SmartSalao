const { Pool } = require('pg');

// ====================
// CONFIGURAÇÃO OTIMIZADA DO BANCO DE DADOS
// ====================

// Configurações do banco de dados com valores otimizados
const dbConfig = {
  // Conexão básica
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'agendamento',
  user: process.env.DB_USER || 'agendamento_user',
  password: process.env.DB_PASSWORD || 'agendamento_pass_2024',

  // Pool de conexões otimizado
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // Máximo de conexões
  min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,  // Mínimo de conexões
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000, // 10s
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000, // 30s

  // Configurações de performance
  allowExitOnIdle: process.env.NODE_ENV === 'production',
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,

  // SSL para produção
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Criar pool de conexões
const pool = new Pool(dbConfig);

// Event listeners para debug
pool.on('connect', (client) => {
  console.log('Novo cliente conectado ao banco de dados');
});

pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do banco:', err);
  process.exit(-1);
});

module.exports = pool;
