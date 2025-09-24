#!/usr/bin/env node

/**
 * Script para Aplicar Configurações de Performance
 * Aplica as configurações otimizadas automaticamente
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Aplicando configurações de performance...\n');

// Configurações de performance
const performanceConfig = {
  'LOG_LEVEL': 'info',
  'LOG_WHATSAPP': 'false',
  'LOG_DATABASE': 'false', 
  'LOG_CACHE': 'false',
  'LOG_WA_STATUS': 'false',
  'LOG_AUTH': 'false',
  'LOG_TENANT': 'false',
  'ENABLE_DEBUG': 'false',
  'ENABLE_VERBOSE_LOGS': 'false',
  'ENABLE_CRON': 'false',
  'START_WHATSAPP_BOT': 'false',
  'NODE_OPTIONS': '--max-old-space-size=512'
};

// Verificar se arquivo .env existe
const envPath = '.env';
const envBackupPath = '.env.backup.' + Date.now();

if (fs.existsSync(envPath)) {
  console.log('📁 Criando backup do .env atual...');
  fs.copyFileSync(envPath, envBackupPath);
  console.log(`✅ Backup criado: ${envBackupPath}`);
}

// Ler configurações existentes
let existingConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        existingConfig[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Aplicar configurações de performance
const updatedConfig = { ...existingConfig, ...performanceConfig };

// Escrever novo arquivo .env
const envLines = [
  '# Configurações de Performance Otimizadas',
  '# Aplicadas automaticamente pelo script de performance',
  '',
  ...Object.entries(updatedConfig).map(([key, value]) => `${key}=${value}`),
  '',
  '# Configurações específicas do projeto',
  ...Object.entries(existingConfig)
    .filter(([key]) => !performanceConfig.hasOwnProperty(key))
    .map(([key, value]) => `${key}=${value}`)
];

fs.writeFileSync(envPath, envLines.join('\n'));

console.log('✅ Configurações de performance aplicadas:');
Object.entries(performanceConfig).forEach(([key, value]) => {
  console.log(`   ${key}=${value}`);
});

console.log('\n📊 Resumo:');
console.log(`   Configurações aplicadas: ${Object.keys(performanceConfig).length}`);
console.log(`   Backup criado: ${envBackupPath}`);
console.log(`   Arquivo .env atualizado`);

console.log('\n💡 Próximos passos:');
console.log('   1. Reinicie o servidor: npm start');
console.log('   2. Verifique se os logs estão mais limpos');
console.log('   3. Para habilitar logs específicos, edite o .env');

console.log('\n🔧 Para habilitar logs quando necessário:');
console.log('   LOG_AUTH=true          # Logs de autenticação');
console.log('   LOG_TENANT=true        # Logs de tenant');
console.log('   LOG_WHATSAPP=true      # Logs do WhatsApp');
console.log('   ENABLE_DEBUG=true      # Debug geral');

console.log('\n✅ Configuração concluída!');
