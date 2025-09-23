const MultiTenantWhatsAppServiceV2 = require('../src/whatsapp-bot/services/MultiTenantWhatsAppServiceV2');

// Forçar SQLite para desenvolvimento
process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite';
process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const whatsappService = new MultiTenantWhatsAppServiceV2();

(async () => {
  try {
    console.log('🧪 Testando performance do cache...');
    
    const tenantId = '7';
    
    console.log(`🔧 Primeira verificação (sem cache):`);
    const start1 = Date.now();
    const status1 = whatsappService.getTenantConnectionStatus(tenantId);
    const time1 = Date.now() - start1;
    console.log(`⏱️  Tempo: ${time1}ms`);
    console.log(`📊 Status:`, status1);
    
    console.log(`\n🔧 Segunda verificação (com cache):`);
    const start2 = Date.now();
    const status2 = whatsappService.getTenantConnectionStatus(tenantId);
    const time2 = Date.now() - start2;
    console.log(`⏱️  Tempo: ${time2}ms`);
    console.log(`📊 Status:`, status2);
    
    console.log(`\n🔧 Terceira verificação (com cache):`);
    const start3 = Date.now();
    const status3 = whatsappService.getTenantConnectionStatus(tenantId);
    const time3 = Date.now() - start3;
    console.log(`⏱️  Tempo: ${time3}ms`);
    console.log(`📊 Status:`, status3);
    
    console.log(`\n📈 Análise:`);
    console.log(`🚀 Melhoria de performance: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
    console.log(`⚡ Cache funcionando: ${time2 < time1 ? 'Sim' : 'Não'}`);
    
    if (time2 < 10) {
      console.log('✅ Cache funcionando perfeitamente!');
    } else if (time2 < 50) {
      console.log('⚠️  Cache funcionando, mas pode melhorar');
    } else {
      console.log('❌ Cache não está funcionando adequadamente');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
})();
