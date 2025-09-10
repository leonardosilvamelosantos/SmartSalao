const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/agendamento_dev.db');

console.log('Criando tabelas...');

// Criar tabelas uma por uma
const tables = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    whatsapp TEXT,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER,
    nome TEXT,
    whatsapp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS servicos (
    id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER,
    nome_servico TEXT NOT NULL,
    duracao_min INTEGER NOT NULL,
    valor REAL NOT NULL,
    descricao TEXT,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

let completed = 0;
tables.forEach((sql, index) => {
  db.run(sql, (err) => {
    if (err) {
      console.error(`Erro na tabela ${index + 1}:`, err);
    } else {
      console.log(`✅ Tabela ${index + 1} criada`);
    }
    completed++;
    if (completed === tables.length) {
      console.log('🎉 Todas as tabelas criadas!');
      db.close();
    }
  });
});
