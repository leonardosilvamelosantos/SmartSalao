const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Verificando arquivo:', path.resolve('./data/agendamento_dev.db'));

const db = new sqlite3.Database('./data/agendamento_dev.db', (err) => {
  if (err) {
    console.error('Erro ao conectar:', err);
    return;
  }
  console.log('Conectado ao banco SQLite');
});

db.all('PRAGMA table_info(clientes)', [], (err, rows) => {
  if (err) {
    console.error('Erro na query:', err);
  } else {
    console.log('Estrutura da tabela clientes:');
    rows.forEach(row => console.log(`  ${row.name}: ${row.type}`));
  }
  db.close();
});
