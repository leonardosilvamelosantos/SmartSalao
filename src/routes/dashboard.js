const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticateToken } = require('../middleware/auth');

const dashboardController = new DashboardController();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/dashboard - Obter métricas do dashboard
router.get('/', async (req, res) => {
    await dashboardController.getMetrics(req, res);
});

// GET /api/dashboard/agendamentos - Obter agendamentos do dashboard
router.get('/agendamentos', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { status = 'confirmed', limit = 5, sort = 'start_at' } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Dados de usuário inválidos'
            });
        }

        const agendamentos = await dashboardController.agendamentoService.listarAgendamentos({
            tenant_id: tenantId,
            status,
            limit: parseInt(limit),
            sort
        });

        res.json({
            success: true,
            data: agendamentos
        });

    } catch (error) {
        console.error('Erro ao obter agendamentos do dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/dashboard/grafico - Obter dados para gráfico
router.get('/grafico', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;
        const { periodo = '7d' } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Dados de usuário inválidos'
            });
        }

        // Calcular período baseado no parâmetro
        const hoje = new Date();
        let inicio;

        switch (periodo) {
            case '7d':
                inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                inicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const userId = req.user?.id || req.user?.id_usuario;
        const dadosGrafico = await dashboardController.getDadosGrafico(userId, inicio, hoje);

        res.json({
            success: true,
            data: dadosGrafico
        });

    } catch (error) {
        console.error('Erro ao obter dados do gráfico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;