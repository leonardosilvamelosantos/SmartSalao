const EventEmitter = require('events');

/**
 * Gerenciador de Conexões WhatsApp
 * Centraliza o controle de conexões e reconexões
 */
class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.reconnectQueue = new Map();
    this.maxRetries = 3;
    this.baseDelay = 5000; // 5 segundos
    this.maxDelay = 300000; // 5 minutos
    this.healthCheckInterval = 30000; // 30 segundos
    
    this.startHealthCheck();
  }

  /**
   * Registrar nova conexão
   */
  registerConnection(tenantId, instance) {
    this.connections.set(tenantId, {
      instance,
      status: 'connecting',
      retryCount: 0,
      lastAttempt: Date.now(),
      lastSuccess: null,
      errors: []
    });
  }

  /**
   * Atualizar status da conexão
   */
  updateStatus(tenantId, status, error = null) {
    const connection = this.connections.get(tenantId);
    if (!connection) return;

    connection.status = status;
    connection.lastAttempt = Date.now();
    
    if (status === 'connected') {
      connection.lastSuccess = Date.now();
      connection.retryCount = 0;
      connection.errors = [];
    } else if (error) {
      connection.errors.push({
        error: error.message || error,
        timestamp: Date.now()
      });
    }

    this.emit('statusChange', { tenantId, status, error });
  }

  /**
   * Verificar se deve reconectar
   */
  shouldReconnect(tenantId, errorCode) {
    const connection = this.connections.get(tenantId);
    if (!connection) return false;

    // Códigos que não devem reconectar
    const nonReconnectableCodes = [401, 403, 404, 428, 440];
    if (nonReconnectableCodes.includes(errorCode)) {
      return false;
    }

    // Verificar limite de tentativas
    if (connection.retryCount >= this.maxRetries) {
      return false;
    }

    // Verificar se já está conectado
    if (connection.status === 'connected') {
      return false;
    }

    return true;
  }

  /**
   * Agendar reconexão com backoff exponencial
   */
  scheduleReconnect(tenantId, errorCode = null) {
    const connection = this.connections.get(tenantId);
    if (!connection || !this.shouldReconnect(tenantId, errorCode)) {
      return;
    }

    // Cancelar reconexão anterior se existir
    if (this.reconnectQueue.has(tenantId)) {
      clearTimeout(this.reconnectQueue.get(tenantId));
    }

    connection.retryCount++;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, connection.retryCount - 1),
      this.maxDelay
    );

    console.log(`🔄 Agendando reconexão para tenant ${tenantId} em ${delay/1000}s (tentativa ${connection.retryCount}/${this.maxRetries})`);

    const timeoutId = setTimeout(() => {
      this.reconnectQueue.delete(tenantId);
      this.attemptReconnect(tenantId);
    }, delay);

    this.reconnectQueue.set(tenantId, timeoutId);
  }

  /**
   * Tentar reconectar
   */
  async attemptReconnect(tenantId) {
    const connection = this.connections.get(tenantId);
    if (!connection) return;

    try {
      console.log(`🔄 Tentando reconectar tenant ${tenantId}...`);
      this.updateStatus(tenantId, 'connecting');
      
      const result = await connection.instance.connect();
      
      if (result.success) {
        this.updateStatus(tenantId, 'connected');
        console.log(`✅ Tenant ${tenantId} reconectado com sucesso`);
      } else {
        this.updateStatus(tenantId, 'disconnected', result.error);
        this.scheduleReconnect(tenantId);
      }
    } catch (error) {
      console.error(`❌ Erro ao reconectar tenant ${tenantId}:`, error.message);
      this.updateStatus(tenantId, 'disconnected', error);
      this.scheduleReconnect(tenantId);
    }
  }

  /**
   * Verificação de saúde das conexões
   */
  startHealthCheck() {
    setInterval(() => {
      this.connections.forEach((connection, tenantId) => {
        if (connection.status === 'connected') {
          // Verificar se a conexão ainda está ativa
          if (connection.instance && !connection.instance.isConnected) {
            console.log(`⚠️ Conexão perdida detectada para tenant ${tenantId}`);
            this.updateStatus(tenantId, 'disconnected');
            this.scheduleReconnect(tenantId);
          }
        }
      });
    }, this.healthCheckInterval);
  }

  /**
   * Obter status de todas as conexões
   */
  getStatus() {
    const status = {};
    this.connections.forEach((connection, tenantId) => {
      status[tenantId] = {
        status: connection.status,
        retryCount: connection.retryCount,
        lastAttempt: connection.lastAttempt,
        lastSuccess: connection.lastSuccess,
        errorCount: connection.errors.length
      };
    });
    return status;
  }

  /**
   * Limpar conexão
   */
  cleanup(tenantId) {
    const connection = this.connections.get(tenantId);
    if (connection) {
      if (this.reconnectQueue.has(tenantId)) {
        clearTimeout(this.reconnectQueue.get(tenantId));
        this.reconnectQueue.delete(tenantId);
      }
      this.connections.delete(tenantId);
    }
  }

  /**
   * Limpar todas as conexões
   */
  cleanupAll() {
    this.connections.forEach((_, tenantId) => {
      this.cleanup(tenantId);
    });
  }
}

module.exports = ConnectionManager;
