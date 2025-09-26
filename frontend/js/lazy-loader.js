// Sistema de Lazy Loading Inteligente
class LazyLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadingPromises = new Map();
        this.pageDependencies = {
            'dashboard': ['dashboard.js'],
            'clientes': ['pages/clientes.js'],
            'servicos': ['pages/servicos.js'],
            'agenda': ['pages/agenda.js'],
            'usuarios': ['pages/usuarios.js'],
            'configuracoes': ['pages/configuracoes.js'],
            'whatsapp': ['pages/whatsapp.js']
        };
        this.criticalScripts = [
            'auth-router.js',
            'clear-auth.js', 
            'security.js',
            'core/api.js',
            'theme.js',
            'main.js',
            'router.js',
            'notifications.js',
            'toast-notifications.js'
        ];
        this.init();
    }

    init() {
        console.log('🚀 LazyLoader: Inicializando sistema de carregamento inteligente');
        
        // Interceptar navegação para carregar scripts sob demanda
        this.interceptNavigation();
        
        // Pre-carregar scripts críticos em background
        this.preloadCriticalScripts();
    }

    // Interceptar navegação para carregar scripts das páginas
    interceptNavigation() {
        // Interceptar a função showPage global
        const originalShowPage = window.showPage;
        window.showPage = async (pageName) => {
            console.log(`🔄 LazyLoader: Navegando para ${pageName}`);
            
            // Carregar scripts da página se necessário
            await this.loadPageScripts(pageName);
            
            // Chamar função original
            if (originalShowPage) {
                originalShowPage(pageName);
            }
        };

        // Interceptar router.navigate se existir
        if (window.router) {
            const originalNavigate = window.router.navigate;
            window.router.navigate = async (pageName) => {
                await this.loadPageScripts(pageName);
                if (originalNavigate) {
                    return originalNavigate.call(window.router, pageName);
                }
            };
        }
    }

    // Carregar scripts de uma página específica
    async loadPageScripts(pageName) {
        const dependencies = this.pageDependencies[pageName];
        if (!dependencies) {
            console.log(`⚠️ LazyLoader: Nenhuma dependência encontrada para ${pageName}`);
            return;
        }

        const loadPromises = dependencies.map(script => this.loadScript(script));
        await Promise.all(loadPromises);
        
        console.log(`✅ LazyLoader: Scripts da página ${pageName} carregados`);
    }

    // Carregar um script individual
    async loadScript(scriptPath) {
        // Se já foi carregado, retornar imediatamente
        if (this.loadedScripts.has(scriptPath)) {
            return Promise.resolve();
        }

        // Se já está sendo carregado, aguardar a promise existente
        if (this.loadingPromises.has(scriptPath)) {
            return this.loadingPromises.get(scriptPath);
        }

        // Criar promise de carregamento
        const loadPromise = this._loadScriptFile(scriptPath);
        this.loadingPromises.set(scriptPath, loadPromise);

        try {
            await loadPromise;
            this.loadedScripts.add(scriptPath);
            this.loadingPromises.delete(scriptPath);
            console.log(`✅ LazyLoader: Script ${scriptPath} carregado com sucesso`);
            
            // Registrar página automaticamente se disponível
            this.registerPageIfAvailable(scriptPath);
        } catch (error) {
            console.error(`❌ LazyLoader: Erro ao carregar ${scriptPath}:`, error);
            this.loadingPromises.delete(scriptPath);
            throw error;
        }

        return loadPromise;
    }
    
    // Registrar página automaticamente quando script for carregado
    registerPageIfAvailable(scriptPath) {
        const pageMap = {
            'pages/servicos.js': 'servicos',
            'pages/clientes.js': 'clientes',
            'pages/agenda.js': 'agenda',
            'pages/usuarios.js': 'usuarios',
            'pages/configuracoes.js': 'configuracoes',
            'pages/whatsapp.js': 'whatsapp',
            'dashboard.js': 'dashboard'
        };
        
        const pageName = pageMap[scriptPath];
        if (pageName && window.router) {
            // Aguardar um pouco para garantir que a página foi definida
            setTimeout(() => {
                const pageInstance = window[`${pageName}Page`];
                if (pageInstance && !window.router.pages[pageName]) {
                    console.log(`🔧 LazyLoader: Registrando página ${pageName} automaticamente`);
                    window.router.registerPage(pageName, pageInstance);
                }
            }, 50);
        }
    }

    // Carregar arquivo de script dinamicamente
    _loadScriptFile(scriptPath) {
        return new Promise((resolve, reject) => {
            // Verificar se o script já existe no DOM
            const existingScript = document.querySelector(`script[src="js/${scriptPath}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `js/${scriptPath}`;
            script.async = true;
            
            script.onload = () => {
                console.log(`📦 LazyLoader: ${scriptPath} carregado`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ LazyLoader: Falha ao carregar ${scriptPath}`);
                reject(new Error(`Falha ao carregar ${scriptPath}`));
            };

            document.head.appendChild(script);
        });
    }

    // Pre-carregar scripts críticos em background
    preloadCriticalScripts() {
        // Aguardar um pouco para não bloquear o carregamento inicial
        setTimeout(() => {
            console.log('🔄 LazyLoader: Pre-carregando scripts críticos em background');
            
            // Pre-carregar scripts que podem ser necessários
            const backgroundScripts = [
                'animated-cards.js',
                'pages/clientes.js', // Página mais acessada
                'pages/servicos.js'  // Segunda mais acessada
            ];

            backgroundScripts.forEach(script => {
                this.loadScript(script).catch(error => {
                    console.warn(`⚠️ LazyLoader: Falha ao pre-carregar ${script}:`, error);
                });
            });
        }, 2000); // Aguardar 2 segundos após carregamento inicial
    }

    // Verificar se uma página está pronta
    isPageReady(pageName) {
        const dependencies = this.pageDependencies[pageName];
        if (!dependencies) return true;

        return dependencies.every(script => this.loadedScripts.has(script));
    }

    // Obter status de carregamento
    getLoadingStatus() {
        return {
            loadedScripts: Array.from(this.loadedScripts),
            loadingScripts: Array.from(this.loadingPromises.keys()),
            totalLoaded: this.loadedScripts.size
        };
    }
}

// Inicializar o LazyLoader quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoader = new LazyLoader();
    console.log('🚀 LazyLoader: Sistema de lazy loading ativado');
});

// Exportar para uso global
window.LazyLoader = LazyLoader;

