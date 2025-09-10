console.log('🔍 Debug do pool carregado...');

// Limpar cache do módulo
delete require.cache[require.resolve('./src/config/database')];
delete require.cache[require.resolve('./src/config/database-sqlite')];

const pool = require('./src/config/database');

console.log('Pool type:', typeof pool);
console.log('Pool constructor name:', pool?.constructor?.name);
console.log('Pool has query method:', typeof pool?.query);
console.log('Pool has all method:', typeof pool?.all);
console.log('Pool has run method:', typeof pool?.run);

// Verificar se é um pool do pg
if (pool?.options?.host) {
  console.log('❌ Este é um pool do PostgreSQL!');
  console.log('Host:', pool.options.host);
  console.log('Port:', pool.options.port);
} else if (pool?.db) {
  console.log('✅ Este é um pool do SQLite!');
  console.log('Database path:', pool.db?.filename);
}

// Testar uma query simples
async function testQuery() {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Query funcionou:', result);
  } catch (error) {
    console.error('❌ Query falhou:', error.message);
  }
}

testQuery();
