const TenantBaileyConfig = require('../config/TenantBaileyConfig');
const path = require('path');
const fs = require('fs');

/**
 * Serviço para gerenciar múltiplas conexões WhatsApp (multi-tenant)
 * Cada usuário automaticamente tem seu próprio tenant
 */
class MultiTenantWhatsAppService {
  constructor() {
    this.tenantConnections = new Map(); // Map<tenantId, TenantBaileyConfig>
    this.authBasePath = path.join(__dirname, '../../data/whatsapp-auth');
    this.ensureAuthDirectory();
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
   * Obtém status da conexão de um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object} - Status da conexão
   */
  getTenantConnectionStatus(tenantId) {
    const connection = this.tenantConnections.get(tenantId.toString());
    
    if (!connection) {
      return {
        tenantId: tenantId.toString(),
        exists: false,
        isConnected: false,
        user: null,
        qrGenerated: false,
        qrData: null,
        message: 'Sem conexão inicializada para este tenant'
      };
    }

    return connection.getConnectionStatus();
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
      const tenantIdStr = tenantId.toString();
      
      // Verificar se já existe conexão ativa
      if (this.tenantConnections.has(tenantIdStr)) {
        console.log(`⚠️ Conexão já existe para tenant ${tenantIdStr}`);
        const existingConnection = this.tenantConnections.get(tenantIdStr);
        if (existingConnection.isConnected) {
          return {
            success: true,
            message: 'Conexão já ativa para este tenant',
            tenantId: tenantIdStr,
            connectionStatus: existingConnection.getConnectionStatus()
          };
        }
      }

      // Criar diretório de autenticação específico do tenant
      console.log(`📁 Criando diretório de autenticação para tenant ${tenantIdStr}...`);
      const tenantAuthPath = path.join(this.authBasePath, tenantIdStr);
      
      // Configurar callbacks
      console.log(`🔧 Configurando callbacks para tenant ${tenantIdStr}...`);
      const callbacks = {
        onQRCode: async (qr) => {
          console.log(`📱 QR Code gerado para tenant ${tenantIdStr}`);
          // Chamar callback registrado se existir
          const registeredCallback = this.qrCallbacks?.get(tenantIdStr);
          if (registeredCallback) {
            registeredCallback(qr);
          }
        },
        onConnected: async (user) => {
          console.log(`✅ WhatsApp conectado para tenant ${tenantIdStr}: ${user?.name || 'Desconhecido'}`);
        },
        onDisconnected: async (reason) => {
          console.log(`❌ WhatsApp desconectado para tenant ${tenantIdStr}:`, reason);
        },
        onMessageReceived: async (message) => {
          console.log(`📨 Mensagem recebida no tenant ${tenantIdStr}:`, message);
        }
      };

      // Criar nova instância de configuração
      console.log(`🔧 Criando TenantBaileyConfig para tenant ${tenantIdStr}...`);
      const tenantConfig = new TenantBaileyConfig(tenantIdStr, tenantAuthPath, {
        ...options,
        ...callbacks
      });

      // Inicializar conexão
      console.log(`🚀 Inicializando conexão Baileys para tenant ${tenantIdStr}...`);
      await tenantConfig.initialize();
      console.log(`✅ Conexão Baileys inicializada para tenant ${tenantIdStr}`);
      
      // Armazenar conexão
      console.log(`💾 Armazenando conexão para tenant ${tenantIdStr}...`);
      this.tenantConnections.set(tenantIdStr, tenantConfig);

      console.log(`✅ Conexão inicializada com sucesso para tenant ${tenantIdStr}`);
      return {
        success: true,
        message: 'Conexão inicializada para tenant',
        tenantId: tenantIdStr,
        connectionStatus: tenantConfig.getConnectionStatus()
      };

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
      const tenantIdStr = tenantId.toString();
      const connection = this.tenantConnections.get(tenantIdStr);
      
      if (!connection) {
        return {
          success: false,
          message: 'Conexão não encontrada para este tenant',
          tenantId: tenantIdStr
        };
      }

      await connection.close();
      this.tenantConnections.delete(tenantIdStr);

      return {
        success: true,
        message: 'Tenant desconectado com sucesso',
        tenantId: tenantIdStr
      };

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
   * Obtém status de todas as conexões
   * @returns {Object} - Status de todas as conexões
   */
  getAllConnectionsStatus() {
    const connections = {};
    
    this.tenantConnections.forEach((connection, tenantId) => {
      connections[tenantId] = connection.getConnectionStatus();
    });

    return {
      totalConnections: this.tenantConnections.size,
      connections
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
      const tenantIdStr = tenantId.toString();
      const connection = this.tenantConnections.get(tenantIdStr);
      
      if (!connection) {
        throw new Error('Conexão não encontrada para este tenant');
      }

      if (!connection.isConnected) {
        throw new Error('WhatsApp não está conectado para este tenant');
      }

      const result = await connection.sendTextMessage(to, message);
      
      return {
        success: true,
        message: 'Mensagem enviada com sucesso',
        result
      };

    } catch (error) {
      console.error(`Erro ao enviar mensagem para tenant ${tenantId}:`, error);
      return {
        success: false,
        message: `Erro ao enviar mensagem: ${error.message}`
      };
    }
  }

  /**
   * Obtém status de conexão de um tenant específico
   * @param {string|number} tenantId - ID do tenant
   * @returns {Object} - Status da conexão
   */
  getConnectionStatus(tenantId) {
    const tenantIdStr = tenantId.toString();
    const connection = this.tenantConnections.get(tenantIdStr);

    if (!connection) {
      return {
        isConnected: false,
        qrGenerated: false,
        connectionStatus: 'not_found',
        message: 'Conexão não encontrada'
      };
    }

    return connection.getConnectionStatus();
  }

  /**
   * Registra callback para capturar QR Code
   */
  registerQRCallback(tenantId, callback) {
    const tenantIdStr = tenantId.toString();
    const connection = this.tenantConnections.get(tenantIdStr);
    
    if (connection && connection.socket) {
      // Se já existe conexão, registrar callback diretamente
      connection.onQRCode = callback;
    } else {
      // Se não existe conexão, armazenar callback para quando for criada
      this.qrCallbacks = this.qrCallbacks || new Map();
      this.qrCallbacks.set(tenantIdStr, callback);
    }
  }

  /**
   * Registra callback para capturar mensagens recebidas
   */
  registerMessageCallback(tenantId, callback) {
    const tenantIdStr = tenantId.toString();
    const connection = this.tenantConnections.get(tenantIdStr);
    
    if (connection && connection.socket) {
      // Se já existe conexão, registrar callback diretamente
      connection.onMessageReceived = callback;
    } else {
      // Se não existe conexão, armazenar callback para quando for criada
      this.messageCallbacks = this.messageCallbacks || new Map();
      this.messageCallbacks.set(tenantIdStr, callback);
    }
  }

  /**
   * Limpa conexões inativas (não conectadas há mais de X minutos)
   */
  async cleanupInactiveConnections() {
    const inactiveTimeout = 30 * 60 * 1000; // 30 minutos
    const now = Date.now();
    const toRemove = [];

    this.tenantConnections.forEach((connection, tenantId) => {
      if (!connection.isConnected && (now - connection.lastActivity) > inactiveTimeout) {
        toRemove.push(tenantId);
      }
    });

    for (const tenantId of toRemove) {
      try {
        const connection = this.tenantConnections.get(tenantId);
        await connection.close();
        this.tenantConnections.delete(tenantId);
        console.log(`🧹 Conexão inativa removida para tenant ${tenantId}`);
      } catch (error) {
        console.error(`Erro ao remover conexão inativa para tenant ${tenantId}:`, error);
      }
    }
  }

  /**
   * Limpa todas as conexões
   */
  async cleanup() {
    const promises = [];

    this.tenantConnections.forEach((connection, tenantId) => {
      promises.push(connection.close());
    });

    await Promise.all(promises);
    this.tenantConnections.clear();
  }
}

module.exports = new MultiTenantWhatsAppService();