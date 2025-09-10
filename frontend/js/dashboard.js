// Dashboard - Sistema Barbeiros

class DashboardManager {
    constructor(app) {
        this.app = app;
        this.chart = null;
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupRealTimeUpdates();
        this.initChart();
        this.setupEventListeners();
    }

    // Inicializar gráfico
    initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        // Dados simulados para demonstração
        const data = this.getChartData();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Agendamentos',
                    data: data.agendamentos,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Receita (R$)',
                    data: data.receita,
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Agendamentos'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Receita (R$)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    // Dados do gráfico
    getChartData() {
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

        return {
            labels: days,
            agendamentos: [8, 12, 15, 10, 18, 14, 9],
            receita: [320, 480, 600, 400, 720, 560, 360]
        };
    }

    // Configurar event listeners
    setupEventListeners() {
        // Atualizar gráfico quando tema muda
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(() => this.updateChartTheme(), 300);
            });
        }

        // Botões de ação rápida
        this.setupQuickActions();
    }

    // Configurar ações rápidas
    setupQuickActions() {
        // Os botões já têm onclick definido no HTML
        // Aqui podemos adicionar funcionalidades extras se necessário
    }

    // Atualizar tema do gráfico
    updateChartTheme() {
        if (!this.chart) return;

        const isDark = document.body.classList.contains('dark-mode');

        if (isDark) {
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.borderColor = '#334155';
        } else {
            Chart.defaults.color = '#64748b';
            Chart.defaults.borderColor = '#e2e8f0';
        }

        this.chart.update();
    }

    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            // Carregar métricas principais
            await this.loadMetrics();

            // Carregar próximos agendamentos
            await this.loadProximosAgendamentos();

            // Carregar gráfico de tendências (se houver dados suficientes)
            await this.loadTrendsChart();

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.showOfflineMode();
        }
    }

    // Carregar métricas principais
    async loadMetrics() {
        try {
            const response = await this.app.apiRequest('/api/dashboard');

            if (response.success && response.data) {
                this.updateMetrics(response.data);
            } else {
                // Dados simulados para desenvolvimento
                this.updateMetrics(this.getMockMetrics());
            }
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            this.updateMetrics(this.getMockMetrics());
        }
    }

    // Atualizar métricas na interface
    updateMetrics(data) {
        const elements = {
            'agendamentos-hoje': data.agendamentosHoje || data.appointments_today || 0,
            'receita-hoje': `R$ ${(data.receitaHoje || data.revenue_today || 0).toFixed(2)}`,
            'clientes-ativos': data.clientesAtivos || data.total_clients || 0,
            'agendamentos-concluidos': data.agendamentosConcluidos || data.completed_today || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;

                // Adicionar animação se o valor mudou
                if (element.dataset.previousValue !== value.toString()) {
                    this.animateValueChange(element);
                    element.dataset.previousValue = value.toString();
                }
            }
        });
    }

    // Animação para mudança de valores
    animateValueChange(element) {
        element.classList.add('value-changed');
        setTimeout(() => {
            element.classList.remove('value-changed');
        }, 1000);
    }

    // Carregar próximos agendamentos
    async loadProximosAgendamentos() {
        try {
            const response = await this.app.apiRequest('/api/agendamentos?status=confirmed&limit=5&sort=start_at');

            if (response.success && response.data) {
                this.renderProximosAgendamentos(response.data);
            } else {
                this.renderEmptyAgendamentos();
            }
        } catch (error) {
            console.error('Erro ao carregar próximos agendamentos:', error);
            this.renderEmptyAgendamentos();
        }
    }

    // Renderizar próximos agendamentos
    renderProximosAgendamentos(agendamentos) {
        const container = document.getElementById('proximos-agendamentos');

        if (!agendamentos || agendamentos.length === 0) {
            this.renderEmptyAgendamentos();
            return;
        }

        const html = agendamentos.map(agendamento => {
            const dataHora = new Date(agendamento.start_at);
            const agora = new Date();
            const diferencaMs = dataHora - agora;
            const diferencaHoras = Math.floor(diferencaMs / (1000 * 60 * 60));

            let badgeClass = 'bg-success';
            let statusText = '';

            if (diferencaHoras < 0) {
                badgeClass = 'bg-danger';
                statusText = 'Atrasado';
            } else if (diferencaHoras <= 2) {
                badgeClass = 'bg-warning';
                statusText = `Em ${diferencaHoras}h`;
            } else {
                statusText = 'Próximo';
            }

            return `
                <div class="d-flex align-items-center p-3 border-bottom">
                    <div class="flex-shrink-0">
                        <i class="bi bi-calendar-event text-primary" style="font-size: 1.5rem;"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${agendamento.cliente_nome || 'Cliente'}</h6>
                                <p class="mb-1 text-muted">${agendamento.nome_servico || 'Serviço'}</p>
                                <small class="text-muted">
                                    ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                </small>
                            </div>
                            <span class="badge ${badgeClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // Renderizar estado vazio
    renderEmptyAgendamentos() {
        const container = document.getElementById('proximos-agendamentos');
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
                <p class="mt-2 mb-1">Nenhum agendamento próximo</p>
                <small>Seus próximos agendamentos aparecerão aqui</small>
            </div>
        `;
    }

    // Carregar gráfico de tendências
    async loadTrendsChart() {
        // Implementar gráfico com Chart.js se disponível
        // Por enquanto, mostrar apenas informações textuais
        console.log('Gráfico de tendências - TODO');
    }

    // Dados simulados para desenvolvimento
    getMockMetrics() {
        return {
            agendamentosHoje: Math.floor(Math.random() * 10) + 1,
            receitaHoje: Math.floor(Math.random() * 500) + 100,
            clientesAtivos: Math.floor(Math.random() * 100) + 20,
            agendamentosConcluidos: Math.floor(Math.random() * 5) + 1
        };
    }

    // Configurar atualizações em tempo real
    setupRealTimeUpdates() {
        // Atualizar dados a cada 5 minutos
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);

        // Atualizar métricas a cada 30 segundos
        setInterval(() => {
            this.loadMetrics();
        }, 30 * 1000);
    }

    // Modo offline
    showOfflineMode() {
        const metrics = this.getMockMetrics();
        this.updateMetrics(metrics);
        this.renderEmptyAgendamentos();

        // Mostrar indicador de modo offline
        this.showOfflineIndicator();
    }

    // Mostrar indicador de offline
    showOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'alert alert-warning alert-dismissible fade show position-fixed';
        indicator.style.cssText = 'top: 70px; right: 20px; z-index: 1050; max-width: 300px;';
        indicator.innerHTML = `
            <i class="bi bi-wifi-off me-2"></i>
            <strong>Modo Offline</strong> - Dados podem estar desatualizados.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(indicator);

        // Remover automaticamente após 10 segundos
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 10000);
    }

    // Recarregar dados manualmente
    async refresh() {
        await this.loadDashboardData();
        this.app.showSuccess('Dados atualizados com sucesso!');
    }
}

// CSS adicional para animações
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .value-changed {
        animation: valuePulse 1s ease-in-out;
        color: #2563eb !important;
    }

    @keyframes valuePulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }

    .card:hover .card-title {
        color: #2563eb !important;
        transition: color 0.3s ease;
    }

    #proximos-agendamentos .border-bottom:last-child {
        border-bottom: none !important;
    }

    /* Dark mode animations */
    body.dark-mode .value-changed {
        color: #60a5fa !important;
    }

    body.dark-mode .card:hover .card-title {
        color: #60a5fa !important;
    }
`;
document.head.appendChild(dashboardStyles);

// Inicializar dashboard quando a página estiver carregada
document.addEventListener('DOMContentLoaded', () => {
    if (window.barbeirosApp) {
        window.dashboardManager = new DashboardManager(window.barbeirosApp);
    }
});

// Função global para recarregar dashboard
function refreshDashboard() {
    if (window.dashboardManager) {
        window.dashboardManager.refresh();
    }
}
