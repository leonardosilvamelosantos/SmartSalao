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
            // Verificar se o tema já foi aplicado pelo script inline
            const alreadyApplied = document.body.classList.contains('theme-loaded');
            const dataTheme = document.body.getAttribute('data-theme');
            
            if (alreadyApplied && dataTheme) {
                // Sincronizar com o tema já aplicado pelo script inline
                this.currentTheme = dataTheme;
                this.syncWithAppliedTheme();
            } else {
                // Aplicar tema salvo sem transição inicial
                this.applyTheme(this.currentTheme, false);
            }

            // Event listener para o botão de toggle com debounce
            if (this.themeToggle) {
                this.themeToggle.addEventListener('click', () => this.debouncedToggleTheme());
            }

            // Atualizar ícones (toggle e marca)
            this.updateToggleIcon();
        }

    getSavedTheme() {
        return localStorage.getItem('barbeiros-theme');
    }

    saveTheme(theme) {
        localStorage.setItem('barbeiros-theme', theme);
    }

    // Sincronizar com tema já aplicado pelo preloader
    syncWithAppliedTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        this.currentTheme = isDarkMode ? 'dark' : 'light';
        
        // Atualizar toggle se existir
        if (this.themeToggle) {
            this.themeToggle.checked = isDarkMode;
        }
        
        console.log('🎨 ThemeManager: Sincronizado com tema aplicado:', this.currentTheme);
    }

    applyTheme(theme, withTransition = true) {
        if (this.isTransitioning) return;
        
        const body = document.body;
        const html = document.documentElement;
        
        // Otimização: usar requestAnimationFrame para mudanças suaves
        if (withTransition) {
            this.isTransitioning = true;
            
            // Adicionar classe de transição
            body.classList.add('theme-transitioning');
            
            requestAnimationFrame(() => {
                this.forceThemeUpdate(theme, html, body);
                
                // Remover classe de transição após a animação
                setTimeout(() => {
                    body.classList.remove('theme-transitioning');
                    this.isTransitioning = false;
                }, 300);
            });
        } else {
            // Aplicação imediata sem transição (para carregamento inicial)
            this.forceThemeUpdate(theme, html, body);
        }

        this.currentTheme = theme;
        this.saveTheme(theme);
        this.updateToggleIcon();
    }
    
    // Função para forçar atualização completa do tema
    forceThemeUpdate(theme, html, body) {
        const isDark = theme === 'dark';
        
        // Aplicar/remover classes de forma otimizada
        if (isDark) {
            html.classList.add('dark-mode');
            body.classList.add('dark-mode');
        } else {
            html.classList.remove('dark-mode');
            body.classList.remove('dark-mode');
        }
        
        // Aplicar data attributes
        html.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme);
        
        // Disparar evento customizado para outros componentes
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme } 
        }));
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

            // Animação de saída
            icon.style.opacity = '0';
            icon.style.transform = 'scale(0.8) rotate(180deg)';

            setTimeout(() => {
                if (this.currentTheme === 'dark') {
                    // Dark mode = Barbearia (poste de barbeiro) - TEMA ATUAL
                    icon.className = 'theme-current';
                    icon.innerHTML = '💈'; // Emoji do poste de barbeiro
                    icon.setAttribute('title', 'Barbearia (Tema Atual) - Clique para Salão Feminino');
                } else {
                    // Light mode = Salão Feminino (unhas) - TEMA ATUAL
                    icon.className = 'theme-current';
                    icon.innerHTML = '💅'; // Emoji de unhas
                    icon.setAttribute('title', 'Salão Feminino (Tema Atual) - Clique para Barbearia');
                }

                // Animação de entrada
                icon.style.opacity = '1';
                icon.style.transform = 'scale(1) rotate(0deg)';
            }, 200);

            // Atualizar também o ícone da marca
            this.updateBrandIcon();
        }

        updateBrandIcon() {
            const brandLogo = document.getElementById('brand-logo');
            if (brandLogo) {
                // Animação de saída
                brandLogo.style.opacity = '0';
                brandLogo.style.transform = 'scale(0.8) rotate(180deg)';

                setTimeout(() => {
                    // A logo permanece a mesma, apenas atualizamos o título
                    if (this.currentTheme === 'dark') {
                        brandLogo.setAttribute('title', 'Barbearia - Tema Atual');
                    } else {
                        brandLogo.setAttribute('title', 'Salão Feminino - Tema Atual');
                    }

                    // Animação de entrada
                    brandLogo.style.opacity = '1';
                    brandLogo.style.transform = 'scale(1) rotate(0deg)';
                }, 200);
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

    // CSS otimizado movido para main.css para melhor performance

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
