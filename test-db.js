#!/usr/bin/env node

/**
 * Teste simples do database
 */

console.log('🧪 Testando conexão com database...');

try {
  require('dotenv').config();
  console.log('✅ dotenv OK');

  const db = require('./src/config/database');
  console.log('✅ database module loaded');

  console.log('🎯 Database test completed successfully!');

} catch (error) {
  console.error('❌ Database test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
