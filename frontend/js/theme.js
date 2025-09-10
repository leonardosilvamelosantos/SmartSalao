// Sistema de Temas Dark/Light - Sistema Barbeiros

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    init() {
        // Aplicar tema salvo
        this.applyTheme(this.currentTheme);

        // Event listener para o botão de toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
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

    applyTheme(theme) {
        const body = document.body;

        if (theme === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }

        this.currentTheme = theme;
        this.saveTheme(theme);
        this.updateToggleIcon();
    }

    toggleTheme() {
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

        // Adicionar classe de animação
        this.themeToggle.classList.add('theme-toggle-animate');

        // Remover classe após animação
        setTimeout(() => {
            this.themeToggle.classList.remove('theme-toggle-animate');
        }, 300);
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

// CSS adicional para animações (pode ser movido para o main.css se preferir)
const style = document.createElement('style');
style.textContent = `
    .theme-toggle-animate {
        animation: themeTogglePulse 0.3s ease-in-out;
    }

    @keyframes themeTogglePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    /* Transições suaves para mudanças de tema */
    body {
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    .sidebar, .card, .navbar, .modal-content {
        transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
    }
`;
document.head.appendChild(style);

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
