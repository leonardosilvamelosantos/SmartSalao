// Insere config padrão (seg-sex 09:00-19:00) para usuários sem configuração
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
    // Garantir tabela
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id_configuracao SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        dias_funcionamento TEXT,
        horario_abertura TEXT,
        horario_fechamento TEXT,
        intervalo_agendamento INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Selecionar usuários sem configuração
    const res = await pool.query(`
      SELECT u.id_usuario
      FROM usuarios u
      LEFT JOIN configuracoes c ON c.id_usuario = u.id_usuario
      WHERE c.id_usuario IS NULL
    `);

    const dias = JSON.stringify(["segunda","terca","quarta","quinta","sexta"]);

    for (const row of res.rows) {
      await pool.query(
        `INSERT INTO configuracoes (id_usuario, dias_funcionamento, horario_abertura, horario_fechamento, intervalo_agendamento)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id_usuario, dias, '09:00', '19:00', 30]
      );
    }

    console.log(`Config padrão aplicada para ${res.rows.length} usuário(s).`);
    if (typeof pool.end === 'function') await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Erro ao inserir config padrão:', e);
    try { if (typeof pool.end === 'function') await pool.end(); } catch {}
    process.exit(1);
  }
})();


