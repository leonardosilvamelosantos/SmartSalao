const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Serviço de backup automático
 */
class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 10;

    // Criar diretório de backup se não existir
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Criar backup completo
   */
  async createFullBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupId = `backup_${timestamp}`;

    console.log(`🗄️ Iniciando backup completo: ${backupId}`);

    try {
      const results = {
        id: backupId,
        timestamp: new Date().toISOString(),
        database: null,
        files: null,
        totalSize: 0,
        duration: 0
      };

      const startTime = Date.now();

      // Backup do banco de dados
      if (options.includeDatabase !== false) {
        results.database = await this.backupDatabase(backupId);
        results.totalSize += results.database.size;
      }

      // Backup de arquivos
      if (options.includeFiles !== false) {
        results.files = await this.backupFiles(backupId);
        results.totalSize += results.files.size;
      }

      results.duration = Date.now() - startTime;

      // Limpar backups antigos
      await this.cleanupOldBackups();

      console.log(`✅ Backup completo finalizado: ${backupId}`);
      console.log(`📏 Tamanho total: ${this.formatBytes(results.totalSize)}`);
      console.log(`⏱️ Duração: ${Math.round(results.duration / 1000)}s`);

      return results;

    } catch (error) {
      console.error(`❌ Erro no backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Backup do banco de dados
   */
  async backupDatabase(backupId) {
    try {
      console.log('📊 Fazendo backup do banco de dados...');

      const backupPath = path.join(this.backupDir, `${backupId}_database.sql`);

      // SQLite: copiar arquivo de banco diretamente
      const sourcePath = path.join(process.cwd(), 'data', 'agendamento_dev.db');
      await fs.promises.copyFile(sourcePath, backupPath);

      // Comprimir o arquivo
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      try {
        await execAsync(`gzip "${backupPath}"`);
        backupPath = `${backupPath}.gz`;
      } catch (error) {
        console.warn('Compressão falhou, mantendo arquivo original:', error.message);
      }

      // Verificar tamanho do arquivo
      const stats = fs.statSync(backupPath);
      const size = stats.size;

      console.log(`✅ Backup do banco criado: ${this.formatBytes(size)}`);

      return {
        path: backupPath,
        size: size,
        filename: path.basename(backupPath),
        type: 'database'
      };

    } catch (error) {
      console.error('Erro no backup do banco:', error);
      throw error;
    }
  }

  /**
   * Backup de arquivos
   */
  async backupFiles(backupId) {
    try {
      console.log('📁 Fazendo backup de arquivos...');

      const backupPath = path.join(this.backupDir, `${backupId}_files.tar.gz`);
      const sourceDir = process.env.FILES_DIR || './uploads';

      // Verificar se diretório existe
      if (!fs.existsSync(sourceDir)) {
        console.log('⚠️ Diretório de arquivos não encontrado, pulando backup de arquivos');
        return {
          path: null,
          size: 0,
          filename: null,
          type: 'files',
          skipped: true
        };
      }

      // Comando tar para comprimir
      const tarCommand = `tar -czf ${backupPath} -C ${path.dirname(sourceDir)} ${path.basename(sourceDir)}`;

      await execAsync(tarCommand);

      // Verificar tamanho do arquivo
      const stats = fs.statSync(backupPath);
      const size = stats.size;

      console.log(`✅ Backup de arquivos criado: ${this.formatBytes(size)}`);

      return {
        path: backupPath,
        size: size,
        filename: path.basename(backupPath),
        type: 'files'
      };

    } catch (error) {
      console.error('Erro no backup de arquivos:', error);
      throw error;
    }
  }

  /**
   * Restauração do backup
   */
  async restoreBackup(backupId, options = {}) {
    console.log(`🔄 Iniciando restauração: ${backupId}`);

    try {
      const results = {
        id: backupId,
        database: null,
        files: null,
        success: true
      };

      // Restauração do banco
      if (options.includeDatabase !== false) {
        results.database = await this.restoreDatabase(backupId);
      }

      // Restauração de arquivos
      if (options.includeFiles !== false) {
        results.files = await this.restoreFiles(backupId);
      }

      console.log(`✅ Restauração concluída: ${backupId}`);
      return results;

    } catch (error) {
      console.error(`❌ Erro na restauração ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Restauração do banco de dados
   */
  async restoreDatabase(backupId) {
    try {
      console.log('📊 Restaurando banco de dados...');

      const backupPath = path.join(this.backupDir, `${backupId}_database.sql`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Arquivo de backup não encontrado: ${backupPath}`);
      }

      // SQLite: sobrescrever arquivo de banco diretamente
      const targetPath = path.join(process.cwd(), 'data', 'agendamento_dev.db');
      const backupDir = path.dirname(backupPath);

      // Se o backup estiver comprimido, descomprimir primeiro
      let actualBackupPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        const uncompressedPath = backupPath.replace('.gz', '');
        try {
          await execAsync(`gunzip "${backupPath}"`);
          actualBackupPath = uncompressedPath;
        } catch (error) {
          console.warn('Descompressão falhou:', error.message);
        }
      }

      // Fazer backup do banco atual antes de sobrescrever
      const backupAtual = `${targetPath}.backup_${Date.now()}`;
      await fs.promises.copyFile(targetPath, backupAtual);

      // Restaurar backup
      await fs.promises.copyFile(actualBackupPath, targetPath);

      console.log(`✅ Backup do banco atual salvo em: ${backupAtual}`);

      console.log('✅ Banco de dados restaurado com sucesso');

      return {
        success: true,
        type: 'database',
        message: 'Banco restaurado'
      };

    } catch (error) {
      console.error('Erro na restauração do banco:', error);
      throw error;
    }
  }

  /**
   * Restauração de arquivos
   */
  async restoreFiles(backupId) {
    try {
      console.log('📁 Restaurando arquivos...');

      const backupPath = path.join(this.backupDir, `${backupId}_files.tar.gz`);
      const targetDir = process.env.FILES_DIR || './uploads';

      if (!fs.existsSync(backupPath)) {
        console.log('⚠️ Arquivo de backup de arquivos não encontrado, pulando...');
        return {
          success: true,
          type: 'files',
          message: 'Backup não encontrado, pulando'
        };
      }

      // Criar diretório se não existir
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Comando tar para extrair
      const extractCommand = `tar -xzf ${backupPath} -C ${path.dirname(targetDir)}`;

      await execAsync(extractCommand);

      console.log('✅ Arquivos restaurados com sucesso');

      return {
        success: true,
        type: 'files',
        message: 'Arquivos restaurados'
      };

    } catch (error) {
      console.error('Erro na restauração de arquivos:', error);
      throw error;
    }
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);

      const backups = [];
      const backupGroups = {};

      // Agrupar arquivos por backup
      files.forEach(file => {
        const match = file.match(/^backup_(.+?)_(database|files)\.(.+)$/);
        if (match) {
          const [, timestamp, type, ext] = match;
          const backupId = `backup_${timestamp}`;

          if (!backupGroups[backupId]) {
            backupGroups[backupId] = {
              id: backupId,
              timestamp: timestamp.replace(/-/g, ':').replace('T', ' '),
              files: {},
              totalSize: 0
            };
          }

          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          backupGroups[backupId].files[type] = {
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          };

          backupGroups[backupId].totalSize += stats.size;
        }
      });

      // Converter para array e ordenar por data
      Object.values(backupGroups).forEach(backup => {
        backup.totalSizeFormatted = this.formatBytes(backup.totalSize);
        backups.push(backup);
      });

      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;

    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Limpar backups antigos
   */
  async cleanupOldBackups() {
    try {
      console.log('🧹 Limpando backups antigos...');

      const backups = await this.listBackups();

      if (backups.length <= this.maxBackups) {
        console.log(`📊 Mantendo ${backups.length} backups (limite: ${this.maxBackups})`);
        return 0;
      }

      // Remover backups excedentes
      const toRemove = backups.slice(this.maxBackups);
      let removedCount = 0;

      for (const backup of toRemove) {
        // Remover todos os arquivos do backup
        for (const [type, fileInfo] of Object.entries(backup.files)) {
          try {
            fs.unlinkSync(fileInfo.path);
            removedCount++;
            console.log(`🗑️ Removido: ${path.basename(fileInfo.path)}`);
          } catch (error) {
            console.error(`Erro ao remover ${fileInfo.path}:`, error);
          }
        }
      }

      console.log(`✅ ${removedCount} arquivos de backup antigos removidos`);
      return removedCount;

    } catch (error) {
      console.error('Erro ao limpar backups antigos:', error);
      return 0;
    }
  }

  /**
   * Verificar integridade de backup
   */
  async verifyBackup(backupId) {
    try {
      const backups = await this.listBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        return {
          valid: false,
          message: 'Backup não encontrado'
        };
      }

      let valid = true;
      const issues = [];

      // Verificar arquivos
      for (const [type, fileInfo] of Object.entries(backup.files)) {
        if (!fs.existsSync(fileInfo.path)) {
          valid = false;
          issues.push(`Arquivo ${type} não encontrado`);
        } else {
          const stats = fs.statSync(fileInfo.path);
          if (stats.size !== fileInfo.size) {
            valid = false;
            issues.push(`Tamanho do arquivo ${type} não confere`);
          }
        }
      }

      return {
        valid,
        backup: backupId,
        issues,
        files: Object.keys(backup.files),
        totalSize: backup.totalSize,
        totalSizeFormatted: backup.totalSizeFormatted
      };

    } catch (error) {
      console.error('Erro ao verificar backup:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Obter informações do sistema de backup
   */
  async getBackupInfo() {
    try {
      const backups = await this.listBackups();

      // Estatísticas
      const totalSize = backups.reduce((sum, backup) => sum + backup.totalSize, 0);
      const oldestBackup = backups.length > 0 ? backups[backups.length - 1] : null;
      const newestBackup = backups.length > 0 ? backups[0] : null;

      // Espaço em disco
      const diskUsage = await this.getDiskUsage();

      return {
        summary: {
          totalBackups: backups.length,
          totalSize: totalSize,
          totalSizeFormatted: this.formatBytes(totalSize),
          oldestBackup: oldestBackup?.timestamp,
          newestBackup: newestBackup?.timestamp
        },
        settings: {
          backupDir: this.backupDir,
          retentionDays: this.retentionDays,
          maxBackups: this.maxBackups
        },
        disk: diskUsage,
        recentBackups: backups.slice(0, 5) // Últimos 5
      };

    } catch (error) {
      console.error('Erro ao obter informações de backup:', error);
      return { error: error.message };
    }
  }

  /**
   * Obter uso do disco
   */
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync(`df -h ${this.backupDir} | tail -1`);
      const parts = stdout.trim().split(/\s+/);

      return {
        filesystem: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usePercent: parts[4],
        mountPoint: parts[5]
      };

    } catch (error) {
      console.error('Erro ao obter uso do disco:', error);
      return null;
    }
  }

  /**
   * Formatar bytes para leitura humana
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Backup automático por agendamento
   */
  async scheduledBackup() {
    try {
      console.log('⏰ Executando backup automático agendado...');

      const result = await this.createFullBackup({
        includeDatabase: true,
        includeFiles: true
      });

      console.log(`✅ Backup automático concluído: ${result.id}`);

      return result;

    } catch (error) {
      console.error('❌ Erro no backup automático:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();
