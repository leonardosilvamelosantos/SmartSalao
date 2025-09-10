#!/usr/bin/env node

const { runMigrations, dropTables } = require('../src/database/migrations');

/**
 * Script para executar migrações do banco de dados
 * Uso:
 * - npm run migrate
 * - npm run migrate:drop
 */

const command = process.argv[2];

async function main() {
  try {
    if (command === 'drop') {
      await dropTables();
    } else {
      await runMigrations();
    }
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }
}

main();
