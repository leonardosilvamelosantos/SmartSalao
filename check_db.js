const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/agendamento_dev.db');

console.log('🔍 Verificando banco de dados SQLite...\n');

// Listar tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error('❌ Erro:', err);
  } else {
    console.log('📋 Tabelas encontradas:');
    rows.forEach(row => console.log(`  - ${row.name}`));
    console.log(`\nTotal: ${rows.length} tabelas\n`);
  }

  // Verificar usuários no schema multi-tenant
  db.all("SELECT COUNT(*) as total FROM tenant_teste_usuarios", [], (err, result) => {
    if (err) {
      console.log('❌ Tabela tenant_teste_usuarios não existe ou está vazia');
    } else {
      console.log(`👥 Total de usuários: ${result[0].total}`);
    }

    // Verificar serviços no schema multi-tenant
    db.all("SELECT COUNT(*) as total FROM tenant_teste_servicos", [], (err, result) => {
      if (err) {
        console.log('❌ Tabela tenant_teste_servicos não existe ou está vazia');
      } else {
        console.log(`✂️  Total de serviços: ${result[0].total}`);
      }

      db.close();
    });
  });
});

// Verificar dados de usuários e serviços
console.log('\n🔍 Verificando dados detalhados...\n');

// Verificar usuário de teste
db.all("SELECT id_usuario, nome, email FROM tenant_teste_usuarios LIMIT 5", [], (err, rows) => {
  if (err) {
    console.log('❌ Erro ao buscar usuários:', err);
  } else {
    console.log('👤 Usuários encontrados:');
    rows.forEach(row => console.log(`  - ID: ${row.id_usuario}, Nome: ${row.nome}, Email: ${row.email}`));
  }

  // Verificar serviços
  db.all("SELECT id_servico, nome_servico, valor, duracao_min FROM tenant_teste_servicos LIMIT 5", [], (err, rows) => {
    if (err) {
      console.log('❌ Erro ao buscar serviços:', err);
    } else {
      console.log('\n✂️ Serviços encontrados:');
      rows.forEach(row => console.log(`  - ID: ${row.id_servico}, Nome: ${row.nome_servico}, Valor: R$ ${row.valor}, Duração: ${row.duracao_min}min`));
    }

    db.close();
  });
});
