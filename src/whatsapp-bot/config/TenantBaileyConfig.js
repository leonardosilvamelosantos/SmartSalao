// Dynamic import para módulo ESM
let makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore;
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

/**
 * Carrega o Baileys dinamicamente (ESM)
 */
async function loadBaileys() {
  if (!makeWASocket) {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.default;
    DisconnectReason = baileys.DisconnectReason;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
  }
  return { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore };
}

/**
 * Configuração do WhatsApp Web usando Baileys para um tenant específico
 * Esta classe pode ser instanciada múltiplas vezes para diferentes tenants
 */
class TenantBaileyConfig {

  constructor(tenantId, authFolder, options = {}) {
    this.tenantId = tenantId;
    this.authFolder = authFolder;
    this.isConnected = false;
    this.qrCodeGenerated = false;
    this.qrData = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = options.maxConnectionAttempts || 5;
    this.lastActivity = Date.now();

    // Configurações de reconexão
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.maxReconnectDelay = options.maxReconnectDelay || 300000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

    // Socket e estado
    this.socket = null;
    this.authState = null;

    // Callbacks
    this.onQRCode = options.onQRCode || null;
    this.onConnected = options.onConnected || null;
    this.onDisconnected = options.onDisconnected || null;
    this.onMessageReceived = options.onMessageReceived || null;

    // Logger específico do tenant (usando configuração simples)
    try {
      this.logger = pino({
        level: options.logLevel || 'info'
      }).child({ tenantId });
    } catch (error) {
      // Fallback para console.log se pino falhar
      this.logger = {
        info: (...args) => console.log(`[INFO][${tenantId}]`, ...args),
        warn: (...args) => console.warn(`[WARN][${tenantId}]`, ...args),
        error: (...args) => console.error(`[ERROR][${tenantId}]`, ...args),
        debug: (...args) => console.debug(`[DEBUG][${tenantId}]`, ...args),
        child: () => this.logger // Adicionar método child para compatibilidade
      };
    }

    // Garantir que pasta de auth existe
    this.ensureAuthFolder();
  }

  /**
   * Inicializa a conexão WhatsApp para este tenant
   */
  async initialize() {
    try {
      this.logger.info(`🚀 Inicializando WhatsApp para tenant ${this.tenantId}`);

      // Carregar Baileys dinamicamente
      const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = await loadBaileys();

      // Configurar estado de autenticação
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

      // Criar socket do WhatsApp
      this.socket = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger)
        },
        printQRInTerminal: false, // Desabilitar QR automático
        logger: this.logger,
        browser: ['Desktop', 'Windows', '1.0.0'],
        markOnlineOnConnect: false,
        retryRequestDelayMs: 250,
        generateHighQualityLinkPreview: false,

        // Configurações de conexão
        connectTimeoutMs: 60000,
        qrTimeout: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        shouldSyncHistoryMessage: false,
        shouldIgnoreJid: () => false,

        // Configurações de cache e performance
        cachedGroupMetadata: true,
        syncFullHistory: false,

        // Configurações de mídia
        patchMessageBeforeSending: (message) => {
          const requiresPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
          );
          if (requiresPatch) {
            message = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                  },
                  ...message
                }
              }
            };
          }
          return message;
        }
      });

      // Configurar event listeners
      this.setupEventListeners();

      // Salvar credenciais quando atualizadas
      this.authState = { creds: state.creds, keys: state.keys };
      this.socket.saveCreds = saveCreds;

      this.connectionAttempts++;
      this.logger.info(`✅ Configuração inicializada para tenant ${this.tenantId}`);

      return this.socket;

    } catch (error) {
      this.logger.error(`❌ Erro ao inicializar tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Configura os listeners de eventos
   */
  setupEventListeners() {
    // Evento de conexão
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !this.qrCodeGenerated) {
        await this.handleQRCode(qr);
      }

      if (connection === 'close') {
        await this.handleDisconnection(lastDisconnect);
      } else if (connection === 'open') {
        await this.handleConnection();
      }
    });

    // Evento de mensagens
    this.socket.ev.on('messages.upsert', async (m) => {
      await this.handleMessages(m);
    });

    // Evento de atualização de credenciais
    this.socket.ev.on('creds.update', (creds) => {
      this.handleCredentialsUpdate(creds);
    });

    // Evento de contatos atualizados
    this.socket.ev.on('contacts.update', (contacts) => {
      this.logger.debug(`📱 Contatos atualizados: ${contacts.length}`);
    });

    // Evento de chats atualizados
    this.socket.ev.on('chats.update', (chats) => {
      this.logger.debug(`💬 Chats atualizados: ${chats.length}`);
    });
  }

  /**
   * Trata geração de QR Code
   */
  async handleQRCode(qr) {
    this.qrCodeGenerated = true;
    this.qrData = qr; // Armazenar QR para uso posterior
    this.logger.info(`📱 QR Code gerado para tenant ${this.tenantId}`);

    // Exibir QR no terminal com identificação do tenant
    console.log(`\n🌟 TENANT: ${this.tenantId}`);
    try {
      qrcode.generate(qr, { small: true });
    } catch (error) {
      console.log(`QR Code: ${qr}`);
    }
    console.log(`\n`);

    // Chamar callback se definido
    if (this.onQRCode) {
      try {
        await this.onQRCode(qr);
      } catch (callbackError) {
        this.logger.error(`Erro no callback QR Code: ${callbackError.message}`);
      }
    }
  }

  /**
   * Trata conexão estabelecida
   */
  async handleConnection() {
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.reconnectAttempts = 0;
    this.qrCodeGenerated = false;

    this.logger.info(`✅ WhatsApp conectado para tenant ${this.tenantId}!`);
    this.logger.info(`👤 Usuário: ${this.socket.user?.name || 'Desconhecido'} (${this.socket.user?.id || 'N/A'})`);

    // Chamar callback se definido
    if (this.onConnected) {
      await this.onConnected(this.socket.user);
    }
  }

  /**
   * Trata desconexão
   */
  async handleDisconnection(lastDisconnect) {
    this.isConnected = false;

    const shouldReconnect = lastDisconnect?.error instanceof Boom;
    const errorCode = lastDisconnect?.error?.output?.statusCode;

    this.logger.warn(`❌ WhatsApp desconectado para tenant ${this.tenantId}`);

    if (shouldReconnect) {
      const { DisconnectReason } = await loadBaileys();
      const reason = DisconnectReason[errorCode] || 'Desconhecido';

      this.logger.warn(`🔄 Motivo da desconexão: ${reason} (${errorCode})`);

      // Decidir se deve reconectar baseado no código de erro
      if (await this.shouldReconnect(errorCode)) {
        await this.attemptReconnect();
      } else {
        this.logger.error(`🚫 Não será feita reconexão automática para tenant ${this.tenantId}`);
        if (this.onDisconnected) {
          await this.onDisconnected(lastDisconnect);
        }
      }
    }
  }

  /**
   * Trata mensagens recebidas
   */
  async handleMessages(m) {
    try {
      // Filtrar apenas mensagens recebidas (não enviadas por nós)
      const receivedMessages = m.messages.filter(msg =>
        !msg.key.fromMe &&
        msg.message &&
        !msg.message.protocolMessage // Ignorar mensagens de protocolo
      );

      for (const message of receivedMessages) {
        await this.processMessage(message);
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao processar mensagens para tenant ${this.tenantId}:`, error);
    }
  }

  /**
   * Processa mensagem individual
   */
  async processMessage(message) {
    try {
      // Extrair informações da mensagem
      const messageData = this.parseMessage(message);

      if (!messageData) {
        return; // Mensagem inválida ou não suportada
      }

      this.logger.debug(`📨 Mensagem de ${messageData.from}: ${messageData.content.substring(0, 100)}...`);

      // Chamar callback se definido
      if (this.onMessageReceived) {
        await this.onMessageReceived(messageData);
      }

    } catch (error) {
      this.logger.error(`❌ Erro ao processar mensagem individual para tenant ${this.tenantId}:`, error);
    }
  }

  /**
   * Trata atualização de credenciais
   */
  handleCredentialsUpdate(creds) {
    this.logger.debug(`🔐 Credenciais atualizadas para tenant ${this.tenantId}`);
  }

  /**
   * Decide se deve reconectar baseado no código de erro
   */
  async shouldReconnect(errorCode) {
    const { DisconnectReason } = await loadBaileys();
    const nonReconnectableCodes = [
      DisconnectReason.loggedOut,
      DisconnectReason.badSession,
      DisconnectReason.deviceRemoved
    ];

    return !nonReconnectableCodes.includes(errorCode);
  }

  /**
   * Tenta reconectar
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`🚫 Número máximo de tentativas de reconexão atingido para tenant ${this.tenantId}`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    this.logger.info(`🔄 Tentando reconectar tenant ${this.tenantId} em ${delay / 1000} segundos... (Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        this.logger.error(`❌ Erro na reconexão do tenant ${this.tenantId}:`, error);
      }
    }, delay);
  }

  /**
   * Parse da mensagem para formato padronizado
   */
  parseMessage(message) {
    try {
      const messageType = Object.keys(message.message)[0];
      let content = '';
      let mediaData = null;

      switch (messageType) {
        case 'conversation':
          content = message.message.conversation;
          break;

        case 'extendedTextMessage':
          content = message.message.extendedTextMessage.text;
          break;

        case 'imageMessage':
          content = message.message.imageMessage.caption || '[Imagem]';
          mediaData = {
            type: 'image',
            url: message.message.imageMessage.url,
            mimetype: message.message.imageMessage.mimetype
          };
          break;

        case 'videoMessage':
          content = message.message.videoMessage.caption || '[Vídeo]';
          mediaData = {
            type: 'video',
            url: message.message.videoMessage.url,
            mimetype: message.message.videoMessage.mimetype
          };
          break;

        case 'audioMessage':
          content = '[Áudio]';
          mediaData = {
            type: 'audio',
            url: message.message.audioMessage.url,
            mimetype: message.message.audioMessage.mimetype
          };
          break;

        case 'documentMessage':
          content = message.message.documentMessage.caption || '[Documento]';
          mediaData = {
            type: 'document',
            url: message.message.documentMessage.url,
            mimetype: message.message.documentMessage.mimetype,
            filename: message.message.documentMessage.fileName
          };
          break;

        case 'contactMessage':
          content = '[Contato]';
          break;

        case 'locationMessage':
          content = '[Localização]';
          break;

        case 'stickerMessage':
          content = '[Sticker]';
          break;

        default:
          // Tipo de mensagem não suportado
          return null;
      }

      return {
        id: message.key.id,
        from: message.key.remoteJid,
        to: message.key.remoteJid,
        content: content,
        type: messageType,
        timestamp: message.messageTimestamp,
        media: mediaData,
        context: message.contextInfo,
        tenantId: this.tenantId,
        raw: message
      };

    } catch (error) {
      this.logger.error(`❌ Erro ao fazer parse da mensagem para tenant ${this.tenantId}:`, error);
      return null;
    }
  }

  /**
   * Envia mensagem de texto
   */
  async sendTextMessage(to, text) {
    if (!this.isConnected) {
      throw new Error(`WhatsApp não está conectado para tenant ${this.tenantId}`);
    }

    try {
      const result = await this.socket.sendMessage(to, { text });
      this.logger.debug(`📤 Mensagem enviada para ${to} (tenant ${this.tenantId}): ${text.substring(0, 50)}...`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar mensagem para tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Envia mensagem com botões
   */
  async sendButtonMessage(to, text, buttons) {
    if (!this.isConnected) {
      throw new Error(`WhatsApp não está conectado para tenant ${this.tenantId}`);
    }

    try {
      const result = await this.socket.sendMessage(to, {
        text,
        buttons: buttons.map(button => ({
          buttonId: button.id,
          buttonText: { displayText: button.text },
          type: 1
        })),
        headerType: 1
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar mensagem com botões para tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Envia mensagem com lista
   */
  async sendListMessage(to, text, sections) {
    if (!this.isConnected) {
      throw new Error(`WhatsApp não está conectado para tenant ${this.tenantId}`);
    }

    try {
      const result = await this.socket.sendMessage(to, {
        text,
        sections,
        buttonText: 'Ver opções',
        title: 'Selecione uma opção'
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar mensagem com lista para tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markAsRead(messageKey) {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.socket.readMessages([messageKey]);
    } catch (error) {
      this.logger.error(`❌ Erro ao marcar mensagem como lida para tenant ${this.tenantId}:`, error);
    }
  }

  /**
   * Obtém status da conexão
   */
  getConnectionStatus() {
    return {
      tenantId: this.tenantId,
      isConnected: this.isConnected,
      user: this.socket?.user || null,
      qrGenerated: this.qrCodeGenerated,
      qrData: this.qrData,
      connectionAttempts: this.connectionAttempts,
      reconnectAttempts: this.reconnectAttempts,
      lastActivity: new Date()
    };
  }

  /**
   * Garante que pasta de autenticação existe
   */
  ensureAuthFolder() {
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
      this.logger.info(`📁 Pasta de autenticação criada para tenant ${this.tenantId}: ${this.authFolder}`);
    }
  }

  /**
   * Faz logout (remove dados de autenticação)
   */
  async logout() {
    try {
      if (this.socket) {
        await this.socket.logout();
      }

      // Remover arquivos de autenticação
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        this.logger.info(`🗑️ Dados de autenticação removidos para tenant ${this.tenantId}`);
      }

      this.isConnected = false;
      this.qrCodeGenerated = false;

    } catch (error) {
      this.logger.error(`❌ Erro no logout para tenant ${this.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Fecha conexão
   */
  async close() {
    if (this.socket) {
      this.socket.end();
      this.isConnected = false;
      this.logger.info(`🔌 Conexão fechada para tenant ${this.tenantId}`);
    }
  }

  /**
   * Reinicializa conexão
   */
  async restart() {
    await this.close();
    await this.initialize();
  }
}

module.exports = TenantBaileyConfig;
