/**
 * Serviço de Cache Otimizado
 * Suporte a Redis e fallback para memória local
 */
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.initRedis();
  }

  /**
   * Inicializa conexão Redis
   */
  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('error', (err) => {
          console.warn('Redis connection error:', err.message);
          this.redis = null; // Fallback para cache em memória
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis conectado');
        });
      }
    } catch (error) {
      console.warn('Erro ao inicializar Redis:', error.message);
    }
  }

  /**
   * Busca valor do cache
   */
  async get(key) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback para cache em memória
        const item = this.memoryCache.get(key);
        if (item && Date.now() < item.expiresAt) {
          return item.value;
        } else if (item) {
          this.memoryCache.delete(key); // Remove expirado
        }
        return null;
      }
    } catch (error) {
      console.warn('Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * Define valor no cache
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      const serializedValue = JSON.stringify(value);

      if (this.redis && this.redis.status === 'ready') {
        await this.redis.setex(key, ttlSeconds, serializedValue);
      } else {
        // Fallback para cache em memória
        this.memoryCache.set(key, {
          value,
          expiresAt: Date.now() + (ttlSeconds * 1000)
        });

        // Limpa cache expirado periodicamente
        if (this.memoryCache.size > 1000) {
          this.cleanupExpiredMemoryCache();
        }
      }
    } catch (error) {
      console.warn('Erro ao definir cache:', error);
    }
  }

  /**
   * Remove valor do cache
   */
  async delete(key) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.warn('Erro ao remover cache:', error);
    }
  }

  /**
   * Invalida padrões de chaves
   */
  async invalidatePattern(pattern) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Para cache em memória, limpa chaves que contenham o padrão
        for (const [key] of this.memoryCache) {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao invalidar padrão de cache:', error);
    }
  }

  /**
   * Verifica se chave existe
   */
  async exists(key) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        return await this.redis.exists(key) === 1;
      } else {
        const item = this.memoryCache.get(key);
        return item && Date.now() < item.expiresAt;
      }
    } catch (error) {
      console.warn('Erro ao verificar existência no cache:', error);
      return false;
    }
  }

  /**
   * Incrementa contador
   */
  async increment(key, ttlSeconds = 3600) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const value = await this.redis.incr(key);
        await this.redis.expire(key, ttlSeconds);
        return value;
      } else {
        const current = this.memoryCache.get(key);
        const newValue = (current && Date.now() < current.expiresAt ? current.value : 0) + 1;

        this.memoryCache.set(key, {
          value: newValue,
          expiresAt: Date.now() + (ttlSeconds * 1000)
        });

        return newValue;
      }
    } catch (error) {
      console.warn('Erro ao incrementar cache:', error);
      return 1;
    }
  }

  /**
   * Define múltiplas chaves
   */
  async mset(keyValuePairs, ttlSeconds = 300) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const pipeline = this.redis.pipeline();

        for (const [key, value] of keyValuePairs) {
          pipeline.setex(key, ttlSeconds, JSON.stringify(value));
        }

        await pipeline.exec();
      } else {
        for (const [key, value] of keyValuePairs) {
          this.memoryCache.set(key, {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000)
          });
        }
      }
    } catch (error) {
      console.warn('Erro ao definir múltiplas chaves no cache:', error);
    }
  }

  /**
   * Busca múltiplas chaves
   */
  async mget(keys) {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const values = await this.redis.mget(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      } else {
        return keys.map(key => {
          const item = this.memoryCache.get(key);
          return item && Date.now() < item.expiresAt ? item.value : null;
        });
      }
    } catch (error) {
      console.warn('Erro ao buscar múltiplas chaves do cache:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Estatísticas do cache
   */
  async getStats() {
    try {
      if (this.redis && this.redis.status === 'ready') {
        const info = await this.redis.info();
        return {
          type: 'redis',
          status: 'connected',
          info: info
        };
      } else {
        return {
          type: 'memory',
          status: 'active',
          keys_count: this.memoryCache.size,
          memory_usage: this.estimateMemoryUsage()
        };
      }
    } catch (error) {
      return {
        type: 'error',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear() {
    try {
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.flushall();
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }

  /**
   * Limpa cache expirado da memória
   */
  cleanupExpiredMemoryCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.memoryCache) {
      if (now >= item.expiresAt) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
    // console.log(`🧹 Cache: ${cleaned} chaves expiradas removidas`); // Otimizado para reduzir spam no console
    }
  }

  /**
   * Estima uso de memória do cache
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, item] of this.memoryCache) {
      // Estimativa aproximada: chave + valor serializado
      totalSize += (key.length * 2) + JSON.stringify(item.value).length;
    }

    return `${(totalSize / 1024).toFixed(2)} KB`;
  }

  /**
   * Fecha conexões
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }
}

module.exports = CacheService;
