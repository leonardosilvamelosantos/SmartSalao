const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/agendamento_dev.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error('Erro:', err);
  } else {
    console.log('Tabelas encontradas:');
    rows.forEach(row => console.log(`- ${row.name}`));
  }

  // Verificar dados nas tabelas do tenant_teste
  console.log('\nVerificando dados em tenant_teste_agendamentos:');
  db.all("SELECT COUNT(*) as total FROM tenant_teste_agendamentos", [], (err, rows) => {
    if (err) {
      console.error('Erro ao contar agendamentos:', err);
    } else {
      console.log(`Total de agendamentos: ${rows[0].total}`);
    }

    console.log('\nVerificando dados em tenant_teste_clientes:');
    db.all("SELECT COUNT(*) as total FROM tenant_teste_clientes", [], (err, rows) => {
      if (err) {
        console.error('Erro ao contar clientes:', err);
      } else {
        console.log(`Total de clientes: ${rows[0].total}`);
      }

      console.log('\nVerificando dados em tenant_teste_servicos:');
      db.all("SELECT COUNT(*) as total FROM tenant_teste_servicos", [], (err, rows) => {
        if (err) {
          console.error('Erro ao contar serviços:', err);
        } else {
          console.log(`Total de serviços: ${rows[0].total}`);
        }

        db.close();
      });
    });
  });
});
