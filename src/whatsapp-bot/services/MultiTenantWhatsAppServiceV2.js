const InstanceManager = require('../core/InstanceManager');
const SessionManager = require('../core/SessionManager');
const path = require('path');
const fs = require('fs');

/**
 * Serviço Multi-Tenant WhatsApp V2
 * Integra com o novo InstanceManager e SessionManager
 * Mantém compatibilidade com o sistema existente
 */
class MultiTenantWhatsAppServiceV2 {
  constructor() {
    this.instanceManager = new InstanceManager();
    this.sessionManager = new SessionManager();
    this.authBasePath = path.join(__dirname, '../../data/whatsapp-auth');
    this.ensureAuthDirectory();
    
    // Cache para status
    this.statusCache = new Map();
    this.cacheTimeout = 5000; // 5 segundos
  }

  /**
   * Garante que o diretório de autenticação existe
   */
  ensureAuthDirectory() {
    if (!fs.existsSync(this.authBasePath)) {
      fs.mkdirSync(this.authBasePath, { recursive: true });
    }
  }

  /**
   * Lista todos os tenants (usuários) com suas conexões
   * @param {number} userTenantId - ID do tenant do usuário logado (opcional)
   * @returns {Array} - Lista de tenants
   */
  async getAllTenants(userTenantId = null) {
    try {
      // Buscar usuários do banco de dados
      const Usuario = require('../../models/Usuario');
      let usuarios;
      
      if (userTenantId) {
        // Filtrar apenas usuários do mesmo tenant
        usuarios = await Usuario.findByTenant(userTenantId);
      } else {
        // Buscar todos os usuários (comportamento antigo para admin)
        usuarios = await Usuario.findAll();
      }
      
      return usuarios.map(usuario => {
        const tenantId = usuario.id_tenant || usuario.id_usuario;
        const connectionStatus = this.getTenantConnectionStatus(tenantId);
        
        return {
          tenantId: tenantId.toString(),
          name: usuario.nome || `Usuário ${tenantId}`,
          email: usuario.email,
          status: connectionStatus
        };
      });
    } catch (error) {
      console.error('Erro ao buscar tenants do banco:', error);
      return [];
    }
  }

  /**
   * Obtém status da conexão de um tenant específico (com cache)
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object} - Status da conexão
   */
  getTenantConnectionStatus(tenantId) {
    const cacheKey = `status_${tenantId}`;
    const now = Date.now();
    
    // Verificar cache
    const cached = this.statusCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    
    const instanceStatus = this.instanceManager.getInstanceStatus(tenantId.toString());
    
    let result;
    if (!instanceStatus.success) {
      result = {
        tenantId: tenantId.toString(),
        exists: false,
        isConnected: false,
        user: null,
        qrGenerated: false,
        qrData: null,
        message: 'Sem conexão inicializada para este tenant'
      };
    } else {
      result = {
        tenantId: tenantId.toString(),
        exists: true,
        isConnected: instanceStatus.isConnected,
        user: instanceStatus.user,
        qrGenerated: !!instanceStatus.qrCode,
        qrData: instanceStatus.qrCode,
        message: instanceStatus.isConnected ? 'Conectado' : 'Desconectado'
      };
    }
    
    // Salvar no cache
    this.statusCache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    
    return result;
  }

  /**
   * Limpa cache de status para um tenant específico
   * @param {string|number} tenantId - ID do tenant
   */
  clearStatusCache(tenantId = null) {
    if (tenantId) {
      this.statusCache.delete(`status_${tenantId}`);
    } else {
      this.statusCache.clear();
    }
  }

  /**
   * Inicializa conexão WhatsApp para um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Object>} - Status da inicialização
   */
  async initializeTenantConnection(tenantId, options = {}) {
    try {
      console.log(`🔧 Iniciando conexão para tenant ${tenantId}...`);
      
      const result = await this.instanceManager.createInstance(tenantId.toString(), options);
      
      if (result.success) {
        console.log(`✅ Conexão inicializada com sucesso para tenant ${tenantId}`);
      } else {
        console.log(`❌ Falha ao inicializar conexão para tenant ${tenantId}: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Erro ao inicializar conexão para tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao inicializar conexão: ${error.message}`,
        tenantId: tenantId.toString(),
        connectionStatus: null
      };
    }
  }

  /**
   * Desconecta um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @returns {Promise<Object>} - Status da desconexão
   */
  async disconnectTenant(tenantId) {
    try {
      const result = await this.instanceManager.removeInstance(tenantId.toString());
      
      if (result) {
        console.log(`✅ Tenant ${tenantId} desconectado com sucesso`);
        return {
          success: true,
          message: 'Tenant desconectado com sucesso',
          tenantId: tenantId.toString()
        };
      } else {
        return {
          success: false,
          message: 'Erro ao desconectar tenant',
          tenantId: tenantId.toString()
        };
      }
    } catch (error) {
      console.error(`Erro ao desconectar tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao desconectar: ${error.message}`,
        tenantId: tenantId.toString()
      };
    }
  }

  /**
   * Logout do tenant: limpa credenciais e remove sessão para forçar novo QR
   * @param {string|number} tenantId
   */
  async logoutTenant(tenantId) {
    try {
      const id = tenantId.toString();
      const instance = this.instanceManager.getInstance(id);

      // Limpar credenciais da instância se existir
      if (instance && typeof instance.clearExpiredSession === 'function') {
        await instance.clearExpiredSession();
      }

      // Remover diretório de autenticação por garantia
      const authPath = path.join(this.authBasePath, id);
      try {
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log(`🧹 Diretório de autenticação removido: ${authPath}`);
        }
      } catch (err) {
        console.error('Erro ao remover diretório de autenticação:', err.message);
      }

      // Remover instância do gerenciador e do banco
      await this.instanceManager.removeInstance(id);

      return { success: true, message: 'Sessão limpa. Pronta para novo QR.' };
    } catch (error) {
      console.error('Erro no logoutTenant:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtém status de todas as conexões
   * @returns {Object} - Status de todas as conexões
   */
  getAllConnectionsStatus() {
    const instances = this.instanceManager.getAllInstances();
    
    return {
      totalConnections: instances.length,
      connections: instances.reduce((acc, instance) => {
        acc[instance.tenantId] = {
          isConnected: instance.isConnected,
          qrGenerated: !!instance.qrCode,
          qrData: instance.qrCode,
          lastActivity: instance.lastActivity,
          connectionState: instance.connectionState
        };
        return acc;
      }, {})
    };
  }

  /**
   * Envia mensagem para um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @param {string} to - Destinatário
   * @param {string} message - Mensagem
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMessage(tenantId, to, message) {
    try {
      const result = await this.instanceManager.sendMessage(tenantId.toString(), to, message);
      
      if (result.success) {
        console.log(`📤 Mensagem enviada para ${to} no tenant ${tenantId}`);
      } else {
        console.log(`❌ Falha ao enviar mensagem para ${to} no tenant ${tenantId}: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao enviar mensagem: ${error.message}`
      };
    }
  }

  /**
   * Envia mídia para um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @param {string} to - Destinatário
   * @param {Object} media - Dados da mídia
   * @param {string} caption - Legenda
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMediaMessage(tenantId, to, media, caption = '') {
    try {
      const result = await this.instanceManager.sendMediaMessage(tenantId.toString(), to, media, caption);
      
      if (result.success) {
        console.log(`📤 Mídia enviada para ${to} no tenant ${tenantId}`);
      } else {
        console.log(`❌ Falha ao enviar mídia para ${to} no tenant ${tenantId}: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Erro ao enviar mídia para tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao enviar mídia: ${error.message}`
      };
    }
  }

  /**
   * Solicitar código de pareamento
   * @param {string|number} tenantId - ID do tenant
   * @param {string} phoneNumber - Número de telefone
   * @returns {Promise<Object>} - Resultado da solicitação
   */
  async requestPairingCode(tenantId, phoneNumber) {
    try {
      const result = await this.instanceManager.requestPairingCode(tenantId.toString(), phoneNumber);
      
      if (result.success) {
        console.log(`🔐 Código de pareamento gerado para tenant ${tenantId}`);
      } else {
        console.log(`❌ Falha ao gerar código de pareamento para tenant ${tenantId}: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Erro ao solicitar código de pareamento para tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao solicitar código de pareamento: ${error.message}`
      };
    }
  }

  /**
   * Obter código de pareamento
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object|null} - Código de pareamento ou null
   */
  getPairingCode(tenantId) {
    return this.instanceManager.getPairingCode(tenantId.toString());
  }

  /**
   * Obtém status de conexão de um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object} - Status da conexão
   */
  getConnectionStatus(tenantId) {
    const instanceStatus = this.instanceManager.getInstanceStatus(tenantId.toString());
    
    if (!instanceStatus.success) {
      return {
        isConnected: false,
        qrGenerated: false,
        connectionStatus: 'not_found',
        message: 'Conexão não encontrada'
      };
    }

    return {
      isConnected: instanceStatus.isConnected,
      qrGenerated: !!instanceStatus.qrCode,
      qrData: instanceStatus.qrCode,
      connectionStatus: instanceStatus.isConnected ? 'connected' : 'disconnected',
      message: instanceStatus.isConnected ? 'Conectado' : 'Desconectado'
    };
  }

  /**
   * Registra callback para capturar QR Code
   * @param {string|number} tenantId - ID do tenant
   * @param {Function} callback - Callback para QR Code
   */
  registerQRCallback(tenantId, callback) {
    const instance = this.instanceManager.getInstance(tenantId.toString());
    
    if (instance) {
      instance.on('qr_generated', callback);
    } else {
      console.log(`⚠️ Instância não encontrada para tenant ${tenantId}`);
    }
  }

  /**
   * Registra callback para mensagens
   * @param {string|number} tenantId - ID do tenant
   * @param {Function} callback - Callback para mensagens
   */
  registerMessageCallback(tenantId, callback) {
    const instance = this.instanceManager.getInstance(tenantId.toString());
    
    if (instance) {
      instance.on('message', callback);
    } else {
      console.log(`⚠️ Instância não encontrada para tenant ${tenantId}`);
    }
  }

  /**
   * Registra callback para conexão
   * @param {string|number} tenantId - ID do tenant
   * @param {Function} callback - Callback para conexão
   */
  registerConnectionCallback(tenantId, callback) {
    const instance = this.instanceManager.getInstance(tenantId.toString());
    
    if (instance) {
      instance.on('connected', () => callback({ type: 'connected' }));
      instance.on('disconnected', (data) => callback({ type: 'disconnected', ...data }));
    } else {
      console.log(`⚠️ Instância não encontrada para tenant ${tenantId}`);
    }
  }

  /**
   * Limpa conexões inativas
   * @returns {Promise<void>}
   */
  async cleanupInactiveConnections() {
    try {
      await this.instanceManager.cleanupInactiveInstances();
      console.log('🧹 Limpeza de conexões inativas concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza de conexões inativas:', error);
    }
  }

  /**
   * Obtém estatísticas do sistema
   * @param {string|number} tenantId - ID do tenant (opcional)
   * @returns {Promise<Object>} - Estatísticas
   */
  async getStats(tenantId = null) {
    try {
      const stats = await this.sessionManager.getStats(tenantId ? tenantId.toString() : null);
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém logs de mensagens
   * @param {string|number} tenantId - ID do tenant (opcional)
   * @param {number} limit - Limite de registros
   * @returns {Promise<Object>} - Logs de mensagens
   */
  async getMessageLogs(tenantId = null, limit = 100) {
    try {
      const logs = await this.sessionManager.getMessageLogs(
        tenantId ? tenantId.toString() : null, 
        limit
      );
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('❌ Erro ao obter logs de mensagens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpa todas as conexões
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await this.instanceManager.stop();
      console.log('🧹 Todas as conexões foram limpas');
    } catch (error) {
      console.error('❌ Erro ao limpar conexões:', error);
    }
  }

  /**
   * Obtém instância específica
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object|null} - Instância ou null
   */
  getInstance(tenantId) {
    return this.instanceManager.getInstance(tenantId.toString());
  }

  /**
   * Obtém status de uma instância específica
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object} - Status da instância
   */
  getInstanceStatus(tenantId) {
    if (process.env.LOG_WA_STATUS === 'true') {
      console.log(`🔍 Buscando status para tenant ${tenantId}...`);
    }
    const instance = this.instanceManager.getInstance(tenantId.toString());
    
    if (!instance) {
      console.log(`❌ Instância não encontrada para tenant ${tenantId}`);
      return {
        success: false,
        isConnected: false,
        qrCode: null,
        pairingCode: null,
        phoneNumber: null,
        connectionMethod: 'qr',
        lastActivity: null,
        connectionState: 'not_found',
        isConnecting: false,
        message: 'Instância não encontrada'
      };
    }

    const status = {
      success: true,
      isConnected: instance.isConnected,
      qrCode: instance.qrCode,
      pairingCode: instance.pairingCode,
      phoneNumber: instance.phoneNumber,
      connectionMethod: instance.connectionMethod || 'qr',
      lastActivity: instance.lastActivity,
      connectionState: instance.connectionState || 'disconnected',
      isConnecting: instance.isConnecting || false,
      tenantId: instance.tenantId
    };

    // Throttle simples para logs de status
    const now = Date.now();
    this._lastStatusLog = this._lastStatusLog || {};
    const last = this._lastStatusLog[tenantId] || 0;
    if (process.env.LOG_WA_STATUS === 'true' && now - last > 5000) {
      console.log(`📊 Status retornado para tenant ${tenantId}:`, {
        success: status.success,
        isConnected: status.isConnected,
        hasQrCode: !!status.qrCode,
        qrCodeType: typeof status.qrCode,
        qrCodeData: status.qrCode ? (typeof status.qrCode === 'string' ? 'dataurl' : 'obj') : 'null'
      });
      this._lastStatusLog[tenantId] = now;
    }

    return status;
  }

  /**
   * Lista todas as instâncias
   * @returns {Array} - Lista de instâncias
   */
  getAllInstances() {
    return this.instanceManager.getAllInstances();
  }

  /**
   * Para conexão de um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @returns {Promise<Object>} - Resultado da operação
   */
  async stopTenantConnection(tenantId) {
    try {
      console.log(`🛑 Parando conexão para tenant ${tenantId}...`);
      const result = await this.disconnectTenant(tenantId);
      console.log(`✅ Conexão parada para tenant ${tenantId}`);
      return result;
    } catch (error) {
      console.error(`❌ Erro ao parar conexão para tenant ${tenantId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MultiTenantWhatsAppServiceV2;
