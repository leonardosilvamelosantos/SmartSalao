/**
 * Painel Administrativo - JavaScript Principal
 * Funcionalidades principais do dashboard
 */

// ====================
// API CLIENT
// ====================

class AdminAPI {
    constructor() {
        this.baseURL = '/api/admin';
        this.barberId = this.getBarberId();
        this.token = this.getToken();
    }

    getBarberId() {
        const path = window.location.pathname;
        const match = path.match(/\/admin\/(\d+)/);

        // Primeiro tenta obter do path
        if (match && match[1]) {
            const barberId = match[1];
            // Salva no localStorage para futuras requisições
            localStorage.setItem('barberId', barberId);
            return barberId;
        }

        // Se não encontrou no path, tenta do localStorage
        const savedBarberId = localStorage.getItem('barberId');
        if (savedBarberId && savedBarberId !== 'null' && savedBarberId !== 'undefined') {
            return savedBarberId;
        }

        // Se não encontrou nenhum, usa padrão e salva
        const defaultBarberId = '1';
        localStorage.setItem('barberId', defaultBarberId);
        return defaultBarberId;
    }

    getToken() {
        const token = localStorage.getItem('authToken');
        // Verifica se o token existe e não está vazio
        return token && token.trim() !== '' ? token : null;
    }

    async request(endpoint, options = {}) {
        // Verificação rigorosa do token
        if (!this.token || this.token.trim() === '') {
            throw new Error('Token de autenticação não encontrado ou inválido');
        }

        // Garante que barberId seja válido
        if (!this.barberId) {
            this.barberId = this.getBarberId();
        }

        const url = `${this.baseURL}/${this.barberId}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    }

    async getDashboardMetrics() {
        return this.request('/dashboard/metrics');
    }

    // Serviços
    async getServices(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/services${queryString ? '?' + queryString : ''}`);
    }

    async createService(serviceData) {
        return this.request('/services', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    }

    async updateService(serviceId, serviceData) {
        return this.request(`/services/${serviceId}`, {
            method: 'PUT',
            body: JSON.stringify(serviceData)
        });
    }

    async deleteService(serviceId) {
        return this.request(`/services/${serviceId}`, {
            method: 'DELETE'
        });
    }

    // Agendamentos
    async getAppointments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/appointments${queryString ? '?' + queryString : ''}`);
    }

    async getAppointment(appointmentId) {
        return this.request(`/appointments/${appointmentId}`);
    }

    async updateAppointment(appointmentId, data) {
        return this.request(`/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async cancelAppointment(appointmentId, reason = '') {
        return this.request(`/appointments/${appointmentId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    // Clientes
    async getClients(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/clients${queryString ? '?' + queryString : ''}`);
    }

    // Relatórios
    async getFinancialReport(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/financial${queryString ? '?' + queryString : ''}`);
    }

    async getAppointmentsReport(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/reports/appointments${queryString ? '?' + queryString : ''}`);
    }

    // Configurações
    async getSettings() {
        return this.request('/settings');
    }

    async updateSettings(settingsData) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData)
        });
    }

    // Sistema
    async getSystemStatus() {
        return this.request('/system/status');
    }

    async clearCache() {
        return this.request('/system/cache/clear', {
            method: 'POST'
        });
    }
}

// ====================
// DASHBOARD CONTROLLER
// ====================

class DashboardController {
    constructor() {
        this.api = new AdminAPI();
        this.dashboardData = null;
        this.charts = {};
    }

    async initialize() {
        try {
            this.showLoading();

            // Verificação rigorosa de token
            const hasToken = this.checkValidToken();

            // Sempre mostra login se não há token válido
            if (!hasToken) {
                this.showLoginRequired();
                this.hideLoading();
                return;
            }

            try {
                await this.loadDashboard();
                this.setupEventListeners();
                this.hideLoading();
            } catch (dashboardError) {
                console.error('Dashboard load failed:', dashboardError);
                // Se falhar, volta para o login
                this.showLoginRequired();
                this.hideLoading();
            }

        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.showLoginRequired(); // Fallback para login
            this.hideLoading();
        }
    }

    // Método auxiliar para verificar token de forma mais robusta
    checkValidToken() {
        try {
            // Verifica se a API foi inicializada
            if (!this.api) {
                console.log('API not initialized');
                return false;
            }

            // Verifica se há token
            if (!this.api.token) {
                console.log('No token in API');
                return false;
            }

            // Verifica se o token não está vazio
            if (this.api.token.trim() === '') {
                console.log('Token is empty');
                return false;
            }

            // Verifica se o token parece válido (básico JWT check)
            if (!this.api.token.includes('.')) {
                console.log('Token format invalid');
                return false;
            }

            console.log('Token validation passed');
            return true;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    async loadDashboard() {
        try {
            console.log('Loading dashboard data...');

            // Verificação rigorosa antes de fazer requisição
            if (!this.checkValidToken()) {
                throw new Error('Token inválido durante carregamento do dashboard');
            }

            console.log('Token validation passed - making API call');
            this.dashboardData = await this.api.getDashboard();
            console.log('Dashboard data loaded successfully');
            this.renderDashboard();
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            console.error('Load dashboard error details:', error.message);
            throw error; // Re-throw para que seja capturado no initialize
        }
    }

    renderDashboard() {
        if (!this.dashboardData?.data) return;

        const { metrics, today_stats, recent_appointments } = this.dashboardData.data;

        this.renderMetrics(metrics);
        this.renderTodayStats(today_stats);
        this.renderRecentAppointments(recent_appointments);
        this.renderCharts(metrics);
    }

    renderMetrics(metrics) {
        const metricsGrid = document.getElementById('metricsGrid');
        if (!metricsGrid) return;

        metricsGrid.innerHTML = '';

        const metricsList = [
            {
                title: 'Agendamentos Hoje',
                value: metrics.today_appointments || 0,
                icon: 'fas fa-calendar-day',
                color: 'primary',
                trend: metrics.today_trend
            },
            {
                title: 'Receita Total',
                value: `R$ ${(metrics.total_revenue || 0).toFixed(2)}`,
                icon: 'fas fa-dollar-sign',
                color: 'success',
                trend: metrics.revenue_trend
            },
            {
                title: 'Clientes Ativos',
                value: metrics.total_clients || 0,
                icon: 'fas fa-users',
                color: 'info'
            },
            {
                title: 'Taxa de Conclusão',
                value: `${((metrics.completed_appointments || 0) /
                    Math.max(metrics.total_appointments || 1, 1) * 100).toFixed(1)}%`,
                icon: 'fas fa-check-circle',
                color: 'warning'
            }
        ];

        metricsList.forEach(metric => {
            const metricCard = document.createElement('div');
            metricCard.className = 'card metric-card fade-in';
            metricCard.innerHTML = `
                <div class="card-body text-center">
                    <i class="fas ${metric.icon} fa-2x mb-3"></i>
                    <div class="metric-value">${metric.value}</div>
                    <div class="metric-label">${metric.title}</div>
                    ${metric.trend ? `<div class="metric-trend ${metric.trend > 0 ? 'positive' : 'negative'}">
                        ${metric.trend > 0 ? '↗' : '↘'} ${Math.abs(metric.trend)}%
                    </div>` : ''}
                </div>
            `;
            metricsGrid.appendChild(metricCard);
        });
    }

    renderTodayStats(todayStats) {
        if (!todayStats || todayStats.total_appointments === 0) return;

        const todayCard = document.createElement('div');
        todayCard.className = 'card fade-in';
        todayCard.innerHTML = `
            <div class="card-header">
                <h6 class="mb-0"><i class="fas fa-calendar-day me-2"></i>Hoje</h6>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-3">
                        <div class="h4 mb-1">${todayStats.total_appointments || 0}</div>
                        <small class="text-muted">Total</small>
                    </div>
                    <div class="col-3">
                        <div class="h4 mb-1 text-success">${todayStats.confirmed || 0}</div>
                        <small class="text-muted">Confirmados</small>
                    </div>
                    <div class="col-3">
                        <div class="h4 mb-1 text-warning">${todayStats.pending || 0}</div>
                        <small class="text-muted">Pendentes</small>
                    </div>
                    <div class="col-3">
                        <div class="h4 mb-1 text-info">${todayStats.completed || 0}</div>
                        <small class="text-muted">Concluídos</small>
                    </div>
                </div>
                ${todayStats.revenue ? `
                    <hr>
                    <div class="text-center">
                        <div class="h5 text-success">R$ ${todayStats.revenue.toFixed(2)}</div>
                        <small class="text-muted">Receita Hoje</small>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('metricsGrid').appendChild(todayCard);
    }

    renderRecentAppointments(appointments) {
        const tbody = document.querySelector('#recentAppointmentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!appointments || appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nenhum agendamento recente</td></tr>';
            return;
        }

        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            row.className = 'fade-in';

            const appointmentDate = new Date(appointment.start_time);
            const isToday = appointmentDate.toDateString() === new Date().toDateString();
            const timeString = appointmentDate.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            row.innerHTML = `
                <td>
                    <div class="fw-bold">${appointment.client}</div>
                    <small class="text-muted">${appointment.phone}</small>
                </td>
                <td>
                    <div>${appointment.service}</div>
                    <small class="text-muted">${appointment.duration}min</small>
                </td>
                <td>
                    <div>${timeString}</div>
                    ${isToday ? '<small class="badge bg-success">Hoje</small>' : ''}
                </td>
                <td>
                    <span class="status-badge status-${appointment.status}">
                        ${this.formatStatus(appointment.status)}
                    </span>
                </td>
                <td class="fw-bold text-success">
                    R$ ${appointment.value.toFixed(2)}
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewAppointment(${appointment.id})" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="dashboard.editAppointment(${appointment.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${appointment.status !== 'cancelled' && appointment.status !== 'completed' ?
                            `<button class="btn btn-sm btn-outline-danger" onclick="dashboard.cancelAppointment(${appointment.id})" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>` : ''
                        }
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    formatStatus(status) {
        const statusMap = {
            'confirmed': 'Confirmado',
            'pending': 'Pendente',
            'cancelled': 'Cancelado',
            'completed': 'Concluído'
        };
        return statusMap[status] || status;
    }

    renderCharts(metrics) {
        this.renderAppointmentsChart(metrics);
        this.renderStatusChart(metrics);
    }

    renderAppointmentsChart(metrics) {
        const ctx = document.getElementById('appointmentsChart');
        if (!ctx) return;

        // Dados mockados para os últimos 7 dias
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
            data.push(Math.floor(Math.random() * 20) + 5);
        }

        if (this.charts.appointments) {
            this.charts.appointments.destroy();
        }

        this.charts.appointments = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Agendamentos',
                    data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5
                        }
                    }
                }
            }
        });
    }

    renderStatusChart(metrics) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        if (this.charts.status) {
            this.charts.status.destroy();
        }

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmados', 'Concluídos', 'Cancelados', 'Pendentes'],
                datasets: [{
                    data: [
                        metrics.confirmed_appointments || 0,
                        metrics.completed_appointments || 0,
                        metrics.cancelled_appointments || 0,
                        metrics.pending_appointments || 0
                    ],
                    backgroundColor: [
                        '#10b981',
                        '#6366f1',
                        '#ef4444',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Botão de refresh
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Auto refresh a cada 5 minutos
        setInterval(() => this.refreshDashboard(), 5 * 60 * 1000);
    }

    async refreshDashboard() {
        try {
            this.showLoading();
            await this.loadDashboard();
            this.showSuccess('Dashboard atualizado');
        } catch (error) {
            this.showError('Erro ao atualizar dashboard');
        } finally {
            this.hideLoading();
        }
    }

    // Ações dos agendamentos
    async viewAppointment(appointmentId) {
        try {
            const response = await this.api.getAppointment(appointmentId);
            this.showAppointmentModal(response.data.appointment);
        } catch (error) {
            this.showError('Erro ao carregar agendamento');
        }
    }

    async editAppointment(appointmentId) {
        // Implementar edição de agendamento
        console.log('Editar agendamento:', appointmentId);
    }

    async cancelAppointment(appointmentId) {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
            return;
        }

        try {
            this.showLoading();
            const reason = prompt('Motivo do cancelamento (opcional):');
            await this.api.cancelAppointment(appointmentId, reason);

            this.showSuccess('Agendamento cancelado com sucesso');
            await this.loadDashboard();

        } catch (error) {
            this.showError('Erro ao cancelar agendamento');
        } finally {
            this.hideLoading();
        }
    }

    // Modais
    showAppointmentModal(appointment) {
        // Implementar modal de detalhes do agendamento
        console.log('Mostrar detalhes:', appointment);
    }

    // Utilitários de UI
    showLoading() {
        let loading = document.getElementById('loadingOverlay');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loadingOverlay';
            loading.className = 'loading-overlay';
            loading.innerHTML = `
                <div class="text-center">
                    <div class="loading-spinner mb-3"></div>
                    <div class="h5 text-primary">Carregando...</div>
                </div>
            `;
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showLoginRequired() {
        // Substitui o conteúdo do dashboard por uma mensagem de login
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="mb-4">
                        <i class="fas fa-lock fa-4x text-warning mb-3"></i>
                        <h3 class="text-muted">Autenticação Necessária</h3>
                        <p class="text-muted">Você precisa fazer login para acessar o painel administrativo.</p>
                    </div>

                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card shadow-sm">
                                <div class="card-body p-4">
                                    <h5 class="card-title mb-3">Fazer Login</h5>
                                    <form id="loginForm" class="text-start">
                                        <div class="mb-3">
                                            <label for="email" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="email" placeholder="admin@exemplo.com" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="password" class="form-label">Senha</label>
                                            <input type="password" class="form-control" id="password" required>
                                        </div>
                                        <div class="d-grid">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-sign-in-alt me-2"></i>Entrar
                                            </button>
                                        </div>
                                    </form>
                                    <div id="loginMessage" class="mt-3" style="display: none;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Use suas credenciais de administrador para acessar o sistema.
                        </small>
                    </div>
                </div>
            `;

            // Adiciona event listener para o formulário de login
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await window.dashboard.handleLogin();
                });
            }
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginMessage = document.getElementById('loginMessage');

        if (!email || !password) {
            this.showLoginError('Preencha todos os campos');
            return;
        }

        try {
            this.showLoading();

            // Faz requisição de login para a API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Salva o token corretamente da estrutura da API
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));

                // Salva o barberId se disponível no usuário
                if (data.data.user && data.data.user.id) {
                    localStorage.setItem('barberId', data.data.user.id.toString());
                }

                // Atualiza o nome do usuário na navbar
                const userNameElement = document.getElementById('userName');
                if (userNameElement && data.data.user) {
                    userNameElement.textContent = data.data.user.name || data.data.user.email || 'Usuário';
                }

                // Recarrega a página para inicializar com token
                window.location.reload();
            } else {
                this.showLoginError(data.message || 'Erro ao fazer login');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            this.showLoginError('Erro de conexão. Tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    showLoginError(message) {
        const loginMessage = document.getElementById('loginMessage');
        if (loginMessage) {
            loginMessage.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            loginMessage.style.display = 'block';
        }
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// ====================
// INICIALIZAÇÃO
// ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - starting dashboard initialization');

    // Cria instância do controller
    window.dashboard = new DashboardController();

    // Pequeno delay para garantir que tudo esteja pronto
    setTimeout(() => {
        window.dashboard.initialize();
    }, 100);
});

// ====================
// FUNÇÕES GLOBAIS
// ====================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('barberId');
        localStorage.removeItem('user');
        // Redireciona para o admin que vai mostrar o formulário de login
        window.location.href = '/admin';
    }
}

// Funções de navegação (placeholders para futuras implementações)
function showServices() {
    // Implementar navegação para serviços
    console.log('Navegar para serviços');
}

function showAppointments() {
    // Implementar navegação para agendamentos
    console.log('Navegar para agendamentos');
}

function showClients() {
    // Implementar navegação para clientes
    console.log('Navegar para clientes');
}

function showReports() {
    // Implementar navegação para relatórios
    console.log('Navegar para relatórios');
}

function showSettings() {
    // Implementar navegação para configurações
    console.log('Navegar para configurações');
}

function showSystemStatus() {
    // Implementar navegação para status do sistema
    console.log('Navegar para status do sistema');
}
