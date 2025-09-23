// Dynamic import para módulo ESM
let makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers;

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
    Browsers = baileys.Browsers;
  }
  return { makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers };
}
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

/**
 * Configuração do WhatsApp Web usando Baileys
 * Gerencia conexão, autenticação e eventos
 */
class BaileyConfig {

  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.authFolder = path.join(__dirname, '../../data/whatsapp-auth');
    this.qrCodeGenerated = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;

    // Callbacks para eventos
    this.onMessageReceived = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onQRCode = null;

    // Configurações de reconexão
    this.reconnectDelay = 5000; // 5 segundos
    this.maxReconnectDelay = 300000; // 5 minutos
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    // Logger (configuração simples)
    try {
      this.logger = pino({
        level: process.env.LOG_LEVEL || 'info'
      });
    } catch (error) {
      // Fallback para console.log se pino falhar
      this.logger = {
        info: (...args) => console.log('[INFO]', ...args),
        warn: (...args) => console.warn('[WARN]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        debug: (...args) => console.debug('[DEBUG]', ...args)
      };
    }
  }

  /**
   * Inicializa a conexão com WhatsApp
   */
  async initialize() {
    try {
      this.logger.info('🚀 Inicializando WhatsApp Bot...');

      // Carregar Baileys dinamicamente
      const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers } = await loadBaileys();

      // Garantir que pasta de auth existe
      this.ensureAuthFolder();

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
        browser: Browsers.macOS('Desktop'),
        generateHighQualityLinkPreview: false,

        // Configurações de conexão
        connectTimeoutMs: 60000,
        qrTimeout: 40000,
        defaultQueryTimeoutMs: 60000,

        // Configurações de cache e performance
        cachedGroupMetadata: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,

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
      this.socket.authState = { creds: state.creds, keys: state.keys };
      this.socket.saveCreds = saveCreds;

      this.logger.info('✅ Configuração do WhatsApp inicializada');

      return this.socket;

    } catch (error) {
      this.logger.error('❌ Erro ao inicializar WhatsApp:', error);
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
        this.handleQRCode(qr);
      }

      if (connection === 'close') {
        this.handleDisconnection(lastDisconnect);
      } else if (connection === 'open') {
        this.handleConnection();
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
      this.logger.debug('📱 Contatos atualizados:', contacts.length);
    });

    // Evento de chats atualizados
    this.socket.ev.on('chats.update', (chats) => {
      this.logger.debug('💬 Chats atualizados:', chats.length);
    });
  }

  /**
   * Trata geração de QR Code
   */
  handleQRCode(qr) {
    this.qrCodeGenerated = true;
    this.logger.info('📱 QR Code gerado! Escaneie com seu WhatsApp:');

    // Exibir QR no terminal
    qrcode.generate(qr, { small: true });

    // Chamar callback se definido
    if (this.onQRCode) {
      this.onQRCode(qr);
    }
  }

  /**
   * Trata conexão estabelecida
   */
  handleConnection() {
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.reconnectAttempts = 0;
    this.qrCodeGenerated = false;

    this.logger.info('✅ WhatsApp conectado com sucesso!');
    this.logger.info(`📱 Número: ${this.socket.user?.id || 'Desconhecido'}`);
    this.logger.info(`👤 Nome: ${this.socket.user?.name || 'Desconhecido'}`);

    // Chamar callback se definido
    if (this.onConnected) {
      this.onConnected(this.socket.user);
    }
  }

  /**
   * Trata desconexão
   */
  async handleDisconnection(lastDisconnect) {
    this.isConnected = false;

    const shouldReconnect = lastDisconnect?.error instanceof Boom;
    const errorCode = lastDisconnect?.error?.output?.statusCode;

    this.logger.warn('❌ WhatsApp desconectado');

    if (shouldReconnect) {
      const reason = DisconnectReason[errorCode] || 'Desconhecido';

      this.logger.warn(`🔄 Motivo da desconexão: ${reason} (${errorCode})`);

      // Decidir se deve reconectar baseado no código de erro
      if (this.shouldReconnect(errorCode)) {
        await this.attemptReconnect();
      } else {
        this.logger.error('🚫 Não será feita reconexão automática');
        if (this.onDisconnected) {
          this.onDisconnected(lastDisconnect);
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
      this.logger.error('❌ Erro ao processar mensagens:', error);
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
      this.logger.error('❌ Erro ao processar mensagem individual:', error);
    }
  }

  /**
   * Trata atualização de credenciais
   */
  handleCredentialsUpdate(creds) {
    this.logger.debug('🔐 Credenciais atualizadas');
  }

  /**
   * Decide se deve reconectar baseado no código de erro
   */
  shouldReconnect(errorCode) {
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
      this.logger.error('🚫 Número máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    this.logger.info(`🔄 Tentando reconectar em ${delay / 1000} segundos... (Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        this.logger.error('❌ Erro na reconexão:', error);
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
        raw: message
      };

    } catch (error) {
      this.logger.error('❌ Erro ao fazer parse da mensagem:', error);
      return null;
    }
  }

  /**
   * Envia mensagem de texto
   */
  async sendTextMessage(to, text) {
    if (!this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const result = await this.socket.sendMessage(to, { text });
      this.logger.debug(`📤 Mensagem enviada para ${to}: ${text.substring(0, 50)}...`);
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao enviar mensagem de texto:', error);
      throw error;
    }
  }

  /**
   * Envia mensagem com botões
   */
  async sendButtonMessage(to, text, buttons) {
    if (!this.isConnected) {
      throw new Error('WhatsApp não está conectado');
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
      this.logger.error('❌ Erro ao enviar mensagem com botões:', error);
      throw error;
    }
  }

  /**
   * Envia mensagem com lista
   */
  async sendListMessage(to, text, sections) {
    if (!this.isConnected) {
      throw new Error('WhatsApp não está conectado');
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
      this.logger.error('❌ Erro ao enviar mensagem com lista:', error);
      throw error;
    }
  }

  /**
   * Envia imagem
   */
  async sendImage(to, imagePath, caption = '') {
    if (!this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const result = await this.socket.sendMessage(to, {
        image: fs.readFileSync(imagePath),
        caption
      });

      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao enviar imagem:', error);
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
      this.logger.error('❌ Erro ao marcar mensagem como lida:', error);
    }
  }

  /**
   * Obtém status da conexão
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      user: this.socket?.user || null,
      qrGenerated: this.qrCodeGenerated,
      connectionAttempts: this.connectionAttempts,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Garante que pasta de autenticação existe
   */
  ensureAuthFolder() {
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
      this.logger.info(`📁 Pasta de autenticação criada: ${this.authFolder}`);
    }
  }

  /**
   * Limpa dados de autenticação (logout)
   */
  async logout() {
    try {
      if (this.socket) {
        await this.socket.logout();
      }

      // Remover arquivos de autenticação
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        this.logger.info('🗑️ Dados de autenticação removidos');
      }

      this.isConnected = false;
      this.qrCodeGenerated = false;

    } catch (error) {
      this.logger.error('❌ Erro ao fazer logout:', error);
      throw error;
    }
  }

  /**
   * Define callbacks para eventos
   */
  setCallbacks(callbacks) {
    if (callbacks.onMessageReceived) {
      this.onMessageReceived = callbacks.onMessageReceived;
    }
    if (callbacks.onConnected) {
      this.onConnected = callbacks.onConnected;
    }
    if (callbacks.onDisconnected) {
      this.onDisconnected = callbacks.onDisconnected;
    }
    if (callbacks.onQRCode) {
      this.onQRCode = callbacks.onQRCode;
    }
  }

  /**
   * Fecha conexão
   */
  async close() {
    if (this.socket) {
      this.socket.end();
      this.isConnected = false;
      this.logger.info('🔌 Conexão WhatsApp fechada');
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

// Exportar apenas a classe, não uma instância
// O sistema multi-tenant agora usa TenantBaileyConfig
module.exports = BaileyConfig;
