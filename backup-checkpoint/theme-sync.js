// Sistema de Sincronização de Tema - Garante que todos os elementos sejam atualizados
class ThemeSync {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔄 ThemeSync: Inicializando sistema de sincronização');
        
        // Escutar mudanças de tema
        window.addEventListener('themeChanged', (event) => {
            this.syncAllElements(event.detail.theme);
        });
        
        // Sincronizar elementos existentes
        this.syncAllElements(this.getCurrentTheme());
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    syncAllElements(theme) {
        console.log('🔄 ThemeSync: Sincronizando elementos para tema:', theme);
        
        // Sincronizar elementos específicos que podem não ser atualizados automaticamente
        this.syncCards(theme);
        this.syncButtons(theme);
        this.syncForms(theme);
        this.syncTables(theme);
        this.syncModals(theme);
        this.syncDropdowns(theme);
        this.syncToggles(theme);
        
        // Forçar reflow para garantir que as mudanças sejam aplicadas
        document.body.offsetHeight;
        
        console.log('✅ ThemeSync: Sincronização concluída');
    }

    syncCards(theme) {
        const cards = document.querySelectorAll('.card, .metric-card, .stats-card');
        cards.forEach(card => {
            if (theme === 'dark') {
                card.classList.add('dark-mode');
                card.classList.remove('light-mode');
            } else {
                card.classList.add('light-mode');
                card.classList.remove('dark-mode');
            }
        });
    }

    syncButtons(theme) {
        const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-secondary, .btn-outline-primary');
        buttons.forEach(button => {
            if (theme === 'dark') {
                button.classList.add('dark-mode');
                button.classList.remove('light-mode');
            } else {
                button.classList.add('light-mode');
                button.classList.remove('dark-mode');
            }
        });
    }

    syncForms(theme) {
        const forms = document.querySelectorAll('.form-control, .form-select, .form-check-input');
        forms.forEach(form => {
            if (theme === 'dark') {
                form.classList.add('dark-mode');
                form.classList.remove('light-mode');
            } else {
                form.classList.add('light-mode');
                form.classList.remove('dark-mode');
            }
        });
    }

    syncTables(theme) {
        const tables = document.querySelectorAll('.table, .table-striped, .table-hover');
        tables.forEach(table => {
            if (theme === 'dark') {
                table.classList.add('dark-mode');
                table.classList.remove('light-mode');
            } else {
                table.classList.add('light-mode');
                table.classList.remove('dark-mode');
            }
        });
    }

    syncModals(theme) {
        const modals = document.querySelectorAll('.modal-content, .modal-header, .modal-body, .modal-footer');
        modals.forEach(modal => {
            if (theme === 'dark') {
                modal.classList.add('dark-mode');
                modal.classList.remove('light-mode');
            } else {
                modal.classList.add('light-mode');
                modal.classList.remove('dark-mode');
            }
        });
    }

    syncDropdowns(theme) {
        const dropdowns = document.querySelectorAll('.dropdown-menu, .dropdown-item');
        dropdowns.forEach(dropdown => {
            if (theme === 'dark') {
                dropdown.classList.add('dark-mode');
                dropdown.classList.remove('light-mode');
            } else {
                dropdown.classList.add('light-mode');
                dropdown.classList.remove('dark-mode');
            }
        });
    }

    syncToggles(theme) {
        const toggles = document.querySelectorAll('.form-check-input');
        toggles.forEach(toggle => {
            // Forçar reflow para garantir que o CSS seja aplicado
            toggle.offsetHeight;
        });
    }

    // Método público para forçar sincronização manual
    forceSync() {
        this.syncAllElements(this.getCurrentTheme());
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.themeSync = new ThemeSync();
    console.log('🔄 ThemeSync: Sistema de sincronização ativado');
});

// Exportar para uso global
window.ThemeSync = ThemeSync;
