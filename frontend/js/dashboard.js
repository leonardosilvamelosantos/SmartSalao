// Dashboard - Sistema Barbeiros

class DashboardManager {
    constructor(app) {
        this.app = app;
        this.chart = null;
        this.agendamentos = [];
        this.autoRefreshInterval = null;
        this.refreshInterval = 60000; // 60 segundos (reduzido de 30s)
        this.lastMetricsUpdate = 0;
        this.lastAgendamentosUpdate = 0;
        this.metricsUpdateDebounce = 5000; // 5 segundos (aumentado de 2s)
        this.agendamentosUpdateDebounce = 3000; // 3 segundos
        this.isInitialized = false;
        this.lastAgendamentosData = null; // Cache dos dados
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.setupRealTimeUpdates();
        this.initChart();
        this.setupEventListeners();
        this.addButtonFeedback();
        this.startAutoRefresh();
    }

    // Inicializar gráfico
    async initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        // Dados reais da API
        const data = await this.getChartData();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Agendamentos',
                    data: data.agendamentos,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
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
    async getChartData() {
        try {
            const response = await this.app.apiRequest('/api/dashboard/grafico?periodo=7d');
            
            if (response.success && response.data) {
                return {
                    labels: response.data.labels,
                    agendamentos: response.data.agendamentos,
                    receita: response.data.receitas
                };
            }
        } catch (error) {
            console.error('Erro ao carregar dados do gráfico:', error);
        }

        // Dados de fallback
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        return {
            labels: days,
            agendamentos: [0, 0, 0, 0, 0, 0, 0],
            receita: [0, 0, 0, 0, 0, 0, 0]
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

        // Mobile menu functionality
        this.setupMobileMenu();
    }

    // Configurar menu mobile
    setupMobileMenu() {
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const overlay = document.getElementById('sidebarOverlay');

        if (mobileToggle && sidebarCollapse) {
            // Usar Bootstrap collapse events
            sidebarCollapse.addEventListener('show.bs.collapse', () => {
                this.showMobileSidebar();
            });

            sidebarCollapse.addEventListener('hide.bs.collapse', () => {
                this.hideMobileSidebar();
            });
        }

        // Fechar sidebar ao clicar no overlay
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Fechar sidebar ao redimensionar para desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 769) {
                this.closeMobileSidebar();
            }
        });
    }

    // Mostrar sidebar mobile
    showMobileSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }

    // Esconder sidebar mobile
    hideMobileSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    // Fechar sidebar mobile
    closeMobileSidebar() {
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const overlay = document.getElementById('sidebarOverlay');
        
        // Fechar collapse do Bootstrap
        if (sidebarCollapse) {
            const bsCollapse = new bootstrap.Collapse(sidebarCollapse, {
                toggle: false
            });
            bsCollapse.hide();
        }
        
        // Remover overlay
        if (overlay) {
            overlay.classList.remove('show');
        }
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
            // Mostrar loading states
            this.showLoadingStates();

            // Só carregar métricas na primeira vez
            if (!this.isInitialized) {
                // console.log('🚀 Primeira inicialização do dashboard...'); // Otimizado - log removido
                await this.loadMetrics(true); // Forçar na primeira vez
                this.isInitialized = true;
                
                // Mostrar notificação de sucesso
                if (window.toastSystem) {
                    window.toastSystem.success('Dashboard carregado com sucesso!');
                }
            } else {
                console.log('🔄 Dashboard já inicializado, pulando métricas...');
            }

            // Carregar próximos agendamentos
            await this.loadProximosAgendamentos();

            // Carregar gráfico de tendências (se houver dados suficientes)
            await this.loadTrendsChart();

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.showOfflineMode();
            
            // Mostrar notificação de erro
            if (window.toastSystem) {
                window.toastSystem.error('Erro ao carregar dados do dashboard');
            }
        } finally {
            // Esconder loading states
            this.hideLoadingStates();
        }
    }

    // Carregar métricas principais
    async loadMetrics(force = false) {
        const now = Date.now();
        
        // Debounce: evitar muitas atualizações em pouco tempo
        if (!force && now - this.lastMetricsUpdate < this.metricsUpdateDebounce) {
            console.log('⏳ Métricas em debounce, ignorando atualização');
            return;
        }
        
        this.lastMetricsUpdate = now;
        
        try {
            // console.log('📊 Carregando métricas do dashboard...'); // Otimizado - log removido
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
            'receita-hoje': `R$ ${(data.receitaHoje || data.revenue_today || 0).toFixed(2).replace('.', ',')}`,
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

        // Atualizar percentuais se disponíveis
        if (data.percentuais) {
            this.updatePercentuais(data.percentuais);
        }
    }

    // Atualizar percentuais de crescimento
    updatePercentuais(percentuais) {
        const percentualElements = {
            'agendamentos-percentual': percentuais.agendamentos,
            'receita-percentual': percentuais.receita,
            'clientes-percentual': percentuais.clientes,
            'concluidos-percentual': percentuais.concluidos
        };

        Object.entries(percentualElements).forEach(([id, percentual]) => {
            const element = document.getElementById(id);
            if (element) {
                const isPositive = percentual >= 0;
                const icon = isPositive ? 'bi-arrow-up' : 'bi-arrow-down';
                const colorClass = isPositive ? 'success' : 'danger';
                
                element.innerHTML = `
                    <i class="bi ${icon} me-1"></i>${Math.abs(percentual)}%
                `;
                
                // Atualizar classes do badge
                element.className = `badge bg-${colorClass}-100 text-${colorClass}-600`;
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
            console.log('🔄 Dashboard: Carregando próximos agendamentos...');
            // Mostrar loading
            this.showAgendamentosLoading();

            const response = await this.app.apiRequest('/api/agendamentos?status=confirmed&limit=5&sort=start_at');
            console.log('📡 Dashboard: Resposta da API:', response);

            if (response.success && response.data && response.data.length > 0) {
                console.log('✅ Dashboard: Dados recebidos:', response.data.length, 'agendamentos');
                this.renderProximosAgendamentos(response.data);
            } else {
                console.log('⚠️ Dashboard: Nenhum agendamento encontrado ou dados inválidos');
                this.renderEmptyAgendamentos();
            }
        } catch (error) {
            console.error('❌ Dashboard: Erro ao carregar próximos agendamentos:', error);
            this.renderEmptyAgendamentos();
        }
    }

    // Mostrar loading states
    showLoadingStates() {
        const metricElements = ['agendamentos-hoje', 'receita-hoje', 'clientes-ativos', 'agendamentos-concluidos'];
        metricElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const skeleton = element.querySelector('.skeleton');
                const valueText = element.querySelector('.value-text');
                if (skeleton && valueText) {
                    skeleton.style.display = 'block';
                    valueText.style.display = 'none';
                }
            }
        });
    }

    // Esconder loading states
    hideLoadingStates() {
        const metricElements = ['agendamentos-hoje', 'receita-hoje', 'clientes-ativos', 'agendamentos-concluidos'];
        metricElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const skeleton = element.querySelector('.skeleton');
                const valueText = element.querySelector('.value-text');
                if (skeleton && valueText) {
                    skeleton.style.display = 'none';
                    valueText.style.display = 'block';
                }
            }
        });
    }

    // Mostrar loading dos agendamentos
    showAgendamentosLoading() {
        const loading = document.getElementById('agendamentos-loading');
        const empty = document.getElementById('agendamentos-empty');
        const list = document.getElementById('agendamentos-list');
        
        if (loading) loading.style.display = 'block';
        if (empty) empty.style.display = 'none';
        if (list) list.style.display = 'none';
    }

    // Renderizar próximos agendamentos com separação Hoje/Próximos
    renderProximosAgendamentos(agendamentos) {
        console.log('🎨 Dashboard: Renderizando agendamentos:', agendamentos);
        
        const loading = document.getElementById('agendamentos-loading');
        const empty = document.getElementById('agendamentos-empty');
        const list = document.getElementById('agendamentos-list');

        // Esconder loading e empty states
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (list) list.style.display = 'block';

        if (!agendamentos || agendamentos.length === 0) {
            console.log('⚠️ Dashboard: Nenhum agendamento para renderizar');
            this.renderEmptyAgendamentos();
            return;
        }

        // Separar agendamentos por data
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const agendamentosHoje = [];
        const agendamentosProximos = [];

        console.log('📅 Dashboard: Separando agendamentos por data...');
        console.log('📅 Dashboard: Data de hoje:', hoje.toISOString().split('T')[0]);

        agendamentos.forEach(agendamento => {
            const dataAgendamento = new Date(agendamento.start_at);
            
            // Comparar apenas a data (sem hora) - método mais simples e confiável
            const dataAgendamentoStr = dataAgendamento.toISOString().split('T')[0];
            const hojeStr = hoje.toISOString().split('T')[0];

            console.log('📅 Dashboard: Agendamento:', agendamento.cliente_nome, 'Data:', dataAgendamentoStr, 'Hoje:', hojeStr);

            if (dataAgendamentoStr === hojeStr) {
                agendamentosHoje.push(agendamento);
                console.log('✅ Dashboard: Agendamento de hoje:', agendamento.cliente_nome);
            } else {
                agendamentosProximos.push(agendamento);
                console.log('📅 Dashboard: Agendamento futuro:', agendamento.cliente_nome);
            }
        });

        console.log('📊 Dashboard: Resultado da separação - Hoje:', agendamentosHoje.length, 'Próximos:', agendamentosProximos.length);

        // Renderizar seção "Hoje"
        this.renderSecaoAgendamentos('agendamentos-hoje-list', agendamentosHoje, 'hoje-count');
        
        // Renderizar seção "Próximos"
        this.renderSecaoAgendamentos('agendamentos-proximos-list', agendamentosProximos, 'proximos-count');

        // Esconder seções vazias
        this.ajustarVisibilidadeSecoes(agendamentosHoje.length, agendamentosProximos.length);
    }

    // Renderizar uma seção específica de agendamentos
    renderSecaoAgendamentos(containerId, agendamentos, countId) {
        const container = document.getElementById(containerId);
        const countElement = document.getElementById(countId);

        // console.log(`🎨 Renderizando seção ${containerId} com ${agendamentos.length} agendamentos`); // Otimizado - log removido

        if (!container) {
            console.error(`❌ Container ${containerId} não encontrado`);
            return;
        }

        // Atualizar contador
        if (countElement) {
            countElement.textContent = agendamentos.length;
            // console.log(`📊 Contador ${countId} atualizado para: ${agendamentos.length}`); // Otimizado - log removido
        }

        if (agendamentos.length === 0) {
            const mensagem = containerId.includes('hoje') ? 
                '<p class="text-muted small"><i class="bi bi-calendar-day me-1"></i>Nenhum agendamento para hoje</p>' :
                '<p class="text-muted small"><i class="bi bi-calendar-week me-1"></i>Nenhum agendamento futuro</p>';
            container.innerHTML = mensagem;
            // console.log(`📝 Seção ${containerId} vazia - mostrando mensagem`); // Otimizado - log removido
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
                <div class="appointment-card">
                    <div class="appointment-card-header">
                        <div class="appointment-client-info">
                            <div class="appointment-avatar">
                                <i class="bi bi-person-circle"></i>
                            </div>
                            <div class="appointment-details">
                                <h6 class="appointment-client-name">${agendamento.cliente_nome || 'Cliente'}</h6>
                                <p class="appointment-service">${agendamento.nome_servico || 'Serviço'}</p>
                            </div>
                        </div>
                        <div class="appointment-top-right">
                            <div class="appointment-time">
                                <i class="bi bi-clock"></i>
                                <span>${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                            <span class="status-badge ${badgeClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="appointment-card-actions">
                        <button class="action-btn-large complete-btn" title="Concluir" onclick="concluirAgendamento(${agendamento.id_agendamento || agendamento.id})">
                            <i class="bi bi-check-circle"></i>
                            <span>Concluir</span>
                        </button>
                        <button class="action-btn-large edit-btn" title="Editar" onclick="editarAgendamento(${agendamento.id_agendamento || agendamento.id})">
                            <i class="bi bi-pencil"></i>
                            <span>Editar</span>
                        </button>
                        <button class="action-btn-large cancel-btn" title="Cancelar" onclick="cancelarAgendamento(${agendamento.id_agendamento || agendamento.id})">
                            <i class="bi bi-x-circle"></i>
                            <span>Cancelar</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // Ajustar visibilidade das seções
    ajustarVisibilidadeSecoes(hojeCount, proximosCount) {
        const secaoHoje = document.getElementById('secao-agendamentos-hoje');
        const secaoProximos = document.getElementById('agendamentos-proximos');

        // console.log('👁️ Ajustando visibilidade - Hoje:', hojeCount, 'Próximos:', proximosCount); // Otimizado - log removido

        // Sempre mostrar as seções, mas com conteúdo apropriado
        if (secaoHoje) {
            secaoHoje.style.display = 'block';
            // console.log('✅ Seção HOJE sempre visível'); // Otimizado - log removido
        }

        if (secaoProximos) {
            secaoProximos.style.display = 'block';
            // console.log('✅ Seção PRÓXIMOS sempre visível'); // Otimizado - log removido
        }
    }

    // Renderizar estado vazio
    renderEmptyAgendamentos() {
        const loading = document.getElementById('agendamentos-loading');
        const empty = document.getElementById('agendamentos-empty');
        const list = document.getElementById('agendamentos-list');

        // Esconder loading e list
        if (loading) loading.style.display = 'none';
        if (list) list.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }

    // Carregar gráfico de tendências
    async loadTrendsChart() {
        // Implementar gráfico com Chart.js se disponível
        // Por enquanto, mostrar apenas informações textuais
        // console.log('Gráfico de tendências - TODO'); // Otimizado - log removido
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

    // Adicionar micro-feedback aos botões
    addButtonFeedback() {
        // Botões de ação rápida
        const buttons = ['btn-novo-agendamento', 'btn-novo-cliente', 'btn-novo-servico'];
        
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', (e) => {
                    this.setButtonLoading(button, true);
                    
                    // Simular delay para mostrar feedback
                    setTimeout(() => {
                        this.setButtonLoading(button, false);
                    }, 1000);
                });
            }
        });
    }

    // Definir estado de loading do botão
    setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Iniciar atualização automática
    startAutoRefresh() {
        // console.log('🔄 Iniciando atualização automática do dashboard...'); // Otimizado - log removido
        
        // Limpar intervalo anterior se existir
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        // Configurar intervalo de atualização (apenas agendamentos, não métricas)
        this.autoRefreshInterval = setInterval(() => {
            console.log('🔄 Atualizando agendamentos automaticamente...');
            this.refreshAgendamentos(false); // Não forçar, respeitar debounce
        }, this.refreshInterval);

        // Atualizar quando a página ganha foco (com debounce)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 Página ganhou foco, verificando se precisa atualizar...');
                // Só atualizar se passou tempo suficiente
                const now = Date.now();
                if (now - this.lastAgendamentosUpdate > this.agendamentosUpdateDebounce) {
                    this.refreshAgendamentos(false);
                } else {
                    console.log('⏳ Página ganhou foco mas agendamentos ainda em debounce');
                }
            }
        });
    }

    // Parar atualização automática
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('⏹️ Atualização automática parada');
        }
    }

    // Atualizar apenas os agendamentos
    async refreshAgendamentos(force = false) {
        const now = Date.now();
        
        // Debounce: evitar muitas atualizações em pouco tempo
        if (!force && now - this.lastAgendamentosUpdate < this.agendamentosUpdateDebounce) {
            console.log('⏳ Agendamentos em debounce, ignorando atualização');
            return;
        }
        
        this.lastAgendamentosUpdate = now;
        
        try {
            console.log('🔄 Atualizando agendamentos...');
            
            // Buscar agendamentos confirmados
            const response = await this.app.apiRequest('/api/agendamentos?status=confirmed&limit=3&sort=start_at');
            
            if (response.success && response.data) {
                // Verificar se os dados mudaram
                const dataChanged = JSON.stringify(response.data) !== JSON.stringify(this.lastAgendamentosData);
                
                if (dataChanged || force) {
                    this.agendamentos = response.data;
                    this.lastAgendamentosData = JSON.parse(JSON.stringify(response.data)); // Deep copy
                    this.renderProximosAgendamentos(this.agendamentos);
                    console.log('✅ Agendamentos atualizados:', this.agendamentos.length);
                } else {
                    console.log('📋 Dados dos agendamentos não mudaram, pulando renderização');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar agendamentos:', error);
        }
    }

    // Atualizar apenas os próximos agendamentos (chamado quando novo agendamento é criado)
    async updateProximosAgendamentos(force = true) {
        // Para criação de agendamentos, sempre forçar atualização
        await this.refreshAgendamentos(force);
    }

    // Destruir o dashboard (limpar intervalos)
    destroy() {
        this.stopAutoRefresh();
        if (this.chart) {
            this.chart.destroy();
        }
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
    console.log('🔄 Dashboard.js: DOMContentLoaded - Inicializando dashboardManager...');
    
    // Função para criar dashboardManager
    const createDashboardManager = () => {
        if (window.barbeirosApp) {
            console.log('✅ Dashboard.js: barbeirosApp disponível, criando dashboardManager');
            window.dashboardManager = new DashboardManager(window.barbeirosApp);
            console.log('✅ Dashboard.js: dashboardManager criado:', !!window.dashboardManager);
            
            // Disparar evento para notificar que dashboardManager está pronto
            window.dispatchEvent(new CustomEvent('dashboardManager:ready', {
                detail: { dashboardManager: window.dashboardManager }
            }));
        } else {
            console.warn('⚠️ Dashboard.js: barbeirosApp não está disponível ainda');
        }
    };
    
    // Tentar criar imediatamente
    createDashboardManager();
    
    // Se não conseguiu, tentar novamente após um delay
    if (!window.dashboardManager) {
        setTimeout(createDashboardManager, 100);
    }
});

// Função global para recarregar dashboard
function refreshDashboard() {
    if (window.dashboardManager) {
        window.dashboardManager.refresh();
    }
}

// Função global para fechar sidebar mobile - REMOVIDA (conflito com main.js)
// function closeMobileSidebar() {
//     if (window.dashboardManager) {
//         window.dashboardManager.closeMobileSidebar();
//     }
// }

