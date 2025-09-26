/**
 * Testes de Conexão no Startup
 * Verifica conectividade com serviços essenciais antes de iniciar o servidor
 */

const pool = require('./database');

/**
 * Testa conexão com o banco de dados
 */
async function testDatabaseConnection() {
  console.log('🔍 Testando conexão com o banco de dados...');
  
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Conexão com banco de dados estabelecida');
    console.log(`   📊 Tempo de resposta: ${responseTime}ms`);
    console.log(`   🕐 Timestamp do banco: ${result.rows[0].current_time}`);
    console.log(`   🐘 Versão: ${result.rows[0].db_version.split(' ')[0]}`);
    
    return {
      success: true,
      responseTime,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version
    };
  } catch (error) {
    console.error('❌ Falha na conexão com o banco de dados:');
    console.error(`   🔴 Erro: ${error.message}`);
    console.error(`   📋 Código: ${error.code || 'N/A'}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Verifique se o PostgreSQL está rodando');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   💡 Verifique se o host do banco está correto');
    } else if (error.code === '28P01') {
      console.error('   💡 Verifique as credenciais do banco de dados');
    } else if (error.code === '3D000') {
      console.error('   💡 Verifique se o banco de dados existe');
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Testa se as tabelas essenciais existem
 */
async function testEssentialTables() {
  console.log('🔍 Verificando tabelas essenciais...');
  
  const essentialTables = [
    'usuarios',
    'clientes', 
    'servicos',
    'agendamentos'
  ];
  
  try {
    const results = await Promise.all(
      essentialTables.map(async (tableName) => {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          ) as exists
        `, [tableName]);
        return { table: tableName, exists: result.rows[0].exists };
      })
    );
    
    const missingTables = results.filter(r => !r.exists);
    
    if (missingTables.length > 0) {
      console.error('❌ Tabelas essenciais não encontradas:');
      missingTables.forEach(({ table }) => {
        console.error(`   🔴 ${table}`);
      });
      console.error('   💡 Execute as migrações do banco de dados');
      return { success: false, missingTables: missingTables.map(t => t.table) };
    }
    
    console.log('✅ Todas as tabelas essenciais estão presentes');
    results.forEach(({ table, exists }) => {
      console.log(`   ✅ ${table}`);
    });
    
    return { success: true, tables: results };
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:');
    console.error(`   🔴 ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Testa permissões básicas do usuário do banco
 */
async function testDatabasePermissions() {
  console.log('🔍 Testando permissões do usuário do banco...');
  
  try {
    // Teste de SELECT
    await pool.query('SELECT 1 as test');
    console.log('   ✅ Permissão SELECT: OK');
    
    // Teste de INSERT
    const insertResult = await pool.query(`
      INSERT INTO usuarios (nome, whatsapp, senha_hash, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING id_usuario
    `, ['test_user', '11999999999', 'test_password_hash']);
    console.log('   ✅ Permissão INSERT: OK');
    
    // Teste de UPDATE
    await pool.query(`
      UPDATE usuarios 
      SET updated_at = NOW() 
      WHERE id_usuario = $1
    `, [insertResult.rows[0].id_usuario]);
    console.log('   ✅ Permissão UPDATE: OK');
    
    // Teste de DELETE
    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [insertResult.rows[0].id_usuario]);
    console.log('   ✅ Permissão DELETE: OK');
    
    console.log('✅ Todas as permissões estão funcionando');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro nas permissões do banco:');
    console.error(`   🔴 ${error.message}`);
    
    if (error.code === '42501') {
      console.error('   💡 Usuário não tem permissões suficientes');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Executa todos os testes de startup
 */
async function runStartupTests() {
  console.log('🚀 Iniciando testes de conectividade...\n');
  
  const results = {
    database: null,
    tables: null,
    permissions: null
  };
  
  // Teste 1: Conexão com banco
  results.database = await testDatabaseConnection();
  if (!results.database.success) {
    console.error('\n💥 Falha crítica: Não foi possível conectar ao banco de dados');
    console.error('🛑 Encerrando aplicação...\n');
    process.exit(1);
  }
  
  console.log('');
  
  // Teste 2: Tabelas essenciais
  results.tables = await testEssentialTables();
  if (!results.tables.success) {
    console.error('\n💥 Falha crítica: Tabelas essenciais não encontradas');
    console.error('🛑 Encerrando aplicação...\n');
    process.exit(1);
  }
  
  console.log('');
  
  // Teste 3: Permissões
  results.permissions = await testDatabasePermissions();
  if (!results.permissions.success) {
    console.error('\n💥 Falha crítica: Permissões insuficientes no banco');
    console.error('🛑 Encerrando aplicação...\n');
    process.exit(1);
  }
  
  console.log('\n🎉 Todos os testes de startup passaram com sucesso!');
  console.log('✅ Sistema pronto para receber requisições\n');
  
  return results;
}

/**
 * Função de shutdown graceful
 */
function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n🛑 Recebido sinal ${signal}, encerrando graciosamente...`);
      
      try {
        // Fechar pool de conexões
        if (pool && typeof pool.end === 'function') {
          await pool.end();
          console.log('✅ Pool de conexões fechado');
        }
        
        console.log('✅ Shutdown completo');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante shutdown:', error.message);
        process.exit(1);
      }
    });
  });
  
  // Tratar erros não capturados
  process.on('uncaughtException', (error) => {
    console.error('💥 Erro não capturado:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promise rejeitada não tratada:', reason);
    process.exit(1);
  });
}

module.exports = {
  runStartupTests,
  testDatabaseConnection,
  testEssentialTables,
  testDatabasePermissions,
  setupGracefulShutdown
};
