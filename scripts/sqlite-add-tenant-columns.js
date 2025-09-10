#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);
  const all = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  const runSql = (sql, params=[]) => new Promise((resolve, reject) => db.run(sql, params, function(err){ err ? reject(err) : resolve(this); }));

  try {
    console.log('🔧 Verificando colunas id_tenant em tabelas...');
    const tables = ['clientes', 'servicos', 'agendamentos', 'slots'];
    for (const table of tables) {
      try {
        const cols = await all(`PRAGMA table_info(${table})`);
        const has = cols.some(c => c.name === 'id_tenant');
        if (!has) {
          await runSql(`ALTER TABLE ${table} ADD COLUMN id_tenant INTEGER`);
          console.log(`✅ Coluna id_tenant adicionada em ${table}`);
          await runSql(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant ON ${table}(id_tenant)`);
        } else {
          console.log(`ℹ️  ${table} já possui id_tenant`);
        }
      } catch (e) {
        console.warn(`⚠️  Falha ao ajustar tabela ${table}:`, e.message);
      }
    }

    console.log('🔧 Associando registros sem tenant ao tenant 1 (quando aplicável)...');
    await runSql(`UPDATE clientes SET id_tenant = 1 WHERE id_tenant IS NULL`);
    await runSql(`UPDATE servicos SET id_tenant = 1 WHERE id_tenant IS NULL`);
    await runSql(`UPDATE agendamentos SET id_tenant = 1 WHERE id_tenant IS NULL`);
    await runSql(`UPDATE slots SET id_tenant = 1 WHERE id_tenant IS NULL`);

    console.log('🎉 Concluído.');
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();


