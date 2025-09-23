#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createSecurityTables() {
  const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(dbPath);

  const runSql = (sql, params = []) => new Promise((resolve, reject) => 
    db.run(sql, params, function(err) { 
      err ? reject(err) : resolve(this); 
    })
  );

  try {
    console.log('🚀 Criando tabelas de segurança...');

    // Tabela de eventos de segurança
    await runSql(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        tenant_id INTEGER,
        user_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de alertas de segurança
    await runSql(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        count INTEGER NOT NULL,
        ip_address TEXT,
        tenant_id INTEGER,
        details TEXT,
        status TEXT DEFAULT 'active',
        resolved_by TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para performance
    await runSql(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status)`);
    await runSql(`CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity)`);

    console.log('✅ Tabelas de segurança criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas de segurança:', error);
  } finally {
    db.close();
  }
}

createSecurityTables();
