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

        console.log(`🔄 Router: Navegando para ${pageName}`);

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

        // Verificar se a página está registrada
        if (!this.pages[pageName]) {
            console.warn(`⚠️ Router: Página ${pageName} não está registrada, tentando carregar sob demanda...`);
            
            // Tentar carregar a página sob demanda usando o lazy loader
            if (window.lazyLoader) {
                try {
                    await window.lazyLoader.loadPageScripts(pageName);
                    
                    // Aguardar um pouco para o script ser carregado
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Verificar se a página foi carregada
                    if (this.pages[pageName]) {
                        console.log(`✅ Router: Página ${pageName} carregada com sucesso`);
                    } else {
                        console.error(`❌ Router: Falha ao carregar página ${pageName}`);
                        return;
                    }
                } catch (error) {
                    console.error(`❌ Router: Erro ao carregar página ${pageName}:`, error);
                    return;
                }
            } else {
                console.error(`❌ Router: LazyLoader não disponível para carregar ${pageName}`);
                return;
            }
        }

        // Carregar dados da página se existir
        if (this.pages[pageName] && typeof this.pages[pageName].load === 'function') {
            try {
                console.log(`🔄 Router: Carregando dados da página ${pageName}`);
                await this.pages[pageName].load();
                console.log(`✅ Router: Dados da página ${pageName} carregados com sucesso`);
            } catch (error) {
                console.error('❌ Router: Erro ao carregar dados da página', pageName, ':', error);
            }
        }
    }
}

// Instância global do router
window.router = new Router();
