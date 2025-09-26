/**
 * Sistema Unificado de Notificações e Confirmações
 * Substitui alert(), confirm() e melhora o sistema de toast existente
 */

class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.modalContainer = null;
        this.init();
    }

    init() {
        this.createToastContainer();
        this.createModalContainer();
        this.setupGlobalMethods();
    }

    createToastContainer() {
        this.toastContainer = document.getElementById('toastContainer');
        
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container position-fixed';
            this.toastContainer.style.cssText = `
                top: 20px;
                right: 20px;
                z-index: 1060;
                max-width: 350px;
                pointer-events: none;
            `;
            document.body.appendChild(this.toastContainer);
        }
    }

    createModalContainer() {
        this.modalContainer = document.getElementById('notificationModalContainer');
        
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'notificationModalContainer';
            this.modalContainer.innerHTML = `
                <div class="modal fade" id="notificationModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="notificationModalTitle">Confirmação</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="notificationModalBody">
                                <p id="notificationModalMessage">Tem certeza?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="notificationModalCancel">Cancelar</button>
                                <button type="button" class="btn btn-primary" id="notificationModalConfirm">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.modalContainer);
        }
    }

    setupGlobalMethods() {
        // Substituir métodos globais
        window.alert = (message) => this.showAlert(message);
        window.confirm = (message) => this.showConfirm(message);
        
        // Métodos de conveniência
        window.showSuccess = (message, options = {}) => this.showToast(message, 'success', options);
        window.showError = (message, options = {}) => this.showToast(message, 'error', options);
        window.showWarning = (message, options = {}) => this.showToast(message, 'warning', options);
        window.showInfo = (message, options = {}) => this.showToast(message, 'info', options);
        window.showGold = (message, options = {}) => this.showToast(message, 'gold', options);
        window.showConfirm = (message, options = {}) => this.showConfirm(message, options);
    }

    showToast(message, type = 'info', options = {}) {
        const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const config = {
            duration: 3000, // Reduzido de 5000 para 3000ms
            title: this.getDefaultTitle(type),
            icon: this.getIcon(type),
            ...options
        };

        const toastHtml = `
            <div class="toast draggable-toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true" style="pointer-events: auto; cursor: move;">
                <div class="toast-header bg-${this.getBgClass(type)} text-white" style="cursor: move;">
                    <i class="bi ${config.icon} me-2"></i>
                    <strong class="me-auto">${config.title}</strong>
                    <small class="text-white-50">agora</small>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body text-dark">
                    ${message}
                </div>
            </div>
        `;
        
        this.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        
        // Adicionar funcionalidade de arrastar
        this.makeToastDraggable(toastElement);
        
        const toast = new bootstrap.Toast(toastElement, { 
            delay: config.duration,
            autohide: true
        });
        
        toast.show();
        
        // Remover elemento após ser escondido
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return toastId;
    }

    showAlert(message, options = {}) {
        const config = {
            title: 'Atenção',
            type: 'warning',
            ...options
        };

        return this.showToast(message, config.type, {
            title: config.title,
            duration: 6000
        });
    }

    showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const config = {
                title: 'Confirmação',
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
                type: 'warning',
                ...options
            };

            const modal = document.getElementById('notificationModal');
            const modalTitle = document.getElementById('notificationModalTitle');
            const modalBody = document.getElementById('notificationModalBody');
            const modalMessage = document.getElementById('notificationModalMessage');
            const confirmBtn = document.getElementById('notificationModalConfirm');
            const cancelBtn = document.getElementById('notificationModalCancel');

            // Configurar modal
            modalTitle.textContent = config.title;
            modalMessage.textContent = message;
            confirmBtn.textContent = config.confirmText;
            cancelBtn.textContent = config.cancelText;

            // Configurar cores baseado no tipo
            const typeClasses = {
                warning: 'btn-warning',
                danger: 'btn-danger',
                info: 'btn-info',
                success: 'btn-success'
            };
            
            confirmBtn.className = `btn ${typeClasses[config.type] || typeClasses.warning}`;

            // Configurar ícone no título
            const icon = this.getIcon(config.type);
            modalTitle.innerHTML = `<i class="bi ${icon} me-2"></i>${config.title}`;

            // Event listeners
            const handleConfirm = () => {
                modal.removeEventListener('hidden.bs.modal', handleCancel);
                resolve(true);
            };

            const handleCancel = () => {
                modal.removeEventListener('hidden.bs.modal', handleCancel);
                resolve(false);
            };

            confirmBtn.onclick = handleConfirm;
            cancelBtn.onclick = handleCancel;
            modal.addEventListener('hidden.bs.modal', handleCancel);

            // Mostrar modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        });
    }

    getDefaultTitle(type) {
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Atenção',
            info: 'Informação',
            gold: 'Importante'
        };
        return titles[type] || 'Sistema';
    }

    getIcon(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill',
            gold: 'bi-star-fill'
        };
        return icons[type] || icons.info;
    }

    getBgClass(type) {
        const classes = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info',
            gold: 'gold'
        };
        return classes[type] || 'info';
    }

    // Métodos de conveniência específicos
    showApiSuccess(response, customMessage = null) {
        const message = customMessage || response.message || 'Operação realizada com sucesso!';
        return this.showToast(message, 'success');
    }

    showApiError(response, customMessage = null) {
        const message = customMessage || response.message || 'Erro na operação';
        return this.showToast(message, 'error');
    }

    showValidationError(errors) {
        if (Array.isArray(errors)) {
            const message = errors.join('<br>');
            return this.showToast(message, 'error', { duration: 8000 });
        }
        return this.showToast(errors, 'error');
    }

    showLoading(message = 'Carregando...') {
        return this.showToast(message, 'info', { 
            title: 'Carregando',
            duration: 3000
        });
    }

    // Método para notificações de confirmação específicas
    confirmDelete(itemName = 'item') {
        return this.showConfirm(
            `Tem certeza que deseja excluir ${itemName}? Esta ação não pode ser desfeita.`,
            {
                title: 'Confirmar Exclusão',
                type: 'danger',
                confirmText: 'Excluir',
                cancelText: 'Cancelar'
            }
        );
    }

    confirmCancel(itemName = 'item') {
        return this.showConfirm(
            `Tem certeza que deseja cancelar ${itemName}?`,
            {
                title: 'Confirmar Cancelamento',
                type: 'warning',
                confirmText: 'Cancelar',
                cancelText: 'Manter'
            }
        );
    }

    // Limpar todas as notificações
    clearAll() {
        if (this.toastContainer) {
            this.toastContainer.innerHTML = '';
        }
    }

    makeToastDraggable(toastElement) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;

        const header = toastElement.querySelector('.toast-header');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('btn-close')) return; // Não arrastar se clicar no X
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = toastElement.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            toastElement.style.position = 'fixed';
            toastElement.style.zIndex = '9999';
            toastElement.style.transition = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // Limitar aos limites da tela
            const maxX = window.innerWidth - toastElement.offsetWidth;
            const maxY = window.innerHeight - toastElement.offsetHeight;
            
            toastElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            toastElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            toastElement.style.transition = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
}

// Inicializar sistema global
let notificationManager;

document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
});

// Exportar para uso global
window.NotificationManager = NotificationManager;
window.notificationManager = notificationManager;

// Manter compatibilidade com sistema anterior
window.toastSystem = notificationManager;
