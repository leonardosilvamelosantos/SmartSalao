const DashboardService = require('../services/DashboardService');
const Agendamento = require('../models/Agendamento');
const Cliente = require('../models/Cliente');
const Servico = require('../models/Servico');

class DashboardController {
    constructor() {
        this.dashboardService = DashboardService;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    // Obter métricas do dashboard
    async getMetrics(req, res) {
        try {
            const userId = req.user?.id || req.user?.id_usuario;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados de usuário inválidos'
                });
            }

            // Verificar cache
            const cacheKey = `dashboard_${userId}`;
            const cached = this.cache.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp) < this.cacheTimeout) {
                return res.json({
                    success: true,
                    data: cached.data
                });
            }

            // Usar o DashboardService existente
            const metrics = await this.dashboardService.getMainMetrics(userId);

            if (metrics.error) {
                throw new Error(metrics.error);
            }

            // Formatar dados para o frontend
            const formattedMetrics = {
                agendamentosHoje: metrics.today?.appointments_today || 0,
                agendamentosConcluidos: metrics.today?.completed_today || 0,
                receitaHoje: metrics.today?.revenue_today || 0,
                clientesAtivos: metrics.general?.totalClients || 0,
                percentuais: {
                    agendamentos: this.calcularPercentual(0, metrics.today?.appointments_today || 0),
                    concluidos: this.calcularPercentual(0, metrics.today?.completed_today || 0),
                    receita: this.calcularPercentual(0, metrics.today?.revenue_today || 0),
                    clientes: this.calcularPercentual(0, metrics.general?.totalClients || 0)
                },
                trends: metrics.trends || [],
                timestamp: new Date().toISOString()
            };

            // Salvar no cache
            this.cache.set(cacheKey, {
                data: formattedMetrics,
                timestamp: now
            });

            res.json({
                success: true,
                data: formattedMetrics
            });

        } catch (error) {
            console.error('❌ Erro ao calcular métricas do dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }


    // Calcular percentual de crescimento
    calcularPercentual(valorAnterior, valorAtual) {
        if (valorAnterior === 0) {
            return valorAtual > 0 ? 100 : 0;
        }

        const percentual = ((valorAtual - valorAnterior) / valorAnterior) * 100;
        return Math.round(percentual);
    }

    // Obter dados para gráfico
    async getDadosGrafico(userId, inicio, fim) {
        try {
            // Usar o DashboardService para obter tendências
            const metrics = await this.dashboardService.getMainMetrics(userId);
            
            if (metrics.error) {
                throw new Error(metrics.error);
            }

            // Usar os dados de tendências do DashboardService
            const trends = metrics.trends || [];
            
            return {
                labels: trends.map(t => t.dayName),
                agendamentos: trends.map(t => t.appointments),
                receitas: trends.map(t => t.revenue)
            };

        } catch (error) {
            console.error('Erro ao obter dados do gráfico:', error);
            return {
                labels: [],
                agendamentos: [],
                receitas: []
            };
        }
    }
}

module.exports = DashboardController;