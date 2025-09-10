const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/agendamento_dev.db');

console.log('Recriando tabela clientes com todas as colunas...');

// Primeiro dropar a tabela existente
db.run('DROP TABLE IF EXISTS clientes', (err) => {
  if (err) {
    console.error('Erro ao dropar tabela:', err);
    return;
  }

  // Criar nova tabela com todas as colunas
  const createTableSQL = `CREATE TABLE clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER,
    nome TEXT,
    email TEXT,
    whatsapp TEXT NOT NULL,
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Erro ao criar tabela:', err);
    } else {
      console.log('✅ Tabela clientes recriada com sucesso!');
    }
    db.close();
  });
});
