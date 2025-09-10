const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard - Métricas principais do dashboard
 */
router.get('/', authenticateToken, DashboardController.getMainMetrics);

/**
 * GET /api/dashboard/today - Métricas de hoje
 */
router.get('/today', authenticateToken, DashboardController.getTodayMetrics);

/**
 * GET /api/dashboard/week - Métricas da semana
 */
router.get('/week', authenticateToken, DashboardController.getWeekMetrics);

/**
 * GET /api/dashboard/month - Métricas do mês
 */
router.get('/month', authenticateToken, DashboardController.getMonthMetrics);

/**
 * GET /api/dashboard/trends - Tendências dos últimos 7 dias
 */
router.get('/trends', authenticateToken, DashboardController.getTrends);

/**
 * GET /api/dashboard/appointments-by-status - Agendamentos por status
 */
router.get('/appointments-by-status', authenticateToken, DashboardController.getAppointmentsByStatus);

/**
 * GET /api/dashboard/revenue-by-service - Receita por serviço
 */
router.get('/revenue-by-service', authenticateToken, DashboardController.getRevenueByService);

/**
 * GET /api/dashboard/top-clients - Clientes mais frequentes
 */
router.get('/top-clients', authenticateToken, DashboardController.getTopClients);

/**
 * GET /api/dashboard/report - Relatório detalhado por período
 * Query params: start_date, end_date
 */
router.get('/report', authenticateToken, DashboardController.getDetailedReport);

/**
 * POST /api/dashboard/clear-cache - Limpar cache do usuário
 */
router.post('/clear-cache', authenticateToken, DashboardController.clearCache);

/**
 * GET /api/dashboard/export - Exportar dados para CSV
 * Query params: type (appointments|clients), start_date, end_date
 */
router.get('/export', authenticateToken, DashboardController.exportToCSV);

module.exports = router;
