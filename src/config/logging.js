/**
 * Configuração de Logging Otimizada
 * Controla o nível de logs para melhorar performance e reduzir spam no console
 */

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableDebug = process.env.NODE_ENV === 'development' && process.env.ENABLE_DEBUG === 'true';
    this.enableVerbose = process.env.ENABLE_VERBOSE_LOGS === 'true';
    this.enableWhatsAppLogs = process.env.LOG_WHATSAPP === 'true';
    this.enableDatabaseLogs = process.env.LOG_DATABASE === 'true';
    this.enableCacheLogs = process.env.LOG_CACHE === 'true';
    
    // Cache para throttling de logs
    this.logThrottle = new Map();
    this.throttleTimeout = 5000; // 5 segundos
  }

  /**
   * Verifica se deve logar baseado no nível
   */
  shouldLog(level) {
    const levels = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3,
      'verbose': 4
    };
    
    return levels[level] <= levels[this.logLevel];
  }

  /**
   * Throttling de logs para evitar spam
   */
  isThrottled(key, level = 'info') {
    const now = Date.now();
    const throttleKey = `${key}_${level}`;
    const lastLog = this.logThrottle.get(throttleKey);
    
    if (lastLog && (now - lastLog) < this.throttleTimeout) {
      return true;
    }
    
    this.logThrottle.set(throttleKey, now);
    return false;
  }

  /**
   * Log de erro (sempre exibido)
   */
  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  /**
   * Log de warning
   */
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  /**
   * Log de informação
   */
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message, ...args) {
    if (this.enableDebug && this.shouldLog('debug')) {
      console.log(`🐛 ${message}`, ...args);
    }
  }

  /**
   * Log verbose (apenas quando habilitado)
   */
  verbose(message, ...args) {
    if (this.enableVerbose && this.shouldLog('verbose')) {
      console.log(`📝 ${message}`, ...args);
    }
  }

  /**
   * Log específico para WhatsApp (com throttling)
   */
  whatsapp(message, ...args) {
    if (this.enableWhatsAppLogs && !this.isThrottled('whatsapp', 'info')) {
      console.log(`📱 ${message}`, ...args);
    }
  }

  /**
   * Log específico para banco de dados
   */
  database(message, ...args) {
    if (this.enableDatabaseLogs && !this.isThrottled('database', 'info')) {
      console.log(`🗄️ ${message}`, ...args);
    }
  }

  /**
   * Log específico para cache
   */
  cache(message, ...args) {
    if (this.enableCacheLogs && !this.isThrottled('cache', 'info')) {
      console.log(`💾 ${message}`, ...args);
    }
  }

  /**
   * Log de performance
   */
  performance(operation, duration, ...args) {
    if (this.enableDebug && duration > 1000) { // Log apenas operações > 1s
      console.log(`⏱️ ${operation}: ${duration}ms`, ...args);
    }
  }

  /**
   * Log de conexão (com throttling)
   */
  connection(message, ...args) {
    if (!this.isThrottled('connection', 'info')) {
      console.log(`🔌 ${message}`, ...args);
    }
  }

  /**
   * Log de agendamento (com throttling)
   */
  appointment(message, ...args) {
    if (!this.isThrottled('appointment', 'info')) {
      console.log(`📅 ${message}`, ...args);
    }
  }

  /**
   * Log de sistema (com throttling)
   */
  system(message, ...args) {
    if (!this.isThrottled('system', 'info')) {
      console.log(`⚙️ ${message}`, ...args);
    }
  }

  /**
   * Limpar cache de throttling
   */
  clearThrottle() {
    this.logThrottle.clear();
  }

  /**
   * Configurar nível de log
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Obter configuração atual
   */
  getConfig() {
    return {
      logLevel: this.logLevel,
      enableDebug: this.enableDebug,
      enableVerbose: this.enableVerbose,
      enableWhatsAppLogs: this.enableWhatsAppLogs,
      enableDatabaseLogs: this.enableDatabaseLogs,
      enableCacheLogs: this.enableCacheLogs,
      throttleTimeout: this.throttleTimeout
    };
  }
}

// Instância singleton
const logger = new Logger();

module.exports = logger;
