const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticateToken } = require('../middleware/auth');

// (removido) POST /api/notificacoes/test

/**
 * GET /api/notificacoes/estatisticas - Estatísticas de notificações
 * Query params: days
 */
router.get('/estatisticas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;

    const stats = await NotificationService.getNotificationStats(userId, parseInt(days));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas de notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/notificacoes/config - Configurar lembretes
 */
router.put('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const settings = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const result = await NotificationService.configureReminders(userId, settings);

    res.json(result);

  } catch (error) {
    console.error('Erro ao configurar lembretes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/notificacoes/config - Obter configurações de lembretes
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const settings = await NotificationService.getReminderSettings(userId);

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Erro ao obter configurações de lembretes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/notificacoes/booking-created/:id - Notificar criação de agendamento
 */
router.post('/booking-created/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar se o agendamento pertence ao usuário
    const Agendamento = require('../models/Agendamento');
    const agendamento = await Agendamento.findById(parseInt(id));

    if (!agendamento || agendamento.id_usuario !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Agendamento não encontrado ou não pertence ao usuário'
      });
    }

    const result = await NotificationService.notifyBookingCreated(parseInt(id));

    res.json({
      success: true,
      message: 'Notificação de criação enviada',
      data: result
    });

  } catch (error) {
    console.error('Erro ao notificar criação de agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/notificacoes/booking-cancelled/:id - Notificar cancelamento de agendamento
 */
router.post('/booking-cancelled/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verificar se o agendamento pertence ao usuário
    const Agendamento = require('../models/Agendamento');
    const agendamento = await Agendamento.findById(parseInt(id));

    if (!agendamento || agendamento.id_usuario !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Agendamento não encontrado ou não pertence ao usuário'
      });
    }

    const result = await NotificationService.notifyBookingCancelled(parseInt(id));

    res.json({
      success: true,
      message: 'Notificação de cancelamento enviada',
      data: result
    });

  } catch (error) {
    console.error('Erro ao notificar cancelamento de agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/notificacoes/send-reminders - Enviar lembretes manualmente
 */
router.post('/send-reminders', authenticateToken, async (req, res) => {
  try {
    const result = await NotificationService.sendReminders();

    res.json({
      success: true,
      message: 'Lembretes enviados',
      data: result
    });

  } catch (error) {
    console.error('Erro ao enviar lembretes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
