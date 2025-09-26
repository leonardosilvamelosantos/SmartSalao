// Sistema de Otimização de API - Reduzir chamadas redundantes
class ApiOptimizer {
    constructor() {
        this.requestCache = new Map();
        this.pendingRequests = new Map();
        this.cacheTimeout = 30000; // 30 segundos
        this.init();
    }

    init() {
        console.log('⚡ ApiOptimizer: Sistema de otimização de API inicializado');
        
        // Interceptar chamadas de API
        this.interceptApiCalls();
        
        // Limpar cache expirado periodicamente
        setInterval(() => {
            this.cleanExpiredCache();
        }, 30000); // Verificar a cada 30 segundos
    }

    // Interceptar chamadas de API
    interceptApiCalls() {
        // Interceptar fetch global
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Apenas interceptar chamadas para nossa API
            if (typeof url === 'string' && url.includes('/api/')) {
                return this.optimizeApiCall(url, options, originalFetch);
            }
            
            return originalFetch(url, options);
        };

        // Interceptar XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            xhr.open = function(method, url, ...args) {
                this._url = url;
                this._method = method;
                return originalOpen.call(this, method, url, ...args);
            };

            xhr.send = function(data) {
                if (this._url && this._url.includes('/api/')) {
                    return this.optimizeXHRCall(this, originalSend, data);
                }
                return originalSend.call(this, data);
            };

            return xhr;
        };
    }

    // Otimizar chamada de API
    async optimizeApiCall(url, options, originalFetch) {
        const cacheKey = this.getCacheKey(url, options);
        
        // Verificar se já está sendo processada
        if (this.pendingRequests.has(cacheKey)) {
            console.log(`⚡ ApiOptimizer: Aguardando requisição duplicada para ${url}`);
            return this.pendingRequests.get(cacheKey);
        }

        // Verificar cache
        const cached = this.requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`⚡ ApiOptimizer: Retornando dados do cache para ${url}`);
            return new Response(JSON.stringify(cached.data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fazer requisição
        const requestPromise = originalFetch(url, options).then(async response => {
            // Remover da lista de requisições pendentes
            this.pendingRequests.delete(cacheKey);
            
            // Cachear resposta se for bem-sucedida
            if (response.ok) {
                const data = await response.clone().json();
                this.requestCache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                console.log(`⚡ ApiOptimizer: Dados de ${url} armazenados no cache`);
            }
            
            return response;
        }).catch(error => {
            this.pendingRequests.delete(cacheKey);
            throw error;
        });

        // Adicionar à lista de requisições pendentes
        this.pendingRequests.set(cacheKey, requestPromise);
        
        return requestPromise;
    }

    // Otimizar chamada XHR
    optimizeXHRCall(xhr, originalSend, data) {
        const url = xhr._url;
        const method = xhr._method;
        const cacheKey = this.getCacheKey(url, { method });

        // Verificar cache
        const cached = this.requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`⚡ ApiOptimizer: Retornando dados do cache XHR para ${url}`);
            
            // Simular resposta do cache
            setTimeout(() => {
                Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
                Object.defineProperty(xhr, 'status', { value: 200, writable: false });
                Object.defineProperty(xhr, 'responseText', { value: JSON.stringify(cached.data), writable: false });
                
                if (xhr.onreadystatechange) {
                    xhr.onreadystatechange();
                }
            }, 0);
            
            return;
        }

        // Fazer requisição real
        const originalOnReadyStateChange = xhr.onreadystatechange;
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                // Cachear resposta
                try {
                    const data = JSON.parse(xhr.responseText);
                    window.apiOptimizer.requestCache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                    console.log(`⚡ ApiOptimizer: Dados XHR de ${url} armazenados no cache`);
                } catch (error) {
                    console.warn('⚡ ApiOptimizer: Erro ao fazer parse da resposta XHR:', error);
                }
            }
            
            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.call(this);
            }
        };

        return originalSend.call(xhr, data);
    }

    // Gerar chave de cache
    getCacheKey(url, options) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
    }

    // Limpar cache expirado
    cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, cached] of this.requestCache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.requestCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`⚡ ApiOptimizer: ${cleaned} entradas de cache expiradas removidas`);
        }
    }

    // Limpar cache específico
    clearCache(pattern) {
        let cleaned = 0;
        for (const [key, cached] of this.requestCache.entries()) {
            if (key.includes(pattern)) {
                this.requestCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`⚡ ApiOptimizer: ${cleaned} entradas de cache removidas para ${pattern}`);
        }
    }

    // Obter estatísticas
    getStats() {
        return {
            cacheSize: this.requestCache.size,
            pendingRequests: this.pendingRequests.size,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Inicializar o ApiOptimizer
window.apiOptimizer = new ApiOptimizer();

// Exportar para uso global
window.ApiOptimizer = ApiOptimizer;
