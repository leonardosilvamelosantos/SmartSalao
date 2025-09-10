const pool = require('../src/config/database');

(async () => {
  try {
    console.log('🔧 Criando/verificando tabela dashboard_cache...');
    await pool.query(`CREATE TABLE IF NOT EXISTS dashboard_cache (
      id_cache INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER,
      tipo TEXT NOT NULL,
      dados TEXT,
      data_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )`);

    // Índice único (id_usuario, tipo) para upsert lógico
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_cache_user_tipo ON dashboard_cache(id_usuario, tipo)`);
    } catch (e) {
      console.warn('Aviso ao criar índice único:', e.message);
    }

    const cols = await pool.query('PRAGMA table_info(dashboard_cache)');
    console.log('🧩 Colunas:', cols.rows.map(r => `${r.name}:${r.type}`).join(', '));

    const idx = await pool.query(`PRAGMA index_list('dashboard_cache')`);
    console.log('🧷 Índices:', idx.rows);

    console.log('✅ dashboard_cache pronta.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();


