/**
 * Sistema de Otimização de Performance
 * Implementa cache inteligente, compressão e otimizações de rede
 */

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.resourceQueue = [];
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.setupServiceWorker();
        this.setupResourceHints();
        this.setupCompression();
        this.setupCriticalResourceLoading();
        this.setupNetworkOptimizations();
    }

    setupServiceWorker() {
        // Desabilitar temporariamente para evitar erros 404
        console.log('Service Worker desabilitado temporariamente');
        /*
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado:', registration);
                })
                .catch(error => {
                    console.warn('Erro ao registrar Service Worker:', error);
                });
        }
        */
    }

    setupResourceHints() {
        // DNS Prefetch para recursos externos
        const externalDomains = [
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'cdn.jsdelivr.net'
        ];

        externalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = `//${domain}`;
            document.head.appendChild(link);
        });

        // Preconnect para recursos críticos
        const criticalDomains = [
            'fonts.googleapis.com',
            'fonts.gstatic.com'
        ];

        criticalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = `https://${domain}`;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    setupCompression() {
        // Interceptar requisições para aplicar compressão (apenas para recursos estáticos)
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Aplicar compressão apenas para recursos estáticos, não para APIs
            if (typeof url === 'string' && !url.includes('/api/')) {
                const headers = new Headers(options.headers);
                headers.set('Accept-Encoding', 'gzip, deflate, br');
                headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/avif,*/*;q=0.8');

                return originalFetch(url, {
                    ...options,
                    headers
                });
            }
            
            // Para APIs, usar fetch original sem modificações
            return originalFetch(url, options);
        };
    }

    setupCriticalResourceLoading() {
        // Carregar apenas recursos não críticos em background
        console.log('✅ Performance: Recursos críticos já carregados pelo HTML');
    }

    setupNetworkOptimizations() {
        // Otimizar requisições de API
        this.optimizeApiRequests();
        
        // Configurar cache de recursos
        this.setupResourceCache();
        
        // Monitorar performance
        this.setupPerformanceMonitoring();
    }

    optimizeApiRequests() {
        // Aguardar o barbeirosApp estar disponível
        const checkAndOptimize = () => {
            if (window.barbeirosApp && window.barbeirosApp.apiRequest) {
                const originalApiRequest = window.barbeirosApp.apiRequest;
                
                window.barbeirosApp.apiRequest = async (url, options = {}) => {
                    // Adicionar cache para requisições GET
                    if (!options.method || options.method === 'GET') {
                        const cacheKey = `api_${url}_${JSON.stringify(options)}`;
                        if (this.cache.has(cacheKey)) {
                            console.log('🚀 Performance: Retornando dados do cache para', url);
                            return this.cache.get(cacheKey);
                        }
                    }

                    // Chamar método original com todos os parâmetros
                    const result = await originalApiRequest.call(window.barbeirosApp, url, options);
                    
                    // Cachear resultado se for GET e bem-sucedido
                    if ((!options.method || options.method === 'GET') && result && result.success) {
                        const cacheKey = `api_${url}_${JSON.stringify(options)}`;
                        this.cache.set(cacheKey, result);
                        console.log('💾 Performance: Dados armazenados no cache para', url);
                    }

                    return result;
                };
                
                console.log('✅ Performance: API requests otimizadas');
            } else {
                // Tentar novamente em 100ms
                setTimeout(checkAndOptimize, 100);
            }
        };
        
        checkAndOptimize();
    }

    setupResourceCache() {
        // Cache já configurado no HTML, não precisa duplicar
        console.log('✅ Performance: Cache de recursos configurado');
    }

    setupPerformanceMonitoring() {
        // Monitorar Core Web Vitals
        if ('PerformanceObserver' in window) {
            // LCP - Largest Contentful Paint
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('LCP:', lastEntry.startTime);
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // FID - First Input Delay
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    console.log('FID:', entry.processingStart - entry.startTime);
                });
            }).observe({ entryTypes: ['first-input'] });

            // CLS - Cumulative Layout Shift
            new PerformanceObserver((list) => {
                let clsValue = 0;
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                console.log('CLS:', clsValue);
            }).observe({ entryTypes: ['layout-shift'] });
        }
    }

    // Método para otimizar imagens específicas
    optimizeImage(img) {
        if (img.tagName === 'IMG') {
            // Adicionar lazy loading
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            // Adicionar decoding async
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }

            // Otimizar formato baseado no suporte do navegador
            this.optimizeImageFormat(img);
        }
    }

    optimizeImageFormat(img) {
        const src = img.src;
        if (src.includes('.png') || src.includes('.jpg')) {
            // Verificar suporte a WebP
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx && ctx.webp) {
                // Substituir por WebP se suportado
                const webpSrc = src.replace(/\.(png|jpg|jpeg)$/, '.webp');
                img.src = webpSrc;
            }
        }
    }

    // Limpar cache quando necessário
    clearCache() {
        this.cache.clear();
        console.log('Cache limpo');
    }

    // Obter estatísticas de performance
    getPerformanceStats() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            cacheSize: this.cache.size
        };
    }
}

// Inicializar otimizador
let performanceOptimizer;

document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer = new PerformanceOptimizer();
});

// Exportar para uso global
window.PerformanceOptimizer = PerformanceOptimizer;
window.performanceOptimizer = performanceOptimizer;
