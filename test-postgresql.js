const { Pool } = require('pg');

// Configuração PostgreSQL
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'agendamento',
  user: 'agendamento_user',
  password: 'agendamento_pass_2024',
  ssl: false,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 30000
});

async function testPostgreSQL() {
  try {
    console.log('🔍 Testando conexão com PostgreSQL...');
    
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL!');
    
    // Verificar se a tabela tenants existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      );
    `);
    
    console.log('Tabela tenants existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Contar registros
      const count = await client.query('SELECT COUNT(*) as total FROM tenants');
      console.log('Total de tenants:', count.rows[0].total);
      
      // Listar alguns registros
      const tenants = await client.query('SELECT * FROM tenants LIMIT 5');
      console.log('Primeiros 5 tenants:', tenants.rows);
      
      // Verificar estrutura da tabela
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        ORDER BY ordinal_position
      `);
      console.log('Estrutura da tabela tenants:', structure.rows);
    }
    
    // Verificar usuários e seus tenants
    console.log('\n🔍 Verificando usuários e seus tenants...');
    const users = await client.query(`
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
    
    const result = await client.query(testQuery);
    console.log('Resultado da consulta da API:', result.rows);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testPostgreSQL();
