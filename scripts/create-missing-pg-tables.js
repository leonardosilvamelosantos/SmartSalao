// Cria tabelas faltantes mínimas no PostgreSQL: configuracoes, audit_logs
(async () => {
  process.env.DB_TYPE = process.env.DB_TYPE || 'postgresql';
  process.env.USE_POSTGRESQL = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'agendamento';
  process.env.DB_USER = process.env.DB_USER || 'agendamento_user';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'agendamento_pass_2024';
  process.env.DB_SSL = process.env.DB_SSL || 'false';

  const pool = require('../src/config/database');

  try {
    // configuracoes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id_configuracao SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        dias_funcionamento TEXT, -- JSON string
        horario_abertura TEXT,
        horario_fechamento TEXT,
        intervalo_agendamento INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // audit_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id_log SERIAL PRIMARY KEY,
        id_tenant INTEGER,
        id_usuario_admin INTEGER,
        acao TEXT NOT NULL,
        entidade TEXT,
        id_entidade INTEGER,
        dados JSONB,
        status TEXT DEFAULT 'success',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Tabelas mínimas criadas/verificadas.');
    if (typeof pool.end === 'function') await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Erro ao criar tabelas mínimas:', e);
    try { if (typeof pool.end === 'function') await pool.end(); } catch {}
    process.exit(1);
  }
})();


