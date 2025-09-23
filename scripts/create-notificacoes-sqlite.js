#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createNotificacoesTableSQLite() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const runSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

  try {
    console.log('🔧 Conectando ao SQLite...');
    
    // Verificar se a tabela já existe
    const checkTable = await all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notificacoes'
    `);
    
    if (checkTable.length > 0) {
      console.log('✅ Tabela notificacoes já existe');
      return;
    }

    console.log('🔧 Criando tabela notificacoes...');
    
    // Criar tabela notificacoes
    await runSql(`
      CREATE TABLE notificacoes (
        id_notificacao INTEGER PRIMARY KEY AUTOINCREMENT,
        id_agendamento INTEGER,
        tipo TEXT NOT NULL,
        enviada INTEGER DEFAULT 0,
        message_id TEXT,
        enviada_em DATETIME,
        erro TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices
    await runSql(`
      CREATE INDEX idx_notificacoes_agendamento ON notificacoes(id_agendamento)
    `);
    
    await runSql(`
      CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo)
    `);
    
    await runSql(`
      CREATE INDEX idx_notificacoes_enviada ON notificacoes(enviada)
    `);

    console.log('✅ Tabela notificacoes criada com sucesso!');
    console.log('✅ Índices criados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela notificacoes:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

createNotificacoesTableSQLite();


