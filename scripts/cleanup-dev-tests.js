#!/usr/bin/env node

/**
 * Limpeza de artefatos de teste e endpoints temporários
 * Uso: node scripts/cleanup-dev-tests.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const filesToDelete = [
  // Scripts de demonstração não essenciais ao produto
  'scripts/demo-multi-tenant.js',
  'scripts/init-multi-tenant.js'
];

const filesToCheckAndWarn = [
  // Serviços de teste que foram referenciados nas rotas
  'src/services/TenantTestService.js'
];

function removeIfExists(filePath) {
  const abs = path.join(projectRoot, filePath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
    console.log('🧹 Removido:', filePath);
  } else {
    console.log('ℹ️  Não encontrado (ok):', filePath);
  }
}

function warnIfExists(filePath) {
  const abs = path.join(projectRoot, filePath);
  if (fs.existsSync(abs)) {
    console.log('⚠️  Atenção: ainda existe arquivo de teste:', filePath);
  }
}

async function main() {
  try {
    console.log('🔧 Iniciando limpeza de artefatos de teste...');

    // Remover arquivos declarados
    filesToDelete.forEach(removeIfExists);

    // Avisar sobre serviços de teste restantes (caso desejado manter para dev)
    filesToCheckAndWarn.forEach(warnIfExists);

    console.log('✅ Limpeza concluída.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na limpeza:', err.message);
    process.exit(1);
  }
}

main();


