const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Instância WhatsApp Unificada
 * Baseada no Multi Zap, adaptada para sistema de agendamentos
 */
class WhatsAppInstance extends EventEmitter {
  constructor(tenantId, options = {}) {
    super();
    this.tenantId = tenantId;
    this.sock = null;
    this.isConnected = false;
    this.qrCode = null;
    this.pairingCode = null;
    this.phoneNumber = options.phoneNumber || null;
    this.authDir = path.join('./data/whatsapp-auth', tenantId);
    this.options = {
      maxRetries: 3,
      retryDelay: 30000, // 30 segundos
      autoConnect: true, // Conectar automaticamente por padrão
      connectionMethod: 'qr', // 'qr' ou 'pairing'
      qrRefreshInterval: 30000, // 30 segundos para atualizar QR Code
      ...options
    };
    this.retryCount = 0;
    this.lastActivity = new Date();
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.qrGeneratedAt = null;
    this.qrRefreshTimer = null;
    this.reconnectTimeout = null;
    this.lastLoggedConnection = null;
    this._lastQrLogAt = 0;
    // Conversas ativadas via comando principal (!bot)
    this.activatedChats = new Set();
  }

  /**
   * Normaliza número/JID do WhatsApp
   * Aceita: "5511999999999" e converte para "5511999999999@s.whatsapp.net"
   */
  normalizeJid(to) {
    try {
      if (!to) return null;
      if (typeof to !== 'string') to = String(to);
      const trimmed = to.trim();
      if (trimmed.includes('@')) return trimmed; // já é JID
      const digits = trimmed.replace(/\D/g, '');
      if (!digits) return null;
      return `${digits}@s.whatsapp.net`;
    } catch (_) {
      return null;
    }
  }

  /**
   * Conectar instância
   * @returns {Promise<Object>} - Resultado da conexão
   */
  async connect() {
    if (this.isConnecting) {
      console.log(`⏳ Conexão já em andamento para tenant: ${this.tenantId}`);
      return { success: false, error: 'Conexão já em andamento' };
    }

    if (this.isConnected) {
      console.log(`⚠️ Já está conectado para tenant: ${this.tenantId}`);
      return { success: true, message: 'Já está conectado' };
    }

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log(`❌ Máximo de tentativas de conexão atingido para tenant: ${this.tenantId}`);
      return { success: false, error: 'Máximo de tentativas atingido' };
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log(`🚀 Iniciando instância WhatsApp para tenant: ${this.tenantId} (tentativa ${this.connectionAttempts}/${this.maxConnectionAttempts})`);

      // Importar Baileys dinamicamente
      const baileys = await import('@whiskeysockets/baileys');
      console.log('🔍 Baileys importado:', Object.keys(baileys));
      
      const { makeWASocket, useMultiFileAuthState } = baileys;
      console.log('🔍 makeWASocket:', typeof makeWASocket);
      console.log('🔍 useMultiFileAuthState:', typeof useMultiFileAuthState);

      // Criar diretório de sessão isolado
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Configurar estado de autenticação isolado
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // Aguardar um tempo aleatório antes de conectar (1-3 segundos)
      const randomDelay = Math.floor(Math.random() * 2000) + 1000;
      console.log(`⏳ Aguardando ${randomDelay}ms antes de conectar...`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      // Criar socket do WhatsApp com configurações otimizadas
      this.sock = makeWASocket({
        auth: state,
        // Mostrar QR ASCII no terminal apenas quando explicitamente habilitado
        printQRInTerminal: process.env.PRINT_QR_IN_TERMINAL === 'true',
        browser: ['AgendamentoApp', 'Chrome', `1.0.0-${this.tenantId}`],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 2,
        connectTimeoutMs: 60000,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: (jid) => false,
        msgRetryCounterCache: new Map(),
        getMessage: async (key) => {
          return {
            conversation: 'test'
          };
        },
        logger: {
          level: 'silent', // Reduzir logs para evitar spam
          child: () => ({ 
            level: 'silent',
            error: (msg) => console.error(`[Baileys-${this.tenantId}]`, msg),
            warn: (msg) => console.warn(`[Baileys-${this.tenantId}]`, msg),
            info: (msg) => {}, // Silenciar logs info
            debug: (msg) => {}, // Silenciar logs debug
            trace: () => {}
          }),
          error: (msg) => console.error(`[Baileys-${this.tenantId}]`, msg),
          warn: (msg) => console.warn(`[Baileys-${this.tenantId}]`, msg),
          info: (msg) => {}, // Silenciar logs info
          debug: (msg) => {}, // Silenciar logs debug
          trace: () => {}
        },
        
        // Configurações de buffer para evitar timeout
        bufferTimeoutMs: 60000, // 60 segundos
        maxMsgRetryCount: 3,
        retryRequestDelayMs: 2000,
        
        // Configurações de reconexão desabilitadas
        shouldReconnect: false,
        maxReconnectAttempts: 0,
        
        // Configurações adicionais para estabilidade
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        
        // Configurações de WebSocket
        ws: {
          timeout: 60000,
          keepAlive: true,
          keepAliveInterval: 30000
        }
      });

      // Configurar eventos
      this.setupEvents(saveCreds);

      console.log(`✅ Instância WhatsApp criada para tenant: ${this.tenantId}`);
      console.log(`🔍 Socket criado: ${!!this.sock}`);
      console.log(`🔍 Auth state: ${!!state}`);
      console.log(`🔍 Save creds: ${!!saveCreds}`);
      
      // Aguardar um pouco para ver se o QR é gerado
      console.log(`⏳ Aguardando geração do QR Code...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Se não gerou QR Code, tentar forçar
      if (!this.qrCode) {
        console.log(`🔄 QR Code não gerado automaticamente, tentando forçar...`);
        await this.forceQRGeneration();
      }
      
      return { success: true, tenantId: this.tenantId };

    } catch (error) {
      console.error(`❌ Erro ao criar instância para tenant ${this.tenantId}:`, error.message);
      this.isConnecting = false;
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Configurar eventos da instância
   * @param {Function} saveCreds - Função para salvar credenciais
   */
  setupEvents(saveCreds) {
    this.sock.ev.on('connection.update', (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;

        console.log(`🔍 connection.update recebido para tenant ${this.tenantId}:`, {
          connection,
          hasQr: !!qr,
          qrLength: qr ? qr.length : 0,
          lastDisconnect: !!lastDisconnect
        });

        // Logar transições de estado apenas quando mudarem
        if (connection !== this.lastLoggedConnection) {
          console.log(`🔄 connection.update → ${connection} | tenant ${this.tenantId}`);
          this.lastLoggedConnection = connection;
        }

        if (qr) {
          // Verificar se já está conectado antes de gerar QR
          if (this.isConnected) {
            console.log(`⚠️ Tenant ${this.tenantId} já está conectado, ignorando QR Code`);
            return;
          }
          
          const now = Date.now();
          if (process.env.LOG_WA_STATUS === 'true') {
            if (now - this._lastQrLogAt > 5000) {
              console.log(`📱 QR Code gerado (len=${qr.length}) para tenant ${this.tenantId}`);
              this._lastQrLogAt = now;
            }
          }
          // Imprimir QR ASCII somente se habilitado
          if (process.env.PRINT_QR_IN_TERMINAL === 'true') {
            try { qrcode.generate(qr, { small: true }); } catch(_) {}
          }

          // Gerar QR Code para interface web
          this.generateQRForWeb(qr);
          
          // Iniciar timer de atualização do QR Code
          this.startQRRefreshTimer();
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.output?.payload?.message || 'Unknown error';

          if (process.env.LOG_WA_STATUS === 'true') {
            console.log(`🔌 Conexão fechada para tenant ${this.tenantId} - Status: ${statusCode}, Mensagem: ${errorMessage}`);
          }

          this.isConnected = false;
          this.isConnecting = false;
          this.emit('disconnected', { statusCode, errorMessage });

          // Tratamento específico para diferentes erros
          if (statusCode === 401) {
            console.log(`🔑 Erro 401 (Credenciais expiradas) detectado para tenant ${this.tenantId}. Limpando sessão...`);
            this.clearExpiredSession();
            console.log(`🧹 Sessão limpa para tenant ${this.tenantId}. Use o dashboard para reconectar via QR Code.`);
            this.emit('credentials_expired', { statusCode, errorMessage });
            
            // Não tentar reconectar automaticamente - aguardar ação manual
            console.log(`⏸️ Tenant ${this.tenantId} aguardando reconexão manual via dashboard`);
            return;
          } else if (statusCode === 440) {
            console.log(`⚠️ Erro 440 (Stream Errored) detectado para tenant ${this.tenantId}. Tentando reconexão com backoff.`);
            this.scheduleReconnect(440);
          } else if (statusCode === 515) {
            console.log(`⚠️ Erro 515 detectado para tenant ${this.tenantId}. Tentando reconexão com backoff.`);
            this.scheduleReconnect(515);
          } else if (statusCode === 428) {
            console.log(`⚠️ Erro 428 detectado para tenant ${this.tenantId}. Tentando reconexão com backoff.`);
            this.scheduleReconnect(428);
          } else if (this.shouldReconnect(statusCode)) {
            this.scheduleReconnect(statusCode);
          } else {
            console.log(`❌ Erro crítico para tenant ${this.tenantId} (Status: ${statusCode}). Não tentando reconectar.`);
            this.emit('critical_error', { statusCode, errorMessage });
          }
        } else if (connection === 'open') {
          console.log(`✅ Tenant ${this.tenantId} conectado com sucesso!`);
          this.isConnected = true;
          this.isConnecting = false;
          this.retryCount = 0;
          this.connectionAttempts = 0;
          this.lastActivity = new Date();
          // Limpar QR Code quando conectado
          this.qrCode = null;
          this.qrGeneratedAt = null;
          // Parar timer de atualização do QR Code quando conectar
          this.stopQRRefreshTimer();
          // Cancelar reconexão agendada se existir
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.emit('connected');
        }
      } catch (error) {
        console.error(`❌ Erro no evento de conexão do tenant ${this.tenantId}:`, error.message);
        this.emit('error', error);
      }
    });

    this.sock.ev.on('creds.update', (creds) => {
      try {
        saveCreds(creds);
        console.log(`💾 Credenciais salvas para tenant ${this.tenantId}`);
      } catch (error) {
        console.error(`❌ Erro ao salvar credenciais do tenant ${this.tenantId}:`, error.message);
      }
    });

    this.sock.ev.on('messages.upsert', async (m) => {
      try {
        this.lastActivity = new Date();
        this.emit('message', m);
        // console.log(`📨 Nova mensagem recebida no tenant ${this.tenantId}`);
        
        // Processar gatilhos do bot
        await this.processBotTriggers(m);
      } catch (error) {
        console.error(`❌ Erro no evento de mensagem do tenant ${this.tenantId}:`, error.message);
      }
    });
  }

  /**
   * Verificar se deve reconectar
   * @param {number} statusCode - Código de status
   * @returns {boolean} - Se deve reconectar
   */
  shouldReconnect(statusCode) {
    // Erros que não devem ser reconectados
    const criticalErrors = [401, 403, 404, 500, 501, 502, 503];
    return !criticalErrors.includes(statusCode) && this.retryCount < this.options.maxRetries;
  }

  /**
   * Agendar reconexão com backoff exponencial
   * @param {number} errorCode - Código de erro (opcional)
   */
  scheduleReconnect(errorCode = null) {
    // Verificar se já está conectado antes de agendar reconexão
    if (this.isConnected) {
      console.log(`⚠️ Tenant ${this.tenantId} já está conectado, cancelando reconexão`);
      return;
    }

    // Cancelar reconexão anterior se existir
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.retryCount++;
    
    // Verificar limite de tentativas
    if (this.retryCount > this.options.maxRetries) {
      console.log(`❌ Máximo de tentativas atingido para tenant ${this.tenantId}`);
      this.emit('critical_error', { message: 'Máximo de tentativas de reconexão atingido' });
      return;
    }

    // Calcular delay com backoff exponencial
    const baseDelay = 5000; // 5 segundos
    const maxDelay = 300000; // 5 minutos
    const delay = Math.min(baseDelay * Math.pow(2, this.retryCount - 1), maxDelay);

    console.log(`🔄 Agendando reconexão para tenant ${this.tenantId} em ${delay/1000}s (tentativa ${this.retryCount}/${this.options.maxRetries})`);

    this.reconnectTimeout = setTimeout(() => {
      // Verificar novamente se ainda não está conectado
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      } else {
        console.log(`⚠️ Tenant ${this.tenantId} já está conectado/conectando, cancelando reconexão agendada`);
      }
      this.reconnectTimeout = null;
    }, delay);
  }

  /**
   * Gerar QR Code para interface web
   * @param {string} qr - QR Code string
   */
  async generateQRForWeb(qr) {
    try {
      console.log(`🔄 Gerando QR Code para web - tenant ${this.tenantId}`);
      const qrImage = await QRCode.toDataURL(qr, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      this.qrCode = qrImage; // Salvar diretamente a string da imagem
      this.qrGeneratedAt = new Date(); // Salvar timestamp de geração

      console.log(`✅ QR Code gerado para web - tenant ${this.tenantId}, data length: ${qrImage.length}`);
      console.log(`🔍 QR Code salvo: ${this.qrCode ? 'sim' : 'não'}`);
      console.log(`🔍 QR Code type: ${typeof this.qrCode}`);
      console.log(`🔍 QR Code preview: ${this.qrCode ? this.qrCode.substring(0, 100) + '...' : 'null'}`);
      this.emit('qr_generated', this.qrCode);
    } catch (error) {
      console.error(`❌ Erro ao gerar QR Code para web:`, error.message);
    }
  }

  /**
   * Iniciar timer de atualização do QR Code
   */
  startQRRefreshTimer() {
    // Limpar timer anterior se existir
    if (this.qrRefreshTimer) {
      clearTimeout(this.qrRefreshTimer);
    }

    // Iniciar novo timer
    this.qrRefreshTimer = setTimeout(() => {
      this.refreshQRCode();
    }, this.options.qrRefreshInterval);

    console.log(`⏰ Timer de atualização do QR Code iniciado para tenant ${this.tenantId} (${this.options.qrRefreshInterval}ms)`);
  }

  /**
   * Parar timer de atualização do QR Code
   */
  stopQRRefreshTimer() {
    if (this.qrRefreshTimer) {
      clearTimeout(this.qrRefreshTimer);
      this.qrRefreshTimer = null;
      console.log(`⏹️ Timer de atualização do QR Code parado para tenant ${this.tenantId}`);
    }
  }

  /**
   * Verificar se QR Code expirou
   * @returns {boolean} - Se o QR Code expirou
   */
  isQRCodeExpired() {
    if (!this.qrGeneratedAt) return true;
    
    const now = new Date();
    const timeDiff = now - this.qrGeneratedAt;
    const isExpired = timeDiff > this.options.qrRefreshInterval;
    
    if (isExpired) {
      console.log(`⏰ QR Code expirado para tenant ${this.tenantId} (${Math.round(timeDiff / 1000)}s)`);
    }
    
    return isExpired;
  }

  /**
   * Atualizar QR Code quando expirar
   */
  async refreshQRCode() {
    try {
      // Verificar se ainda não está conectado
      if (this.isConnected) {
        console.log(`✅ Tenant ${this.tenantId} já conectado, cancelando atualização do QR Code`);
        this.stopQRRefreshTimer();
        return;
      }

      // Verificar se QR Code expirou
      if (!this.isQRCodeExpired()) {
        console.log(`⏰ QR Code ainda válido para tenant ${this.tenantId}, reagendando verificação`);
        this.startQRRefreshTimer();
        return;
      }

      console.log(`🔄 Atualizando QR Code expirado para tenant ${this.tenantId}`);
      
      // Limpar QR Code atual
      this.qrCode = null;
      this.qrGeneratedAt = null;
      
      // Emitir evento para gerar novo QR Code
      this.emit('qr_expired');
      
      // Reagendar próxima verificação
      this.startQRRefreshTimer();
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar QR Code para tenant ${this.tenantId}:`, error.message);
      // Reagendar verificação mesmo com erro
      this.startQRRefreshTimer();
    }
  }

  /**
   * Solicitar código de pareamento
   * @param {string} phoneNumber - Número de telefone no formato E.164
   * @returns {Promise<Object>} - Resultado da solicitação
   */
  async requestPairingCode(phoneNumber) {
    try {
      if (!this.sock) {
        throw new Error('Socket não inicializado');
      }

      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }

      // Validar formato E.164 (apenas dígitos)
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      if (cleanNumber.length < 10) {
        throw new Error('Número de telefone inválido');
      }

      console.log(`📱 Solicitando código de pareamento para ${cleanNumber}...`);
      
      const pairingCode = await this.sock.requestPairingCode(cleanNumber);
      
      this.pairingCode = {
        code: pairingCode,
        phoneNumber: cleanNumber,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutos
      };

      console.log(`✅ Código de pareamento gerado: ${pairingCode}`);
      
      this.emit('pairing_code_generated', this.pairingCode);
      
      return {
        success: true,
        pairingCode: this.pairingCode,
        message: 'Código de pareamento gerado com sucesso'
      };

    } catch (error) {
      console.error(`❌ Erro ao solicitar código de pareamento:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar se código de pareamento está expirado
   * @returns {boolean} - Se está expirado
   */
  isPairingCodeExpired() {
    if (!this.pairingCode) return true;
    return new Date() > this.pairingCode.expiresAt;
  }

  /**
   * Obter código de pareamento atual
   * @returns {Object|null} - Código de pareamento ou null
   */
  getPairingCode() {
    if (!this.pairingCode || this.isPairingCodeExpired()) {
      return null;
    }
    return this.pairingCode;
  }

  /**
   * Enviar mensagem de texto
   * @param {string} to - Destinatário
   * @param {string} message - Mensagem
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMessage(to, message) {
    try {
      if (!this.isConnected) {
        throw new Error('Instância não conectada');
      }

      const recipientJid = this.normalizeJid(to);
      if (!recipientJid) {
        throw new Error('Destinatário inválido');
      }

      const result = await this.sock.sendMessage(recipientJid, { text: message });
      this.lastActivity = new Date();

      console.log(`📤 Mensagem enviada para ${to} no tenant ${this.tenantId}`);
      return { success: true, messageId: result.key.id };
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem no tenant ${this.tenantId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensagem de mídia
   * @param {string} to - Destinatário
   * @param {Object} media - Dados da mídia
   * @param {string} caption - Legenda
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMediaMessage(to, media, caption = '') {
    try {
      if (!this.isConnected) {
        throw new Error('Instância não conectada');
      }
      const recipientJid = this.normalizeJid(to);
      if (!recipientJid) {
        throw new Error('Destinatário inválido');
      }
      let message;
      if (media.type === 'image') {
        message = {
          image: { url: media.url },
          caption: caption
        };
      } else if (media.type === 'video') {
        message = {
          video: { url: media.url },
          caption: caption
        };
      } else if (media.type === 'audio') {
        message = {
          audio: { url: media.url }
        };
      } else if (media.type === 'document') {
        message = {
          document: { url: media.url },
          mimetype: media.mimetype,
          fileName: media.fileName
        };
      } else {
        throw new Error('Tipo de mídia não suportado');
      }

      const result = await this.sock.sendMessage(recipientJid, message);
      this.lastActivity = new Date();
      
      console.log(`📤 Mídia enviada para ${to} no tenant ${this.tenantId}`);
      return { success: true, messageId: result.key.id };
    } catch (error) {
      console.error(`❌ Erro ao enviar mídia no tenant ${this.tenantId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter status da instância
   * @returns {Object} - Status da instância
   */
  getStatus() {
    const status = {
      tenantId: this.tenantId,
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      pairingCode: this.getPairingCode(),
      phoneNumber: this.phoneNumber,
      connectionMethod: this.options.connectionMethod,
      lastActivity: this.lastActivity,
      retryCount: this.retryCount,
      connectionAttempts: this.connectionAttempts,
      connectionState: this.sock?.ws?.readyState || 'disconnected',
      isConnecting: this.isConnecting
    };
    
    console.log(`🔍 Status do tenant ${this.tenantId}:`, {
      isConnected: status.isConnected,
      hasQrCode: !!status.qrCode,
      qrCodeType: typeof status.qrCode,
      qrCodeLength: status.qrCode ? status.qrCode.length : 0,
      qrCodeData: status.qrCode ? (status.qrCode.substring(0, 50) + '...') : 'null',
      connectionState: status.connectionState
    });
    
    return status;
  }

  /**
   * Desconectar instância
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      // Cancelar reconexão agendada
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Parar timer de atualização do QR Code
      this.stopQRRefreshTimer();

      if (this.sock) {
        if (this.sock.ws && this.sock.ws.readyState === 1) {
          await this.sock.logout();
        }
        this.sock = null;
      }

      this.isConnected = false;
      this.isConnecting = false;
      this.qrCode = null;
      this.qrGeneratedAt = null;

      console.log(`🔌 Instância desconectada para tenant ${this.tenantId}`);
      this.emit('disconnected');
    } catch (error) {
      console.error(`❌ Erro ao desconectar instância do tenant ${this.tenantId}:`, error.message);
    }
  }

  /**
   * Limpar dados da instância
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await this.disconnect();

      // Limpar dados de sessão
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log(`🧹 Dados de sessão limpos para tenant ${this.tenantId}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao limpar dados do tenant ${this.tenantId}:`, error.message);
    }
  }

  /**
   * Processar gatilhos do bot
   * @param {Object} m - Dados da mensagem
   */
  async processBotTriggers(m) {
    try {
      if (!this.isConnected || !m.messages || m.messages.length === 0) {
        return;
      }

      for (const message of m.messages) {
        // Verificar se há conteúdo de mensagem
        if (!message.message) {
          continue;
        }

        const text = (
          message.message.conversation ||
          message.message?.extendedTextMessage?.text ||
          message.message?.imageMessage?.caption ||
          message.message?.videoMessage?.caption ||
          message.message?.documentMessage?.caption ||
          ''
        ).toLowerCase().trim();
        const from = message.key.remoteJid;

        // Ignorar grupos
        if (typeof from === 'string' && from.endsWith('@g.us')) {
          // console.log(`↪️ Ignorando mensagem de grupo em ${from}`);
          continue;
        }

        // Ignorar mensagens enviadas pelo próprio bot
        if (message.key?.fromMe) {
          continue;
        }

        // Verificar gatilho !bot → apenas ativar, sem enviar mensagens aqui (evitar duplicidade)
        if (text === '!bot') {
          this.activatedChats.add(from);
          continue;
        }

        // Se não estiver ativado por !bot, ignorar outras mensagens
        if (!this.activatedChats.has(from)) {
          continue;
        }
        
        // Não enviar respostas aqui; o fluxo principal responde
      }
    } catch (error) {
      console.error(`❌ Erro ao processar gatilhos do bot no tenant ${this.tenantId}:`, error.message);
    }
  }

  /**
   * Forçar geração do QR Code
   * @returns {Promise<void>}
   */
  async forceQRGeneration() {
    try {
      if (!this.sock) {
        console.log(`❌ Socket não disponível para gerar QR Code para tenant ${this.tenantId}`);
        return;
      }

      // Forçar desconexão e reconexão para gerar QR Code
      if (this.sock.user) {
        console.log(`🔄 Forçando desconexão para gerar QR Code para tenant ${this.tenantId}`);
        await this.sock.logout();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Tentar reconectar
      console.log(`🔄 Tentando reconectar para gerar QR Code para tenant ${this.tenantId}`);
      await this.sock.connect();
      
    } catch (error) {
      console.log(`❌ Erro ao forçar geração do QR Code para tenant ${this.tenantId}:`, error.message);
    }
  }

  /**
   * Limpar sessão expirada
   * @returns {Promise<void>}
   */
  async clearExpiredSession() {
    try {
      // Desconectar socket se existir
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (error) {
          // Ignorar erro de logout se a conexão já foi fechada
          if (!error.message.includes('Connection Closed')) {
            console.log(`❌ Erro ao limpar sessão expirada do tenant ${this.tenantId}:`, error.message);
          }
        }
        this.sock = null;
      }

      // Limpar dados de sessão
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log(`🧹 Dados de sessão expirada limpos para tenant ${this.tenantId}`);
      }

      // Resetar status
      this.isConnected = false;
      this.isConnecting = false;
      this.qrCode = null;
      this.retryCount = 0;
      this.connectionAttempts = 0;

      // Cancelar reconexão agendada
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Limpar timers de reconexão
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

    } catch (error) {
      console.error(`❌ Erro ao limpar sessão expirada do tenant ${this.tenantId}:`, error.message);
    }
  }
}

module.exports = WhatsAppInstance;