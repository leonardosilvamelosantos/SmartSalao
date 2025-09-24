// Script de Segurança - Sistema Barbeiros
// Garante que não há tokens pré-autenticados na inicialização

(function() {
    'use strict';
    
    // Função para limpar dados de autenticação
    function clearAuthData() {
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        sessionStorage.removeItem('barbeiros-token');
        sessionStorage.removeItem('barbeiros-user');
    }
    
    // Função para verificar se há tokens inválidos
    function checkForInvalidTokens() {
        const token = localStorage.getItem('barbeiros-token');
        const user = localStorage.getItem('barbeiros-user');
        
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    clearAuthData();
                    return;
                }
                
                const payload = JSON.parse(atob(parts[1]));
                const now = Math.floor(Date.now() / 1000);
                
                // Verificar expiração
                if (payload.exp && payload.exp < now) {
                    clearAuthData();
                    return;
                }
                
                // Verificar campos obrigatórios (userId e tenantId)
                if (!payload.userId || !payload.tenantId) {
                    clearAuthData();
                    return;
                }
                
            } catch (error) {
                clearAuthData();
            }
        }
        
        if (user) {
            try {
                const userData = JSON.parse(user);
                if (!userData.id && !userData.id_usuario) {
                    clearAuthData();
                }
            } catch (error) {
                clearAuthData();
            }
        }
    }
    
    // Função para forçar logout em caso de erro de autenticação
    function forceLogout() {
        clearAuthData();
        // Redirecionar para login se não estivermos na página de login
        if (!window.location.pathname.includes('login')) {
            window.location.href = 'pages/login.html';
        }
    }
    
    // Função para interceptar erros de autenticação
    function setupAuthErrorHandling() {
        // Interceptar fetch requests para detectar erros 401
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args).then(response => {
                if (response.status === 401) {
                    console.log('🔒 Erro 401 detectado, forçando logout...');
                    forceLogout();
                }
                return response;
            });
        };
    }
    
    // Função para verificar se estamos em modo de desenvolvimento
    function isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';
    }
    
    // Função principal de inicialização de segurança
    function initSecurity() {
        // console.log('🔒 Inicializando sistema de segurança...'); // Otimizado - log removido
        
        // Verificar tokens inválidos
        checkForInvalidTokens();
        
        // Configurar interceptação de erros de autenticação
        setupAuthErrorHandling();
        
        // Em modo de desenvolvimento, limpar dados a cada 5 minutos
        if (isDevelopmentMode()) {
            setInterval(() => {
                checkForInvalidTokens();
            }, 5 * 60 * 1000); // 5 minutos
        }
    }
    
    // Executar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecurity);
    } else {
        initSecurity();
    }
    
    // Expor funções globalmente para debug
    window.SecurityUtils = {
        clearAuthData,
        checkForInvalidTokens,
        forceLogout
    };
    
})();
