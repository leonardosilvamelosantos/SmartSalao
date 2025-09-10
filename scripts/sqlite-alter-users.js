#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (err) => err ? reject(err) : resolve()));
  const getTableInfo = () => new Promise((resolve, reject) => db.all('PRAGMA table_info(usuarios)', [], (err, rows) => err ? reject(err) : resolve(rows)));

  try {
    console.log('🔧 Verificando colunas da tabela usuarios...');
    const info = await getTableInfo();
    const cols = new Set(info.map(c => c.name));

    const statements = [];
    if (!cols.has('email')) statements.push(`ALTER TABLE usuarios ADD COLUMN email TEXT;`);
    if (!cols.has('senha_hash')) statements.push(`ALTER TABLE usuarios ADD COLUMN senha_hash TEXT;`);
    if (!cols.has('tipo')) statements.push(`ALTER TABLE usuarios ADD COLUMN tipo TEXT DEFAULT 'barbeiro';`);
    if (!cols.has('ativo')) statements.push(`ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1;`);

    for (const sql of statements) {
      console.log('➡️ ', sql);
      try { await exec(sql); } catch (e) { console.warn('Aviso ao executar:', e.message); }
    }

    try {
      await exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`);
    } catch (e) { console.warn('Aviso ao criar índice:', e.message); }

    const finalInfo = await getTableInfo();
    console.log('✅ Estrutura final de usuarios:', finalInfo);
  } catch (err) {
    console.error('❌ Erro no ajuste de schema SQLite:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


