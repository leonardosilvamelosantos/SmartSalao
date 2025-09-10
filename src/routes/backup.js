const express = require('express');
const router = express.Router();
const BackupService = require('../services/BackupService');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/backup/create - Criar backup manual
 * Body: { includeDatabase: true, includeFiles: true }
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const options = req.body || {};
    const result = await BackupService.createFullBackup(options);

    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/backup/list - Listar backups disponíveis
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const backups = await BackupService.listBackups();

    res.json({
      success: true,
      data: backups
    });

  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/backup/restore/:backupId - Restaurar backup
 * Body: { includeDatabase: true, includeFiles: true }
 */
router.post('/restore/:backupId', authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;
    const options = req.body || {};

    const result = await BackupService.restoreBackup(backupId, options);

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/backup/verify/:backupId - Verificar integridade de backup
 */
router.get('/verify/:backupId', authenticateToken, async (req, res) => {
  try {
    const { backupId } = req.params;
    const result = await BackupService.verifyBackup(backupId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao verificar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/backup/info - Informações do sistema de backup
 */
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const info = await BackupService.getBackupInfo();

    res.json({
      success: true,
      data: info
    });

  } catch (error) {
    console.error('Erro ao obter informações de backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/backup/cleanup - Limpar backups antigos
 */
router.delete('/cleanup', authenticateToken, async (req, res) => {
  try {
    const removedCount = await BackupService.cleanupOldBackups();

    res.json({
      success: true,
      message: 'Limpeza concluída',
      data: {
        removedFiles: removedCount
      }
    });

  } catch (error) {
    console.error('Erro ao limpar backups:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
