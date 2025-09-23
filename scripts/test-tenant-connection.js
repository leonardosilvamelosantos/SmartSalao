const MultiTenantWhatsAppServiceV2 = require('../src/whatsapp-bot/services/MultiTenantWhatsAppServiceV2');

// Forçar SQLite para desenvolvimento
process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite';
process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const whatsappService = new MultiTenantWhatsAppServiceV2();

(async () => {
  try {
    console.log('🧪 Testando conexão de tenant específico...');
    
    const tenantId = '7'; // ID do tenant para testar
    
    console.log(`🔧 Inicializando conexão para tenant ${tenantId}...`);
    const result = await whatsappService.initializeTenantConnection(tenantId, {
      autoConnect: true,
      maxRetries: 3
    });
    
    if (result.success) {
      console.log(`✅ Conexão inicializada com sucesso para tenant ${tenantId}`);
      console.log('📊 Status:', result.connectionStatus);
      
      // Aguardar um pouco para ver se mantém a conexão
      console.log('⏳ Aguardando 10 segundos para verificar estabilidade...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verificar status novamente
      const status = whatsappService.getTenantConnectionStatus(tenantId);
      console.log('📊 Status após 10s:', status);
      
    } else {
      console.log(`❌ Falha ao inicializar conexão: ${result.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
})();
