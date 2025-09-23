/* Smoke test PostgreSQL: cria tabelas mínimas, insere e lista registros */
(async () => {
  // Forçar uso de PostgreSQL independentemente das variáveis de ambiente do shell
  process.env.DB_TYPE = process.env.DB_TYPE || 'postgresql';
  process.env.USE_POSTGRESQL = process.env.USE_POSTGRESQL || 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  // Defaults conforme solicitado
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'agendamento';
  process.env.DB_USER = process.env.DB_USER || 'agendamento_user';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'agendamento_pass_2024';
  process.env.DB_SSL = process.env.DB_SSL || 'false';
  const pool = require('../src/config/database');
  try {
    console.log('Testing connection...');
    const info = await pool.testConnection();
    console.log('DB:', info.type, 'Version:', info.version);

    // Garantir tabelas: usar CREATE IF NOT EXISTS com colunas mínimas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT,
        senha_hash TEXT,
        whatsapp TEXT,
        tipo TEXT DEFAULT 'barbeiro',
        ativo BOOLEAN DEFAULT true,
        id_tenant INTEGER,
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id_cliente SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
        id_tenant INTEGER,
        nome TEXT,
        whatsapp TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const suffix = Date.now().toString().slice(-6);
    // Obter colunas da tabela usuarios
    const cols = await pool.query(
      `SELECT column_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'usuarios'`
    );
    const colSet = new Set(cols.rows.map(r => r.column_name));

    const insertColumns = ['nome'];
    const insertValues = [`Teste Usuario ${suffix}`];

    if (colSet.has('email')) {
      insertColumns.push('email');
      insertValues.push(`user${suffix}@teste.com`);
    }
    if (colSet.has('senha_hash')) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('teste123', 8);
      insertColumns.push('senha_hash');
      insertValues.push(hash);
    }
    if (colSet.has('whatsapp')) {
      insertColumns.push('whatsapp');
      insertValues.push(`+5500${suffix}`);
    }
    if (colSet.has('tipo')) {
      insertColumns.push('tipo');
      insertValues.push('barbeiro');
    }
    if (colSet.has('ativo')) {
      insertColumns.push('ativo');
      insertValues.push(true);
    }
    if (colSet.has('id_tenant')) {
      insertColumns.push('id_tenant');
      insertValues.push(1);
    }
    if (colSet.has('timezone')) {
      insertColumns.push('timezone');
      insertValues.push('America/Sao_Paulo');
    }

    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(',');
    const userRes = await pool.query(
      `INSERT INTO usuarios (${insertColumns.join(',')}) VALUES (${placeholders}) RETURNING *`,
      insertValues
    );
    const user = userRes.rows[0];
    console.log('Created user id:', user.id_usuario);

    // Inserir cliente com colunas dinâmicas
    const colsCli = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'clientes'`
    );
    const colCliSet = new Set(colsCli.rows.map(r => r.column_name));
    const cliCols = ['id_usuario'];
    const cliVals = [user.id_usuario];
    if (colCliSet.has('id_tenant')) { cliCols.push('id_tenant'); cliVals.push(1); }
    if (colCliSet.has('nome')) { cliCols.push('nome'); cliVals.push(`Cliente ${suffix}`); }
    if (colCliSet.has('whatsapp')) { cliCols.push('whatsapp'); cliVals.push(`+5599${suffix}`); }
    if (colCliSet.has('email')) { cliCols.push('email'); cliVals.push(`cliente${suffix}@teste.com`); }
    const phCli = cliVals.map((_, i) => `$${i + 1}`).join(',');
    const clienteRes = await pool.query(
      `INSERT INTO clientes (${cliCols.join(',')}) VALUES (${phCli}) RETURNING *`,
      cliVals
    );
    const cliente = clienteRes.rows[0];
    console.log('Created cliente id:', cliente.id_cliente);

    const listUsers = await pool.query('SELECT id_usuario, nome, whatsapp FROM usuarios ORDER BY id_usuario DESC LIMIT 3');
    console.log('Last users:', listUsers.rows);
    const listClientes = await pool.query('SELECT id_cliente, id_usuario, nome, whatsapp FROM clientes ORDER BY id_cliente DESC LIMIT 3');
    console.log('Last clientes:', listClientes.rows);

    if (typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err);
    try {
      if (typeof pool.end === 'function') {
        await pool.end();
      }
    } catch {}
    process.exit(1);
  }
})();


