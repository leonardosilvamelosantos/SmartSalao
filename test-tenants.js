const pool = require('./src/config/database');

async function testTenants() {
  try {
    console.log('🔍 Verificando tabela tenants...');
    
    // Verificar se a tabela existe (SQLite)
    const tableCheck = await pool.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='tenants'
    `);
    
    console.log('Tabela tenants existe:', tableCheck.rows.length > 0);
    
    if (tableCheck.rows.length > 0) {
      // Contar registros
      const count = await pool.query('SELECT COUNT(*) as total FROM tenants');
      console.log('Total de tenants:', count.rows[0].total);
      
      // Listar alguns registros
      const tenants = await pool.query('SELECT * FROM tenants LIMIT 5');
      console.log('Primeiros 5 tenants:', tenants.rows);
    } else {
      console.log('❌ Tabela tenants não existe!');
    }
    
    // Verificar usuários e seus tenants
    console.log('\n🔍 Verificando usuários e seus tenants...');
    const users = await pool.query(`
      SELECT id_usuario, id_tenant, nome, email, tipo 
      FROM usuarios 
      ORDER BY id_tenant, id_usuario
    `);
    
    console.log('Usuários encontrados:', users.rows.length);
    users.rows.forEach(user => {
      console.log(`- ID: ${user.id_usuario}, Tenant: ${user.id_tenant}, Nome: ${user.nome}, Email: ${user.email}, Tipo: ${user.tipo}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

testTenants();
