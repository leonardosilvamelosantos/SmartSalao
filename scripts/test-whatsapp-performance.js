const MultiTenantWhatsAppServiceV2 = require('../src/whatsapp-bot/services/MultiTenantWhatsAppServiceV2');

// Forçar SQLite para desenvolvimento
process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite';
process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const whatsappService = new MultiTenantWhatsAppServiceV2();

(async () => {
  try {
    console.log('🧪 Testando performance da página WhatsApp...');
    
    const tenantId = '7'; // ID do tenant para testar
    
    console.log(`🔧 Testando múltiplas verificações de status para tenant ${tenantId}...`);
    
    const startTime = Date.now();
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      
      const status = whatsappService.getTenantConnectionStatus(tenantId);
      
      const iterationTime = Date.now() - iterationStart;
      
      console.log(`📊 Iteração ${i + 1}/${iterations}:`, {
        status: status.isConnected ? 'Conectado' : 'Desconectado',
        exists: status.exists,
        time: `${iterationTime}ms`
      });
      
      // Pequeno delay entre iterações
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`\n📈 Resultados da performance:`);
    console.log(`⏱️  Tempo total: ${totalTime}ms`);
    console.log(`📊 Tempo médio por verificação: ${avgTime.toFixed(2)}ms`);
    console.log(`🚀 Verificações por segundo: ${(1000 / avgTime).toFixed(2)}`);
    
    if (avgTime < 50) {
      console.log('✅ Performance excelente!');
    } else if (avgTime < 100) {
      console.log('⚠️  Performance boa, mas pode ser melhorada');
    } else {
      console.log('❌ Performance ruim, precisa de otimização');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
})();
