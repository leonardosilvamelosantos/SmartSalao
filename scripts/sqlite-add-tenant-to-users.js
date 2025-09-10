#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const all = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  const runSql = (sql, params=[]) => new Promise((resolve, reject) => db.run(sql, params, function(err){ err ? reject(err) : resolve(this); }));

  try {
    console.log('🔧 Verificando coluna id_tenant em usuarios...');
    const cols = await all(`PRAGMA table_info(usuarios)`);
    const hasTenant = cols.some(c => c.name === 'id_tenant');
    if (!hasTenant) {
      await runSql(`ALTER TABLE usuarios ADD COLUMN id_tenant INTEGER`);
      console.log('✅ Coluna id_tenant adicionada em usuarios');
    } else {
      console.log('ℹ️  Coluna id_tenant já existe');
    }

    console.log('🔧 Garantindo tenant padrão (id=1)...');
    await runSql(`CREATE TABLE IF NOT EXISTS tenants (
      id_tenant INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_tenant TEXT NOT NULL,
      dominio TEXT UNIQUE,
      status TEXT DEFAULT 'ativo',
      config_tenant TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const t = await all(`SELECT id_tenant FROM tenants WHERE id_tenant = 1`);
    if (t.length === 0) {
      await runSql(`INSERT INTO tenants (id_tenant, nome_tenant, dominio, status) VALUES (1, 'Tenant Padrão', 'localhost', 'ativo')`);
      console.log('✅ Tenant padrão criado com id=1');
    } else {
      console.log('ℹ️  Tenant padrão já existe');
    }

    console.log('🔧 Associando usuários sem id_tenant ao tenant 1...');
    await runSql(`UPDATE usuarios SET id_tenant = 1 WHERE id_tenant IS NULL`);
    console.log('✅ Usuários associados ao tenant 1 quando necessário');

    // Índices úteis
    await runSql(`CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(id_tenant)`);

    console.log('🎉 Concluído.');
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


