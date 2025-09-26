/**
 * Sistema de Roteamento Inteligente com Autenticação
 * Verifica automaticamente se o usuário está logado e redireciona adequadamente
 */

class AuthRouter {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.isInitialized = false;
        this.init();
    }

    // Detectar URL da API automaticamente
    getApiUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        
        if (window.location.hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/)) {
            return `http://${window.location.hostname}:3000`;
        }
        
        return 'http://localhost:3000';
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Inicializando AuthRouter...');
        this.isInitialized = true;
        
        // Aguardar o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.handleRouting());
        } else {
            this.handleRouting();
        }
    }

    // Verificar se o usuário está autenticado
    isAuthenticated() {
        try {
            const token = localStorage.getItem('barbeiros-token');
            const user = localStorage.getItem('barbeiros-user');
            
            if (!token || !user) {
                return false;
            }

            // Verificar se o token não expirou
            const userData = JSON.parse(user);
            if (userData.expiresAt) {
                const now = new Date().getTime();
                const expiresAt = new Date(userData.expiresAt).getTime();
                if (now > expiresAt) {
                    console.log('⏰ Token expirado');
                    this.clearAuthData();
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
            this.clearAuthData();
            return false;
        }
    }

    // Verificar se o token ainda é válido no servidor (desabilitado por enquanto)
    async validateToken() {
        // Por enquanto, não validar no servidor para evitar problemas
        // O token será validado quando fizer uma requisição real
        return true;
    }

    // Limpar dados de autenticação
    clearAuthData() {
        console.log('🧹 Limpando dados de autenticação...');
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        localStorage.removeItem('barbeiros-tenant');
    }

    // Verificar se estamos na página de login
    isLoginPage() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname.includes('login');
    }

    // Verificar se estamos na página principal/dashboard
    isDashboardPage() {
        return window.location.pathname.endsWith('index.html') || 
               window.location.pathname.endsWith('/') ||
               window.location.pathname.endsWith('/frontend/') ||
               window.location.pathname.endsWith('/frontend/index.html');
    }

    // Redirecionar para login
    redirectToLogin() {
        console.log('🔄 Redirecionando para login...');
        window.location.href = 'pages/login.html';
    }

    // Redirecionar para dashboard
    redirectToDashboard() {
        console.log('🔄 Redirecionando para dashboard...');
        window.location.href = 'index.html';
    }

    // Mostrar loading durante verificação
    showLoading(message = 'Verificando autenticação...') {
        // Criar overlay de loading se não existir
        let loadingOverlay = document.getElementById('auth-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'auth-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="auth-loading-container">
                    <div class="auth-loading-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Carregando...</span>
                        </div>
                    </div>
                    <div class="auth-loading-message">${message}</div>
                </div>
            `;
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            document.body.appendChild(loadingOverlay);
        } else {
            loadingOverlay.style.display = 'flex';
            loadingOverlay.querySelector('.auth-loading-message').textContent = message;
        }
    }

    // Esconder loading
    hideLoading() {
        const loadingOverlay = document.getElementById('auth-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Lógica principal de roteamento
    async handleRouting() {
        console.log('🛣️ Iniciando verificação de roteamento...');
        
        // Mostrar loading
        this.showLoading('Verificando autenticação...');

        try {
            // Verificar se está autenticado
            const isAuth = this.isAuthenticated();
            
            if (isAuth) {
                // Usuário está autenticado
                console.log('✅ Usuário autenticado');
                
                if (this.isLoginPage()) {
                    // Se está na página de login mas está autenticado, redirecionar para dashboard
                    console.log('🔄 Usuário autenticado na página de login, redirecionando...');
                    this.hideLoading();
                    this.redirectToDashboard();
                    return;
                } else {
                    // Usuário autenticado e na página correta
                    console.log('✅ Usuário autenticado e na página correta');
                    this.hideLoading();
                    this.initializeAuthenticatedApp();
                    return;
                }
            } else {
                // Usuário não está autenticado
                console.log('❌ Usuário não autenticado');
                
                if (this.isLoginPage()) {
                    // Usuário não autenticado e na página de login - OK
                    console.log('✅ Usuário não autenticado na página de login - OK');
                    this.hideLoading();
                    this.initializeLoginPage();
                    return;
                } else {
                    // Usuário não autenticado mas não está na página de login - redirecionar
                    console.log('🔄 Usuário não autenticado, redirecionando para login...');
                    this.hideLoading();
                    this.redirectToLogin();
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Erro no roteamento:', error);
            this.hideLoading();
            
            // Em caso de erro, redirecionar para login por segurança
            this.clearAuthData();
            this.redirectToLogin();
        }
    }

    // Inicializar aplicação autenticada
    initializeAuthenticatedApp() {
        console.log('🚀 Inicializando aplicação autenticada...');
        
        // Disparar evento customizado para notificar outros scripts
        window.dispatchEvent(new CustomEvent('auth:authenticated', {
            detail: {
                user: JSON.parse(localStorage.getItem('barbeiros-user') || '{}'),
                token: localStorage.getItem('barbeiros-token')
            }
        }));

        // Se existe um sistema de inicialização global, chamá-lo
        if (typeof window.initializeApp === 'function') {
            window.initializeApp();
        }
    }

    // Inicializar página de login
    initializeLoginPage() {
        console.log('🔐 Inicializando página de login...');
        
        // Disparar evento customizado para notificar outros scripts
        window.dispatchEvent(new CustomEvent('auth:login-page', {
            detail: {}
        }));

        // Se existe um sistema de inicialização de login, chamá-lo
        if (typeof window.initializeLogin === 'function') {
            window.initializeLogin();
        }
    }

    // Método público para logout
    logout() {
        console.log('🚪 Fazendo logout...');
        this.clearAuthData();
        this.redirectToLogin();
    }

    // Método público para verificar autenticação
    checkAuth() {
        return this.isAuthenticated();
    }
}

// CSS para o loading
const authRouterStyles = document.createElement('style');
authRouterStyles.textContent = `
    .auth-loading-container {
        text-align: center;
        padding: 2rem;
    }
    
    .auth-loading-spinner {
        margin-bottom: 1rem;
    }
    
    .auth-loading-message {
        font-size: 1.1rem;
        color: #6c757d;
        font-weight: 500;
    }
    
    .auth-loading-container .spinner-border {
        width: 3rem;
        height: 3rem;
    }
`;
document.head.appendChild(authRouterStyles);

// Inicializar o roteador automaticamente
window.authRouter = new AuthRouter();

// Exportar para uso global
window.AuthRouter = AuthRouter;
