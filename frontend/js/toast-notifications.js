/**
 * Sistema de Notificações Toast Unificado
 * Funciona tanto no Dashboard quanto na Dev Console
 */

class ToastNotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Criar container se não existir
        this.createContainer();
    }

    createContainer() {
        // Verificar se já existe
        this.container = document.getElementById('toastContainer');
        
        if (!this.container) {
            // Criar container
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1055;
            `;
            
            // Adicionar ao body
            document.body.appendChild(this.container);
        }
    }

    showToast(message, type = 'info', duration = 5000, options = {}) {
        const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const iconMap = {
            success: 'bi-check-circle-fill text-success',
            error: 'bi-exclamation-triangle-fill text-danger',
            warning: 'bi-exclamation-triangle-fill text-warning',
            info: 'bi-info-circle-fill text-info'
        };
        
        const title = options.title || this.getDefaultTitle(type);
        const icon = iconMap[type] || iconMap.info;
        
        const toastHtml = `
            <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="bi ${icon} me-2"></i>
                    <strong class="me-auto">${title}</strong>
                    <small class="text-muted">agora</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: duration });
        toast.show();
        
        // Remover elemento após ser escondido
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return toastId;
    }

    getDefaultTitle(type) {
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Atenção',
            info: 'Informação'
        };
        return titles[type] || 'Sistema';
    }

    // Métodos de conveniência
    success(message, duration = 5000, options = {}) {
        return this.showToast(message, 'success', duration, options);
    }

    error(message, duration = 7000, options = {}) {
        return this.showToast(message, 'error', duration, options);
    }

    warning(message, duration = 6000, options = {}) {
        return this.showToast(message, 'warning', duration, options);
    }

    info(message, duration = 5000, options = {}) {
        return this.showToast(message, 'info', duration, options);
    }

    // Método para mostrar notificações de API
    showApiNotification(response, successMessage = 'Operação realizada com sucesso', errorMessage = 'Erro na operação') {
        if (response && response.success) {
            this.success(successMessage);
        } else {
            this.error(response?.message || errorMessage);
        }
    }

    // Método para mostrar notificações de loading
    showLoadingNotification(message = 'Carregando...', duration = 3000) {
        return this.info(message, duration, { title: 'Carregando' });
    }

    // Método para limpar todas as notificações
    clearAll() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Inicializar sistema global
let toastSystem;

document.addEventListener('DOMContentLoaded', () => {
    toastSystem = new ToastNotificationSystem();
});

// Exportar para uso global
window.ToastNotificationSystem = ToastNotificationSystem;
window.toastSystem = toastSystem;

// Funções globais de conveniência
window.showSuccess = (message, duration, options) => toastSystem?.success(message, duration, options);
window.showError = (message, duration, options) => toastSystem?.error(message, duration, options);
window.showWarning = (message, duration, options) => toastSystem?.warning(message, duration, options);
window.showInfo = (message, duration, options) => toastSystem?.info(message, duration, options);
