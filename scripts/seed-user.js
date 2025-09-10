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
    const nome  = process.argv[2] || 'Usuário Teste';
    const email = process.argv[3] || 'teste@admin.com';
    const senha = process.argv[4] || 'teste123';
    const tipo  = process.argv[5] || 'barbeiro';

    const exists = await all('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (exists.length > 0) {
      console.log('ℹ️  Usuário já existe:', email);
      db.close();
      return;
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const senha_hash = await bcrypt.hash(senha, rounds);

    await runSql(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo, timezone)
       VALUES (?, ?, ?, ?, 1, 'America/Sao_Paulo')`,
      [nome, email, senha_hash, tipo]
    );

    const rows = await all('SELECT id_usuario, nome, email, tipo, ativo, created_at FROM usuarios WHERE email = ?', [email]);
    console.log('✅ Usuário criado:', rows[0]);
  } catch (err) {
    console.error('❌ Erro ao criar usuário:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


