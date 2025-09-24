#!/usr/bin/env node

/**
 * Script para Otimizar Logs do Sistema
 * Remove ou otimiza logs excessivos para melhorar performance
 */

const fs = require('fs');
const path = require('path');

// Configurações de otimização
const OPTIMIZATION_CONFIG = {
  // Arquivos que devem ter logs reduzidos
  filesToOptimize: [
    'src/whatsapp-bot/services/MultiTenantWhatsAppServiceV2.js',
    'src/whatsapp-bot/core/InstanceManager.js',
    'src/whatsapp-bot/services/BotProcessorService.js',
    'src/services/CronJobService.js',
    'src/services/CacheService.js',
    'src/index.js'
  ],
  
  // Padrões de logs para comentar/remover
  logPatterns: [
    // Logs de status frequentes
    /console\.log\([^)]*status[^)]*\)/gi,
    /console\.log\([^)]*conectado[^)]*\)/gi,
    /console\.log\([^)]*desconectado[^)]*\)/gi,
    
    // Logs de debug
    /console\.log\([^)]*debug[^)]*\)/gi,
    /console\.log\([^)]*🔍[^)]*\)/gi,
    /console\.log\([^)]*📊[^)]*\)/gi,
    
    // Logs de cache
    /console\.log\([^)]*cache[^)]*\)/gi,
    /console\.log\([^)]*💾[^)]*\)/gi,
    
    // Logs de mensagens (muito frequentes)
    /console\.log\([^)]*mensagem[^)]*\)/gi,
    /console\.log\([^)]*📨[^)]*\)/gi,
    /console\.log\([^)]*📤[^)]*\)/gi,
    
    // Logs de processamento
    /console\.log\([^)]*processando[^)]*\)/gi,
    /console\.log\([^)]*⏳[^)]*\)/gi
  ],
  
  // Logs que devem ser mantidos (importantes)
  keepPatterns: [
    /console\.error/gi,
    /console\.warn/gi,
    /console\.log\([^)]*❌[^)]*\)/gi,
    /console\.log\([^)]*✅[^)]*\)/gi,
    /console\.log\([^)]*🚀[^)]*\)/gi,
    /console\.log\([^)]*🛑[^)]*\)/gi
  ]
};

/**
 * Verifica se um log deve ser mantido
 */
function shouldKeepLog(line) {
  return OPTIMIZATION_CONFIG.keepPatterns.some(pattern => pattern.test(line));
}

/**
 * Verifica se um log deve ser otimizado
 */
function shouldOptimizeLog(line) {
  return OPTIMIZATION_CONFIG.logPatterns.some(pattern => pattern.test(line));
}

/**
 * Otimiza um arquivo
 */
function optimizeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    let optimizedCount = 0;

    const optimizedLines = lines.map((line, index) => {
      // Pular linhas que devem ser mantidas
      if (shouldKeepLog(line)) {
        return line;
      }

      // Otimizar logs desnecessários
      if (shouldOptimizeLog(line)) {
        // Comentar a linha em vez de remover completamente
        if (line.trim().startsWith('console.log')) {
          optimizedCount++;
          modified = true;
          return `    // ${line.trim()} // Otimizado para reduzir spam no console`;
        }
      }

      return line;
    });

    if (modified) {
      // Criar backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, content);
      console.log(`📁 Backup criado: ${backupPath}`);

      // Salvar arquivo otimizado
      fs.writeFileSync(filePath, optimizedLines.join('\n'));
      console.log(`✅ ${filePath}: ${optimizedCount} logs otimizados`);
      return true;
    } else {
      console.log(`ℹ️ ${filePath}: Nenhuma otimização necessária`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erro ao otimizar ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Função principal
 */
function main() {
  console.log('🚀 Iniciando otimização de logs...\n');

  let totalOptimized = 0;
  let totalFiles = 0;

  OPTIMIZATION_CONFIG.filesToOptimize.forEach(filePath => {
    totalFiles++;
    if (optimizeFile(filePath)) {
      totalOptimized++;
    }
  });

  console.log(`\n📊 Resumo da otimização:`);
  console.log(`   Arquivos processados: ${totalFiles}`);
  console.log(`   Arquivos otimizados: ${totalOptimized}`);
  console.log(`   Arquivos inalterados: ${totalFiles - totalOptimized}`);

  if (totalOptimized > 0) {
    console.log(`\n💡 Dicas adicionais:`);
    console.log(`   1. Configure LOG_LEVEL=info no seu .env`);
    console.log(`   2. Desabilite LOG_WHATSAPP=false se não precisar`);
    console.log(`   3. Use ENABLE_DEBUG=false em produção`);
    console.log(`   4. Configure ENABLE_CRON=false em desenvolvimento`);
  }

  console.log(`\n✅ Otimização concluída!`);
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { optimizeFile, shouldKeepLog, shouldOptimizeLog };
