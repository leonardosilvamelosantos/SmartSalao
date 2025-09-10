#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const runSql = (sql, params=[]) => new Promise((resolve, reject) => db.run(sql, params, function(err){ err ? reject(err) : resolve(this); }));
  const all = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

  try {
    console.log('🚀 Criando tabela audit_logs e índices...');

    await runSql(`CREATE TABLE IF NOT EXISTS audit_logs (
      id_log INTEGER PRIMARY KEY AUTOINCREMENT,
      id_tenant INTEGER,
      id_usuario_admin INTEGER,
      acao TEXT NOT NULL,
      entidade TEXT,
      id_entidade INTEGER,
      dados TEXT,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Garantir colunas (se tabela já existia sem algumas)
    const cols = await all(`PRAGMA table_info(audit_logs)`);
    const colNames = new Set(cols.map(c => c.name));
    if (!colNames.has('id_usuario_admin')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN id_usuario_admin INTEGER`);
    }
    if (!colNames.has('entidade')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN entidade TEXT`);
    }
    if (!colNames.has('id_entidade')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN id_entidade INTEGER`);
    }
    if (!colNames.has('dados')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN dados TEXT`);
    }
    if (!colNames.has('status')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN status TEXT DEFAULT 'success'`);
    }
    if (!colNames.has('created_at')) {
      await runSql(`ALTER TABLE audit_logs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }

    await runSql(`CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(id_tenant)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_audit_usuario_admin ON audit_logs(id_usuario_admin)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs(acao)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)`);

    console.log('✅ audit_logs pronto.');
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


