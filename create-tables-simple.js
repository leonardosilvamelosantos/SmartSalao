const pool = require('./src/config/database');

console.log('Criando tabelas no PostgreSQL...');

(async () => {
  try {
    // usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        whatsapp TEXT,
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id_cliente SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
        nome TEXT,
        whatsapp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // servicos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id_servico SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
        nome_servico TEXT NOT NULL,
        duracao_min INTEGER NOT NULL,
        valor NUMERIC(10,2) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('🎉 Todas as tabelas criadas com sucesso no PostgreSQL!');
    if (typeof pool.end === 'function') {
      await pool.end();
    }
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
    if (typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(1);
  }
})();
