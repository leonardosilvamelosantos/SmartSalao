/**
 * Sistema de Otimização de Performance - Versão Simplificada
 * Foca apenas em otimizações essenciais sem interferir nas APIs
 */

class PerformanceOptimizerSimple {
    constructor() {
        this.cache = new Map();
        this.init();
    }

    init() {
        this.setupResourceHints();
        this.setupPerformanceMonitoring();
        console.log('✅ Performance Optimizer Simple: Inicializado');
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

    setupPerformanceMonitoring() {
        // Monitorar Core Web Vitals
        if ('PerformanceObserver' in window) {
            // LCP - Largest Contentful Paint
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('📊 LCP:', Math.round(lastEntry.startTime), 'ms');
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // FID - First Input Delay (otimizado)
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    const fid = entry.processingStart - entry.startTime;
                    if (fid > 10) { // Só logar se for significativo
                        console.log('📊 FID:', Math.round(fid), 'ms');
                    }
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
                if (clsValue > 0) {
                    console.log('📊 CLS:', clsValue);
                }
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
        }
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

    // Limpar cache quando necessário
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Performance: Cache limpo');
    }
}

// Inicializar otimizador simples
let performanceOptimizerSimple;

document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizerSimple = new PerformanceOptimizerSimple();
});

// Exportar para uso global
window.PerformanceOptimizerSimple = PerformanceOptimizerSimple;
window.performanceOptimizerSimple = performanceOptimizerSimple;
