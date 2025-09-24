// Script para limpar autenticação na inicialização
// Executa antes de qualquer outro script

(function() {
    'use strict';
    
    // console.log('🔒 Verificando dados de autenticação na inicialização...'); // Otimizado - log removido
    
    // Verificar se há dados de autenticação válidos
    const token = localStorage.getItem('barbeiros-token');
    const user = localStorage.getItem('barbeiros-user');
    
    if (token && user && token !== 'null' && user !== 'null' && token !== 'undefined' && user !== 'undefined') {
        try {
            // Verificar se o token é válido
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const now = Math.floor(Date.now() / 1000);
                
                // Se o token não expirou e tem os campos necessários, manter
                if (payload.exp && payload.exp > now && payload.userId && payload.tenantId) {
                    return;
                }
            }
        } catch (error) {
            // Token inválido, continuar para limpeza
        }
    }
    
    // Limpar localStorage
    localStorage.removeItem('barbeiros-token');
    localStorage.removeItem('barbeiros-user');
    
    // Limpar sessionStorage
    sessionStorage.removeItem('barbeiros-token');
    sessionStorage.removeItem('barbeiros-user');
    
    // Limpar cookies relacionados (se houver)
    document.cookie = 'barbeiros-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'barbeiros-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
})();