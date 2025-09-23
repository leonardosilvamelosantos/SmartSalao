const pool = require('./src/config/database');

async function checkTenants() {
  try {
    console.log('🔍 Verificando dados na tabela tenants...');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      );
    `);
    
    console.log('Tabela tenants existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Contar registros
      const count = await pool.query('SELECT COUNT(*) as total FROM tenants');
      console.log('Total de tenants:', count.rows[0].total);
      
      // Listar alguns registros
      const tenants = await pool.query('SELECT * FROM tenants LIMIT 5');
      console.log('Primeiros 5 tenants:', tenants.rows);
      
      // Verificar estrutura da tabela
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        ORDER BY ordinal_position
      `);
      console.log('Estrutura da tabela tenants:', structure.rows);
    }
    
    // Verificar usuários e seus tenants
    console.log('\n🔍 Verificando usuários e seus tenants...');
    const users = await pool.query(`
      SELECT 
        u.id_usuario, 
        u.nome, 
        u.email, 
        u.id_tenant,
        t.nome as tenant_nome
      FROM usuarios u 
      LEFT JOIN tenants t ON u.id_tenant = t.id_tenant 
      ORDER BY u.id_usuario 
      LIMIT 10
    `);
    console.log('Usuários com tenants:', users.rows);
    
    // Testar a consulta que está falhando
    console.log('\n🔍 Testando consulta da API...');
    const testQuery = `
      SELECT 
        t.id_tenant,
        t.nome as tenant_nome,
        t.email as tenant_email,
        t.telefone as tenant_telefone,
        t.plano,
        t.status as tenant_status,
        t.data_criacao as tenant_created_at,
        COUNT(u.id_usuario) as total_usuarios,
        COUNT(CASE WHEN u.ativo = true THEN 1 END) as usuarios_ativos,
        COUNT(CASE WHEN u.tipo = 'admin' THEN 1 END) as admins_count,
        COUNT(CASE WHEN u.tipo = 'barbeiro' THEN 1 END) as barbeiros_count
      FROM tenants t
      LEFT JOIN usuarios u ON t.id_tenant = u.id_tenant
      WHERE 1=1
      GROUP BY t.id_tenant, t.nome, t.email, t.telefone, t.plano, t.status, t.data_criacao
      ORDER BY t.data_criacao DESC
      LIMIT 20 OFFSET 0
    `;
    
    const result = await pool.query(testQuery);
    console.log('Resultado da consulta da API:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkTenants();
