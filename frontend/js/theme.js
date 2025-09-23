// Sistema de Temas Dark/Light - Sistema Barbeiros (Otimizado)

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.currentTheme = this.getSavedTheme() || 'light';
        this.isTransitioning = false;
        this.debounceTimer = null;
        this.init();
    }

    init() {
        // Aplicar tema salvo sem transição inicial
        this.applyTheme(this.currentTheme, false);

        // Event listener para o botão de toggle com debounce
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.debouncedToggleTheme());
        }

        // Atualizar ícone do botão
        this.updateToggleIcon();
    }

    getSavedTheme() {
        return localStorage.getItem('barbeiros-theme');
    }

    saveTheme(theme) {
        localStorage.setItem('barbeiros-theme', theme);
    }

    applyTheme(theme, withTransition = true) {
        if (this.isTransitioning) return;
        
        const body = document.body;
        
        // Otimização: usar requestAnimationFrame para mudanças suaves
        if (withTransition) {
            this.isTransitioning = true;
            
            // Adicionar classe de transição
            body.classList.add('theme-transitioning');
            
            requestAnimationFrame(() => {
                if (theme === 'dark') {
                    body.classList.add('dark-mode');
                } else {
                    body.classList.remove('dark-mode');
                }
                
                // Remover classe de transição após a animação
                setTimeout(() => {
                    body.classList.remove('theme-transitioning');
                    this.isTransitioning = false;
                }, 300);
            });
        } else {
            // Aplicação imediata sem transição (para carregamento inicial)
            if (theme === 'dark') {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }
        }

        this.currentTheme = theme;
        this.saveTheme(theme);
        this.updateToggleIcon();
    }

    debouncedToggleTheme() {
        // Debounce para evitar cliques múltiplos
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.toggleTheme();
        }, 100);
    }

    toggleTheme() {
        if (this.isTransitioning) return;
        
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);

        // Animação do botão
        this.animateToggleButton();
    }

    updateToggleIcon() {
        if (!this.themeToggle) return;

        const icon = this.themeToggle.querySelector('i');

        if (this.currentTheme === 'dark') {
            icon.className = 'bi bi-moon-fill';
            this.themeToggle.setAttribute('title', 'Mudar para tema claro');
        } else {
            icon.className = 'bi bi-sun-fill';
            this.themeToggle.setAttribute('title', 'Mudar para tema escuro');
        }
    }

    animateToggleButton() {
        if (!this.themeToggle) return;

        // Usar requestAnimationFrame para animação suave
        requestAnimationFrame(() => {
            this.themeToggle.classList.add('theme-toggle-animate');
            
            // Remover classe após animação
            setTimeout(() => {
                this.themeToggle.classList.remove('theme-toggle-animate');
            }, 300);
        });
    }

    // Método para verificar se está em dark mode
    isDarkMode() {
        return this.currentTheme === 'dark';
    }

    // Método para forçar um tema específico
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }

    // Método para resetar para o tema padrão do sistema
    resetToSystemTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        this.applyTheme(systemTheme);
    }
}

// Função global para acesso fácil
function toggleTheme() {
    if (window.themeManager) {
        window.themeManager.toggleTheme();
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();

    // Detectar mudança na preferência do sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Opcional: seguir automaticamente o tema do sistema
        // Se quiser manter sempre o tema salvo, comente a linha abaixo
        // if (!localStorage.getItem('barbeiros-theme')) {
        //     const systemTheme = e.matches ? 'dark' : 'light';
        //     window.themeManager.applyTheme(systemTheme);
        // }
    });
});

// CSS otimizado para performance de temas
const style = document.createElement('style');
style.textContent = `
    /* Otimizações de performance para mudanças de tema */
    :root {
        /* Variáveis CSS para transições mais eficientes */
        --theme-transition-duration: 0.2s;
        --theme-transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Classe para controlar transições durante mudança de tema */
    .theme-transitioning * {
        transition: background-color var(--theme-transition-duration) var(--theme-transition-timing),
                   color var(--theme-transition-duration) var(--theme-transition-timing),
                   border-color var(--theme-transition-duration) var(--theme-transition-timing),
                   box-shadow var(--theme-transition-duration) var(--theme-transition-timing) !important;
    }

    /* Desabilitar transições para elementos que não precisam */
    .theme-transitioning img,
    .theme-transitioning svg,
    .theme-transitioning canvas,
    .theme-transitioning video {
        transition: none !important;
    }

    /* Animação do botão de toggle otimizada */
    .theme-toggle-animate {
        animation: themeTogglePulse 0.3s var(--theme-transition-timing);
        will-change: transform;
    }

    @keyframes themeTogglePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    /* Otimizações para elementos que mudam frequentemente */
    .navbar,
    .sidebar,
    .card,
    .modal-content,
    .btn,
    .form-control {
        will-change: background-color, color, border-color;
    }

    /* Reduzir reflow/repaint durante transições */
    .theme-transitioning {
        contain: layout style paint;
    }

    /* Transições mais suaves para elementos específicos */
    body {
        transition: background-color var(--theme-transition-duration) var(--theme-transition-timing);
    }

    /* Otimização para elementos com muitas propriedades */
    .metric-card,
    .appointment-item,
    .table {
        transition: background-color var(--theme-transition-duration) var(--theme-transition-timing),
                   border-color var(--theme-transition-duration) var(--theme-transition-timing);
    }
`;
document.head.appendChild(style);

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
