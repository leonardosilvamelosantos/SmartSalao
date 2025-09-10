#!/usr/bin/env node

/**
 * Script de backup manual
 * Uso: node scripts/backup.js [create|list|restore|verify|cleanup] [backupId]
 */

const BackupService = require('../src/services/BackupService');

async function main() {
  const command = process.argv[2] || 'create';
  const backupId = process.argv[3];

  console.log(`🗄️ Backup Script - Comando: ${command}\n`);

  try {
    switch (command) {
      case 'create':
        console.log('📦 Criando backup completo...');
        const result = await BackupService.createFullBackup();
        console.log('✅ Backup criado com sucesso!');
        console.log(`📁 ID: ${result.id}`);
        console.log(`📏 Tamanho: ${BackupService.formatBytes(result.totalSize)}`);
        console.log(`⏱️ Duração: ${Math.round(result.duration / 1000)}s`);
        break;

      case 'list':
        console.log('📋 Listando backups disponíveis...');
        const backups = await BackupService.listBackups();
        if (backups.length === 0) {
          console.log('❌ Nenhum backup encontrado');
        } else {
          console.log(`📊 Encontrados ${backups.length} backups:\n`);
          backups.forEach(backup => {
            console.log(`🗂️ ${backup.id}`);
            console.log(`   📅 ${backup.timestamp}`);
            console.log(`   📏 ${backup.totalSizeFormatted}`);
            console.log(`   📁 Arquivos: ${Object.keys(backup.files).join(', ')}\n`);
          });
        }
        break;

      case 'restore':
        if (!backupId) {
          console.error('❌ ID do backup é obrigatório para restauração');
          console.log('💡 Uso: node scripts/backup.js restore backup_2024-01-15T10-30-00');
          process.exit(1);
        }

        console.log(`🔄 Restaurando backup: ${backupId}`);
        const restoreResult = await BackupService.restoreBackup(backupId);
        console.log('✅ Backup restaurado com sucesso!');
        break;

      case 'verify':
        if (!backupId) {
          console.error('❌ ID do backup é obrigatório para verificação');
          console.log('💡 Uso: node scripts/backup.js verify backup_2024-01-15T10-30-00');
          process.exit(1);
        }

        console.log(`🔍 Verificando backup: ${backupId}`);
        const verifyResult = await BackupService.verifyBackup(backupId);

        if (verifyResult.valid) {
          console.log('✅ Backup válido!');
          console.log(`📏 Tamanho: ${verifyResult.totalSizeFormatted}`);
          console.log(`📁 Arquivos: ${verifyResult.files.join(', ')}`);
        } else {
          console.log('❌ Backup inválido!');
          verifyResult.issues.forEach(issue => console.log(`   - ${issue}`));
        }
        break;

      case 'cleanup':
        console.log('🧹 Limpando backups antigos...');
        const removedCount = await BackupService.cleanupOldBackups();
        console.log(`✅ ${removedCount} arquivos antigos removidos`);
        break;

      case 'info':
        console.log('ℹ️ Informações do sistema de backup...');
        const info = await BackupService.getBackupInfo();
        console.log(`📊 Total de backups: ${info.summary.totalBackups}`);
        console.log(`📏 Espaço total usado: ${info.summary.totalSizeFormatted}`);
        console.log(`📁 Diretório: ${info.settings.backupDir}`);
        console.log(`📅 Retenção: ${info.settings.retentionDays} dias`);
        console.log(`🔢 Máximo: ${info.settings.maxBackups} backups`);
        break;

      default:
        console.log('❌ Comando não reconhecido');
        console.log('\n📋 Comandos disponíveis:');
        console.log('   create  - Criar backup completo');
        console.log('   list    - Listar backups disponíveis');
        console.log('   restore - Restaurar backup (precisa do ID)');
        console.log('   verify  - Verificar integridade (precisa do ID)');
        console.log('   cleanup - Limpar backups antigos');
        console.log('   info    - Informações do sistema');
        console.log('\n💡 Exemplos:');
        console.log('   node scripts/backup.js create');
        console.log('   node scripts/backup.js list');
        console.log('   node scripts/backup.js restore backup_2024-01-15T10-30-00');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro no script de backup:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
