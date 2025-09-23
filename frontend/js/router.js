// Router simples para navegação entre páginas
class Router {
    constructor() {
        this.pages = {};
        this.currentPage = null;
    }

    registerPage(name, pageInstance) {
        this.pages[name] = pageInstance;
    }

    async navigate(pageName) {
        if (this.currentPage === pageName) {
            return;
        }

        // Esconder todas as páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remover classe active de todos os links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Mostrar página selecionada
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error('❌ Router: Página', pageName, 'não encontrada');
        }

        // Ativar link correspondente
        const targetLink = document.querySelector(`[onclick="showPage('${pageName}')"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }

        this.currentPage = pageName;

        // Carregar dados da página se existir
        if (this.pages[pageName] && typeof this.pages[pageName].load === 'function') {
            try {
                await this.pages[pageName].load();
            } catch (error) {
                console.error('❌ Router: Erro ao carregar dados da página', pageName, ':', error);
            }
        }
    }
}

// Instância global do router
window.router = new Router();
