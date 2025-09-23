const pool = require('./src/config/database');

console.log('Recriando tabela clientes (PostgreSQL)...');

(async () => {
  try {
    await pool.query('DROP TABLE IF EXISTS clientes');
    await pool.query(`
      CREATE TABLE clientes (
        id_cliente SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
        nome TEXT,
        email TEXT,
        whatsapp TEXT NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela clientes recriada com sucesso!');
  } catch (err) {
    console.error('Erro ao recriar tabela:', err);
    process.exit(1);
  } finally {
    if (typeof pool.end === 'function') {
      await pool.end();
    }
  }
})();
