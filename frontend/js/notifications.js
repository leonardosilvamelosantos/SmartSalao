/**
 * Sistema de Notificações e Avisos Importantes
 * Gerencia avisos dinâmicos no dashboard
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.getElementById('avisos-list');
        if (!this.container) {
            console.warn('Container de avisos não encontrado');
            return;
        }

        // Verificar se usuário está autenticado antes de carregar
        const token = localStorage.getItem('barbeiros-token');
        if (token) {
            // Carregar avisos iniciais apenas se autenticado
            this.loadInitialNotifications();
            
            // Atualizar avisos a cada 30 segundos
            setInterval(() => {
                this.updateNotifications();
            }, 30000);

            // Atualizar avisos quando a página for focada
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.updateNotifications();
                }
            });
        } else {
            // Se não estiver autenticado, mostrar apenas avisos estáticos
            this.loadStaticNotifications();
        }
    }

    loadInitialNotifications() {
        // Avisos estáticos iniciais
        this.addNotification({
            id: 'horario-funcionamento',
            type: 'info',
            title: 'Horário de Funcionamento',
            message: this.getHorarioFuncionamento(),
            icon: 'bi-clock',
            persistent: true
        });

        this.addNotification({
            id: 'meta-dia',
            type: 'success',
            title: 'Meta do Dia',
            message: this.getMetaDia(),
            icon: 'bi-target',
            persistent: true
        });

        // Avisos dinâmicos
        this.updateNotifications();
    }

    loadStaticNotifications() {
        // Apenas avisos estáticos quando não autenticado
        this.addNotification({
            id: 'horario-funcionamento',
            type: 'info',
            title: 'Horário de Funcionamento',
            message: this.getHorarioFuncionamento(),
            icon: 'bi-clock',
            persistent: true
        });

        this.addNotification({
            id: 'meta-dia',
            type: 'success',
            title: 'Meta do Dia',
            message: this.getMetaDia(),
            icon: 'bi-target',
            persistent: true
        });

        this.render();
    }

    async updateNotifications() {
        try {
            // Mostrar loading
            this.showLoadingState();

            // Buscar agendamentos próximos
            const agendamentos = await this.getProximosAgendamentos();
            
            // Buscar clientes VIP
            const clientesVIP = await this.getClientesVIP();
            
            // Buscar avisos do sistema
            const avisosSistema = await this.getAvisosSistema();

            // Limpar avisos dinâmicos (manter persistentes)
            this.clearDynamicNotifications();

            // Adicionar avisos dinâmicos
            this.addProximosAgendamentos(agendamentos);
            this.addClientesVIP(clientesVIP);
            this.addAvisosSistema(avisosSistema);

            this.render();
            
            // Mostrar notificação de sucesso se houver atualizações
            if (window.toastSystem && (agendamentos.length > 0 || clientesVIP.length > 0 || avisosSistema.length > 0)) {
                window.toastSystem.info('Notificações atualizadas');
            }
        } catch (error) {
            console.error('Erro ao atualizar notificações:', error);
            
            // Mostrar notificação de erro
            if (window.toastSystem) {
                window.toastSystem.error('Erro ao atualizar notificações');
            }
            
            // Em caso de erro, mostrar notificações existentes
            this.render();
        }
    }

    async getProximosAgendamentos() {
        try {
            const token = localStorage.getItem('barbeiros-token');
            if (!token) {
                console.log('Token não encontrado, pulando busca de agendamentos');
                return [];
            }

            const response = await fetch('/api/agendamentos?status=confirmed&limit=3&sort=start_at', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Erro ao buscar agendamentos');
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return [];
        }
    }

    async getClientesVIP() {
        try {
            const token = localStorage.getItem('barbeiros-token');
            if (!token) {
                console.log('Token não encontrado, pulando busca de clientes VIP');
                return [];
            }

            const response = await fetch('/api/clientes?limit=5', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Erro ao buscar clientes');
            const result = await response.json();
            const clientes = result.success ? result.data : [];
            return clientes.filter(cliente => this.isClienteVIP(cliente));
        } catch (error) {
            console.error('Erro ao buscar clientes VIP:', error);
            return [];
        }
    }

    async getAvisosSistema() {
        // Simular avisos do sistema (em produção, viria de uma API)
        const avisos = [];
        
        // Verificar se há agendamentos em atraso
        const agendamentosAtraso = await this.getAgendamentosAtraso();
        if (agendamentosAtraso.length > 0) {
            avisos.push({
                id: 'agendamentos-atraso',
                type: 'warning',
                title: 'Agendamentos em Atraso',
                message: `${agendamentosAtraso.length} agendamento(s) em atraso`,
                icon: 'bi-exclamation-triangle',
                action: 'Ver Agenda'
            });
        }

        // Verificar se há clientes sem WhatsApp
        const clientesSemWhatsApp = await this.getClientesSemWhatsApp();
        if (clientesSemWhatsApp.length > 0) {
            avisos.push({
                id: 'clientes-sem-whatsapp',
                type: 'info',
                title: 'Clientes sem WhatsApp',
                message: `${clientesSemWhatsApp.length} cliente(s) sem WhatsApp cadastrado`,
                icon: 'bi-whatsapp',
                action: 'Gerenciar Clientes'
            });
        }

        return avisos;
    }

    async getAgendamentosAtraso() {
        try {
            const token = localStorage.getItem('barbeiros-token');
            if (!token) {
                console.log('Token não encontrado, pulando busca de agendamentos em atraso');
                return [];
            }

            const now = new Date();
            const response = await fetch(`/api/agendamentos?status=confirmed&start_at_lt=${now.toISOString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Erro ao buscar agendamentos em atraso');
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Erro ao buscar agendamentos em atraso:', error);
            return [];
        }
    }

    async getClientesSemWhatsApp() {
        try {
            const token = localStorage.getItem('barbeiros-token');
            if (!token) {
                console.log('Token não encontrado, pulando busca de clientes sem WhatsApp');
                return [];
            }

            const response = await fetch('/api/clientes', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Erro ao buscar clientes');
            const result = await response.json();
            const clientes = result.success ? result.data : [];
            return clientes.filter(cliente => !cliente.whatsapp || cliente.whatsapp.trim() === '');
        } catch (error) {
            console.error('Erro ao buscar clientes sem WhatsApp:', error);
            return [];
        }
    }

    isClienteVIP(cliente) {
        // Lógica para determinar se um cliente é VIP
        // Por exemplo: muitos agendamentos, valor alto, etc.
        return cliente.agendamentos_count > 10 || cliente.total_gasto > 500;
    }

    addProximosAgendamentos(agendamentos) {
        if (!Array.isArray(agendamentos) || agendamentos.length === 0) return;

        agendamentos.slice(0, 2).forEach((agendamento, index) => {
            const data = new Date(agendamento.start_at);
            const hora = data.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            this.addNotification({
                id: `agendamento-${agendamento.id}`,
                type: 'info',
                title: `Próximo Agendamento`,
                message: `${agendamento.cliente_nome} - ${hora}`,
                icon: 'bi-calendar-check',
                action: 'Ver Agenda'
            });
        });
    }

    addClientesVIP(clientesVIP) {
        if (!Array.isArray(clientesVIP) || clientesVIP.length === 0) return;

        clientesVIP.slice(0, 1).forEach(cliente => {
            this.addNotification({
                id: `cliente-vip-${cliente.id}`,
                type: 'warning',
                title: 'Cliente VIP',
                message: `${cliente.nome} - Atendimento especial`,
                icon: 'bi-star-fill',
                action: 'Ver Cliente'
            });
        });
    }

    addAvisosSistema(avisos) {
        if (!Array.isArray(avisos)) return;
        avisos.forEach(aviso => {
            this.addNotification(aviso);
        });
    }

    addNotification(notification) {
        // Verificar se já existe
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        if (existingIndex >= 0) {
            this.notifications[existingIndex] = notification;
        } else {
            this.notifications.push(notification);
        }
    }

    clearDynamicNotifications() {
        this.notifications = this.notifications.filter(n => n.persistent);
    }

    getHorarioFuncionamento() {
        const now = new Date();
        const horaAtual = now.getHours();
        const minutoAtual = now.getMinutes();
        const horaFechamento = 18;
        const minutoFechamento = 0;

        const minutosRestantes = (horaFechamento * 60 + minutoFechamento) - (horaAtual * 60 + minutoAtual);
        
        if (minutosRestantes <= 0) {
            return 'Barbearia fechada';
        } else if (minutosRestantes <= 60) {
            return `Fechamento em ${minutosRestantes} min`;
        } else {
            const horas = Math.floor(minutosRestantes / 60);
            const minutos = minutosRestantes % 60;
            return `Fechamento em ${horas}h ${minutos}min`;
        }
    }

    getMetaDia() {
        // Simular cálculo da meta do dia
        const meta = 100; // Meta de 100% (exemplo)
        const atual = Math.floor(Math.random() * 120); // Simular progresso
        const percentual = Math.min((atual / meta) * 100, 100);
        
        return `${Math.round(percentual)}% alcançado`;
    }

    render() {
        if (!this.container) return;

        // Esconder loading
        const loadingEl = document.getElementById('avisos-loading');
        if (loadingEl) loadingEl.style.display = 'none';

        // Verificar se há notificações
        if (this.notifications.length === 0) {
            this.showEmptyState();
            return;
        }

        // Esconder empty state
        const emptyEl = document.getElementById('avisos-empty');
        if (emptyEl) emptyEl.style.display = 'none';

        // Ordenar notificações por prioridade
        const sortedNotifications = this.notifications.sort((a, b) => {
            const priority = { warning: 3, info: 2, success: 1 };
            return (priority[b.type] || 0) - (priority[a.type] || 0);
        });

        this.container.innerHTML = sortedNotifications.map(notification => 
            this.renderNotification(notification)
        ).join('');

        // Adicionar event listeners para ações
        this.attachActionListeners();
    }

    showEmptyState() {
        const emptyEl = document.getElementById('avisos-empty');
        if (emptyEl) {
            emptyEl.style.display = 'block';
        }
    }

    showLoadingState() {
        const loadingEl = document.getElementById('avisos-loading');
        if (loadingEl) {
            loadingEl.style.display = 'block';
        }
    }

    renderNotification(notification) {
        const typeClass = {
            'info': 'alert-info',
            'warning': 'alert-warning',
            'success': 'alert-success',
            'error': 'alert-danger'
        }[notification.type] || 'alert-info';

        const actionButton = notification.action ? 
            `<button class="btn btn-sm btn-outline-primary ms-auto" data-action="${notification.action}">
                ${notification.action}
            </button>` : '';

        return `
            <div class="alert ${typeClass} border-0 mb-3 d-flex align-items-center" data-notification-id="${notification.id}">
                <i class="${notification.icon} me-2"></i>
                <div class="flex-grow-1">
                    <small class="fw-semibold">${notification.title}</small>
                    <div class="text-muted small">${notification.message}</div>
                </div>
                ${actionButton}
            </div>
        `;
    }

    attachActionListeners() {
        this.container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleAction(action);
            });
        });
    }

    handleAction(action) {
        switch (action) {
            case 'Ver Agenda':
                showPage('agenda');
                break;
            case 'Gerenciar Clientes':
                showPage('clientes');
                break;
            case 'Ver Cliente':
                showPage('clientes');
                break;
            default:
                console.log('Ação não implementada:', action);
        }
    }

    // Métodos públicos para adicionar notificações manualmente
    showNotification(notification) {
        this.addNotification(notification);
        this.render();
    }

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.render();
    }

    clearAll() {
        this.notifications = [];
        this.render();
    }

    // Método para reinicializar após login
    reinitialize() {
        this.notifications = [];
        this.loadInitialNotifications();
    }
}

// Inicializar o sistema de notificações
let notificationSystem;

document.addEventListener('DOMContentLoaded', () => {
    notificationSystem = new NotificationSystem();
});

// Exportar para uso global
window.NotificationSystem = NotificationSystem;
window.notificationSystem = notificationSystem;
