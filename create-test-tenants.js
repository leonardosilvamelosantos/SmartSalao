const { Pool } = require('pg');

// Configuração PostgreSQL
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'agendamento',
  user: 'agendamento_user',
  password: 'agendamento_pass_2024',
  ssl: false
});

async function createTestTenants() {
  try {
    console.log('🔍 Criando dados de teste na tabela tenants...');
    
    // Inserir alguns tenants de teste
    const tenants = [
      {
        nome: 'Barbearia do João',
        email: 'joao@barbearia.com',
        telefone: '+5511999999999',
        documento: '12345678000199',
        schema_name: 'barbearia_joao',
        plano: 'premium',
        status: 'ativo',
        limites: JSON.stringify({
          agendamentos_mes: 2000,
          servicos: 50,
          usuarios: 20
        }),
        configuracoes: JSON.stringify({
          timezone: 'America/Sao_Paulo',
          horario_funcionamento: '08:00-18:00',
          dias_funcionamento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
        })
      },
      {
        nome: 'Salão da Maria',
        email: 'maria@salao.com',
        telefone: '+5511888888888',
        documento: '98765432000188',
        schema_name: 'salao_maria',
        plano: 'basico',
        status: 'ativo',
        limites: JSON.stringify({
          agendamentos_mes: 1000,
          servicos: 20,
          usuarios: 10
        }),
        configuracoes: JSON.stringify({
          timezone: 'America/Sao_Paulo',
          horario_funcionamento: '09:00-17:00',
          dias_funcionamento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
        })
      },
      {
        nome: 'Barbearia Elite',
        email: 'elite@barbearia.com',
        telefone: '+5511777777777',
        documento: '11223344000177',
        schema_name: 'barbearia_elite',
        plano: 'premium',
        status: 'ativo',
        limites: JSON.stringify({
          agendamentos_mes: 3000,
          servicos: 100,
          usuarios: 50
        }),
        configuracoes: JSON.stringify({
          timezone: 'America/Sao_Paulo',
          horario_funcionamento: '07:00-20:00',
          dias_funcionamento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
        })
      }
    ];
    
    for (const tenant of tenants) {
      const result = await pool.query(`
        INSERT INTO tenants (
          nome, email, telefone, documento, schema_name, plano, status, 
          limites, configuracoes, data_criacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id_tenant
      `, [
        tenant.nome,
        tenant.email,
        tenant.telefone,
        tenant.documento,
        tenant.schema_name,
        tenant.plano,
        tenant.status,
        tenant.limites,
        tenant.configuracoes
      ]);
      
      console.log(`✅ Tenant criado: ${tenant.nome} (ID: ${result.rows[0].id_tenant})`);
    }
    
    // Atualizar alguns usuários para associar com os tenants
    console.log('\n🔍 Associando usuários com tenants...');
    
    // Associar usuário 8 (Maria Luiza) com tenant 1 (Barbearia do João)
    await pool.query('UPDATE usuarios SET id_tenant = 1 WHERE id_usuario = 8');
    console.log('✅ Usuário 8 associado ao tenant 1');
    
    // Associar usuário 6 (Barbeiro Teste) com tenant 2 (Salão da Maria)
    await pool.query('UPDATE usuarios SET id_tenant = 2 WHERE id_usuario = 6');
    console.log('✅ Usuário 6 associado ao tenant 2');
    
    // Associar usuário 7 (teste1) com tenant 3 (Barbearia Elite)
    await pool.query('UPDATE usuarios SET id_tenant = 3 WHERE id_usuario = 7');
    console.log('✅ Usuário 7 associado ao tenant 3');
    
    // Verificar resultado
    console.log('\n🔍 Verificando resultado...');
    const result = await pool.query(`
      SELECT 
        t.id_tenant,
        t.nome as tenant_nome,
        t.email as tenant_email,
        t.plano,
        t.status,
        COUNT(u.id_usuario) as total_usuarios
      FROM tenants t
      LEFT JOIN usuarios u ON t.id_tenant = u.id_tenant
      GROUP BY t.id_tenant, t.nome, t.email, t.plano, t.status
      ORDER BY t.id_tenant
    `);
    
    console.log('Tenants criados:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createTestTenants();
