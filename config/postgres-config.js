// Carregar variáveis de ambiente primeiro
require('dotenv').config();

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

// Validar variáveis de ambiente obrigatórias
const requiredDbVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredDbVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente do banco de dados não encontradas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Defina essas variáveis no arquivo .env');
  process.exit(1);
}

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

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


