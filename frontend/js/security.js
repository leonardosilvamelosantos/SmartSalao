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
                
                // Verificar se tem pelo menos um dos campos necessários (mais flexível)
                if (!payload.userId && !payload.id) {
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
    
    // ===========================================
    // ANOTAÇÃO DE SEGURANÇA - INTERCEPTAÇÃO 401
    // ===========================================
    // 
    // ALTERAÇÕES IMPLEMENTADAS PARA CORRIGIR LOGOUT INDEVIDO:
    // 
    // 1. ANTES: Qualquer resposta 401 causava logout forçado
    // 2. AGORA: Só força logout em casos específicos de segurança
    // 
    // LÓGICA DE SEGURANÇA ATUAL:
    // - Requisições SEM token: NÃO força logout (pode ser rota pública ou erro de cliente)
    // - Requisições COM token válido mas 401: NÃO força logout (pode ser erro temporário/permissão)
    // - Requisições COM token expirado: FORÇA logout (segurança)
    // - Requisições COM token malformado: FORÇA logout (segurança)
    // 
    // RISCOS MITIGADOS:
    // ✅ Evita logout por requisições malformadas do cliente
    // ✅ Evita logout por erros temporários de rede/servidor
    // ✅ Mantém segurança para tokens realmente inválidos
    // ✅ Preserva experiência do usuário
    // 
    // MONITORAMENTO:
    // - Logs detalhados para auditoria
    // - Verificação de expiração de token
    // - Validação de estrutura JWT
    // 
    // ===========================================

    // Função para interceptar erros de autenticação
    function setupAuthErrorHandling() {
        // Interceptar fetch requests para detectar erros 401
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args).then(response => {
                if (response.status === 401) {
                    const url = args[0];
                    const options = args[1] || {};
                    const authHeader = options.headers?.Authorization || options.headers?.['authorization'];
                    
                    console.log('🔒 Erro 401 detectado:', url, 'Token presente:', !!authHeader);
                    
                    // Se não há token na requisição, não forçar logout
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        console.log('🔒 Requisição sem token, não forçando logout');
                        return response;
                    }
                    
                    const token = authHeader.substring(7);
                    
                    // Verificar se o token é válido antes de forçar logout
                    try {
                        const parts = token.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]));
                            const now = Math.floor(Date.now() / 1000);
                            
                            // Se o token não expirou, não forçar logout
                            if (payload.exp && payload.exp > now) {
                                console.log('🔒 Token válido mas recebeu 401, pode ser erro temporário - não forçando logout');
                                return response;
                            }
                        }
                    } catch (error) {
                        console.log('🔒 Token inválido, forçando logout');
                    }
                    
                    // Só forçar logout se realmente necessário
                    console.log('🔒 Forçando logout devido a erro 401');
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
