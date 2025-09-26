// Sistema de Cache Inteligente para Páginas
class PageCache {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 10; // Máximo de 10 páginas em cache
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        this.init();
    }

    init() {
        console.log('💾 PageCache: Sistema de cache inteligente inicializado');
        
        // Limpar cache expirado periodicamente
        setInterval(() => {
            this.cleanExpiredCache();
        }, 60000); // Verificar a cada minuto
    }

    // Obter dados de uma página do cache
    get(pageName) {
        const cached = this.cache.get(pageName);
        
        if (!cached) {
            return null;
        }

        // Verificar se o cache expirou
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(pageName);
            return null;
        }

        console.log(`💾 PageCache: Dados de ${pageName} obtidos do cache`);
        return cached.data;
    }

    // Armazenar dados de uma página no cache
    set(pageName, data) {
        // Limpar cache se estiver cheio
        if (this.cache.size >= this.maxCacheSize) {
            this.cleanOldestCache();
        }

        this.cache.set(pageName, {
            data: data,
            timestamp: Date.now()
        });

        console.log(`💾 PageCache: Dados de ${pageName} armazenados no cache`);
    }

    // Verificar se uma página está em cache
    has(pageName) {
        const cached = this.cache.get(pageName);
        if (!cached) return false;

        // Verificar se expirou
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(pageName);
            return false;
        }

        return true;
    }

    // Limpar cache de uma página específica
    clear(pageName) {
        this.cache.delete(pageName);
        console.log(`💾 PageCache: Cache de ${pageName} limpo`);
    }

    // Limpar todo o cache
    clearAll() {
        this.cache.clear();
        console.log('💾 PageCache: Todo o cache foi limpo');
    }

    // Limpar cache expirado
    cleanExpiredCache() {
        const now = Date.now();
        let cleaned = 0;

        for (const [pageName, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(pageName);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`💾 PageCache: ${cleaned} entradas expiradas removidas`);
        }
    }

    // Limpar cache mais antigo
    cleanOldestCache() {
        let oldestPage = null;
        let oldestTime = Date.now();

        for (const [pageName, cached] of this.cache.entries()) {
            if (cached.timestamp < oldestTime) {
                oldestTime = cached.timestamp;
                oldestPage = pageName;
            }
        }

        if (oldestPage) {
            this.cache.delete(oldestPage);
            console.log(`💾 PageCache: Página mais antiga (${oldestPage}) removida do cache`);
        }
    }

    // Obter estatísticas do cache
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            pages: Array.from(this.cache.keys()),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // Estimar uso de memória
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [pageName, cached] of this.cache.entries()) {
            totalSize += JSON.stringify(cached.data).length;
        }
        return totalSize;
    }
}

// Inicializar o PageCache
window.pageCache = new PageCache();

// Exportar para uso global
window.PageCache = PageCache;
