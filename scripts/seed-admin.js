#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

async function run() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const all = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  const runSql = (sql, params=[]) => new Promise((resolve, reject) => db.run(sql, params, function(err){ err ? reject(err) : resolve(this); }));

  try {
    const email = process.argv[2] || 'admin@teste.com';
    const senha = process.argv[3] || 'admin123';
    const nome  = process.argv[4] || 'Admin Sistema';

    const exists = await all('SELECT id_usuario, email FROM usuarios WHERE email = ?', [email]);
    if (exists.length > 0) {
      console.log('ℹ️  Admin já existe:', exists[0].email);
      db.close();
      return;
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const senha_hash = await bcrypt.hash(senha, rounds);

    await runSql(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo, timezone)
       VALUES (?, ?, ?, 'admin', 1, 'America/Sao_Paulo')`,
      [nome, email, senha_hash]
    );

    const rows = await all('SELECT id_usuario, nome, email, tipo, ativo, created_at FROM usuarios WHERE email = ?', [email]);
    console.log('✅ Admin criado:', rows[0]);
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


