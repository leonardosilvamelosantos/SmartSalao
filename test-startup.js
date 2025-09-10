#!/usr/bin/env node

/**
 * Teste simples de inicialização
 */

console.log('🧪 Testando inicialização dos módulos...');

try {
  console.log('📦 Testando dotenv...');
  require('dotenv').config();
  console.log('✅ dotenv OK');

  console.log('📊 Testando database...');
  const db = require('./src/config/database');
  console.log('✅ database OK');

  console.log('🔐 Testando auth service...');
  const AuthService = require('./src/services/AuthService');
  console.log('✅ AuthService OK');

  console.log('🏗️ Testando tenant service...');
  const TenantProvisioningService = require('./src/services/TenantProvisioningService');
  console.log('✅ TenantProvisioningService OK');

  console.log('🎯 Todos os módulos carregados com sucesso!');
  console.log('');
  console.log('🚀 Tentando iniciar servidor...');

  // Tentar iniciar o servidor
  require('./src/index');

} catch (error) {
  console.error('❌ Erro durante inicialização:', error.message);
  console.error(error.stack);
  process.exit(1);
}
