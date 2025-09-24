/**
 * Configuração do Sistema WhatsApp
 * Controla inicializações automáticas e reconexões
 */

module.exports = {
  // Configurações de inicialização
  autoStart: {
    enabled: process.env.START_WHATSAPP_BOT === 'true' || process.env.NODE_ENV === 'production',
    tenants: process.env.WHATSAPP_AUTO_START_TENANTS ? 
      process.env.WHATSAPP_AUTO_START_TENANTS.split(',').map(t => t.trim()).filter(t => t !== '') : 
      []
  },

  // Configurações de reconexão
  reconnection: {
    enabled: false, // Desabilitar reconexão automática
    maxAttempts: 3,
    backoffMs: 5000,
    timeoutMs: 30000
  },

  // Configurações de buffer
  buffer: {
    timeoutMs: 60000, // 60 segundos
    maxRetryCount: 3,
    retryDelayMs: 2000
  },

  // Configurações de limpeza
  cleanup: {
    intervalMs: 5 * 60 * 1000, // 5 minutos
    inactiveTimeoutMs: 30 * 60 * 1000, // 30 minutos
    autoCleanup: true
  },

  // Configurações de logging
  logging: {
    level: 'error',
    enableDebug: process.env.NODE_ENV === 'development',
    enableVerbose: false
  }
};
