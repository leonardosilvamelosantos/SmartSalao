/**
 * WhatsApp Status Bar - Atualização de Contadores
 * Gerencia a barra de status com labels e números
 */

class WhatsAppStatusBar {
    constructor() {
        this.statusBar = null;
        this.counters = {
            total: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0
        };
        
        this.init();
    }
    
    init() {
        // Aguardar o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        // Escutar mudanças na agenda
        document.addEventListener('agendaUpdated', (event) => {
            this.updateFromAgendaData(event.detail);
        });
        
        // Escutar mudanças no dashboard
        document.addEventListener('dashboardUpdated', (event) => {
            this.updateFromDashboardData(event.detail);
        });
    }
    
    setup() {
        this.statusBar = document.getElementById('whatsapp-status-bar');
        if (!this.statusBar) {
            console.warn('WhatsApp Status Bar não encontrada');
            return;
        }
        
        // Carregar dados iniciais
        this.loadInitialData();
    }
    
    async loadInitialData() {
        try {
            // Carregar dados da agenda
            const response = await fetch('/api/agendamentos');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateFromAgendaData(data.data);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }
    
    updateFromAgendaData(agendamentos) {
        if (!Array.isArray(agendamentos)) {
            console.warn('Dados de agendamentos inválidos:', agendamentos);
            return;
        }
        
        // Resetar contadores
        this.counters = {
            total: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0
        };
        
        // Contar agendamentos por status
        agendamentos.forEach(agendamento => {
            this.counters.total++;
            
            switch (agendamento.status) {
                case 'confirmed':
                    this.counters.confirmed++;
                    break;
                case 'pending':
                    this.counters.pending++;
                    break;
                case 'cancelled':
                    this.counters.cancelled++;
                    break;
            }
        });
        
        // Atualizar interface
        this.updateDisplay();
    }
    
    updateFromDashboardData(data) {
        if (data && data.agendamentos) {
            this.updateFromAgendaData(data.agendamentos);
        }
    }
    
    updateDisplay() {
        if (!this.statusBar) return;
        
        // Atualizar contadores na interface
        const totalElement = document.getElementById('whatsapp-total');
        const confirmedElement = document.getElementById('whatsapp-confirmed');
        const pendingElement = document.getElementById('whatsapp-pending');
        const cancelledElement = document.getElementById('whatsapp-cancelled');
        
        if (totalElement) totalElement.textContent = this.counters.total;
        if (confirmedElement) confirmedElement.textContent = this.counters.confirmed;
        if (pendingElement) pendingElement.textContent = this.counters.pending;
        if (cancelledElement) cancelledElement.textContent = this.counters.cancelled;
        
        // Adicionar animação de atualização
        this.animateUpdate();
    }
    
    animateUpdate() {
        const items = this.statusBar.querySelectorAll('.whatsapp-status-item');
        
        items.forEach((item, index) => {
            // Adicionar classe de animação
            item.classList.add('status-updating');
            
            // Remover classe após animação
            setTimeout(() => {
                item.classList.remove('status-updating');
            }, 300 + (index * 100));
        });
    }
    
    // Método público para atualizar manualmente
    updateCounters(newCounters) {
        this.counters = { ...this.counters, ...newCounters };
        this.updateDisplay();
    }
    
    // Método público para obter contadores atuais
    getCounters() {
        return { ...this.counters };
    }
    
    // Método público para resetar contadores
    reset() {
        this.counters = {
            total: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0
        };
        this.updateDisplay();
    }
}

// Inicializar quando o script for carregado
const whatsappStatusBar = new WhatsAppStatusBar();

// Exportar para uso global
window.whatsappStatusBar = whatsappStatusBar;

// Adicionar CSS para animações
const style = document.createElement('style');
style.textContent = `
    .whatsapp-status-item.status-updating {
        animation: statusUpdate 0.3s ease-in-out;
    }
    
    @keyframes statusUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .whatsapp-status-item .status-count {
        transition: all 0.2s ease;
    }
    
    .whatsapp-status-item.status-updating .status-count {
        color: #ffc107;
        font-weight: 800;
    }
`;
document.head.appendChild(style);

console.log('📊 WhatsApp Status Bar carregado com sucesso!');
