/**
 * Configuração de Banco de Dados - SQLite Only
 * Sistema Multi-Tenant usando apenas SQLite para simplicidade
 */

console.log('✅ Usando apenas SQLite para desenvolvimento');

// Importar configuração SQLite
const sqliteConfig = require('./database-sqlite');

// Exportar apenas o pool para compatibilidade
module.exports = sqliteConfig.pool;
