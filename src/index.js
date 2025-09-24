const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importações locais
const path = require('path');

// Carregar configuração do banco (detecção automática)
const pool = require('./config/database');

const cronJobService = require('./services/CronJobService');

// Inicializar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares de segurança e utilitários
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", 'data:', 'https:'],
      "script-src": ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      "style-src": ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      "font-src": ["'self'", 'https://fonts.gstatic.com'],
      "connect-src": ["'self'", 'https:', 'http:'],
      "frame-src": ["'self'"]
    }
  } : false
})); // Segurança básica com CSP em produção

app.use(cors({
  origin: (origin, cb) => {
    // Aceitar quando não há origem (arquivos locais) ou em desenvolvimento
    if (!origin || origin === 'null' || process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    
    // Lista de origens permitidas (incluindo IPs da rede local)
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    // Permitir qualquer IP da rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin);
    
    if (isLocalNetwork || isLocalhost || allowed.includes(origin)) {
      return cb(null, true);
    }
    
    // Adicionar IPs da rede local se configurados
    if (process.env.ALLOWED_ORIGINS) {
      const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',');
      allowed.push(...additionalOrigins);
    }
    
    // Aceitar qualquer IP da rede local (192.168.x.x)
    if (origin) {
      const isLocalNetwork = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/.test(origin);
      if (isLocalNetwork) {
        console.log(`🌐 Permitindo acesso de rede local: ${origin}`);
        return cb(null, true);
      }
    }
    
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
})); // CORS configurado para desenvolvimento
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Logging de requests

// Rate limiting - Desabilitado em desenvolvimento
// Forçar desenvolvimento para resolver problemas de rate limiting
const isDevelopment = true; // Sempre desabilitar rate limiting em desenvolvimento
if (!isDevelopment) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const { ApiError } = require('./utils/ApiError');
      return ApiError.rateLimit('Muitas requisições. Tente novamente mais tarde.').send(res);
    }
  });
  app.use('/api/', limiter);
  console.log('🔒 Rate limiting ativado para produção');
}

// ====================
// MIDDLEWARE CORE
// ====================

// Parsing de dados
app.use(express.json({ limit: process.env.REQUEST_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '10mb' }));

// Reparar schema PostgreSQL (quando aplicável)
try {
  const { repairPostgresSchema } = require('./database/repair-postgres');
  repairPostgresSchema().catch(() => {});
} catch (e) {
  // ignora em ambiente sem PostgreSQL
}

// ====================
// HEALTH CHECK ENDPOINTS
// ====================

/**
 * Health check básico
 * GET /health
 */
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };

  res.status(200).json(healthData);
});

/**
 * Health check detalhado do banco de dados
 * GET /api/db-health
 */
app.get('/api/db-health', async (req, res) => {
  const startTime = Date.now();

  console.log('Database config:', {
    PGHOST: process.env.PGHOST || process.env.DB_HOST,
    PGPORT: process.env.PGPORT || process.env.DB_PORT,
    PGDATABASE: process.env.PGDATABASE || process.env.DB_NAME,
    PGUSER: process.env.PGUSER || process.env.DB_USER
  });

  try {
    // Health check para PostgreSQL
    const result = await pool.query('SELECT NOW() as now, pg_database_size(current_database()) as db_size, version() as version');
    const responseTime = Date.now() - startTime;

    const dbHealth = {
      status: 'OK',
      database: {
        type: 'PostgreSQL',
        name: process.env.PGDATABASE || process.env.DB_NAME || 'agendamento',
        version: result.rows[0].version,
        size: formatBytes(result.rows[0].db_size),
        timestamp: result.rows[0].now,
        responseTime: `${responseTime}ms`
      },
      connections: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    res.status(200).json(dbHealth);
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      database: 'DOWN',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Métricas da aplicação
 * GET /api/metrics
 */
app.get('/api/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid
  };

  res.status(200).json(metrics);
});

/**
 * Helper function para formatar bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Importar middlewares de autenticação
const { authenticateToken } = require('./middleware/auth');

// ====================
// INTEGRAÇÃO BOT WHATSAPP MULTI-TENANT
// ====================

// Importar componentes do bot WhatsApp multi-tenant
const MultiTenantWhatsAppServiceV2 = require('./whatsapp-bot/services/MultiTenantWhatsAppServiceV2');
const BotProcessorService = require('./whatsapp-bot/services/BotProcessorService');

// Instanciar o serviço
const whatsappService = new MultiTenantWhatsAppServiceV2();

// Configurar callbacks globais para o serviço multi-tenant
const setupTenantCallbacks = (tenantId) => {
  if (typeof whatsappService.registerMessageCallback === 'function') {
  whatsappService.registerMessageCallback(tenantId, async (message, tenantId) => {
    try {
      // log reduzido: comentar recebimento detalhado
      // console.log(`📨 [${tenantId}] Mensagem recebida de ${message.from}: ${message.content}`);
      const response = await BotProcessorService.processMessage(message);

      if (response) {
        await whatsappService.sendMessage(tenantId, response.to, response.message);
        // console.log(`📤 [${tenantId}] Resposta enviada para ${response.to}`);
      }
    } catch (error) {
      console.error(`❌ [${tenantId}] Erro ao processar mensagem recebida:`, error);
    }
  });
  }

  if (typeof whatsappService.registerConnectionCallback === 'function') {
  whatsappService.registerConnectionCallback(tenantId, (event) => {
    switch (event.type) {
      case 'connected':
        // console.log(`✅ [${tenantId}] WhatsApp conectado`); // Otimizado - log removido para reduzir spam
        break;

      case 'disconnected':
        console.log(`❌ [${tenantId}] WhatsApp desconectado:`, event.reason);
        break;

      default:
        // console.log(`📡 [${tenantId}] Evento de conexão:`, event);
    }
  });
  }
};

// Função para inicializar tenant automaticamente
const initializeTenantBot = async (tenantId, config = {}) => {
  try {
    console.log(`🤖 Inicializando bot WhatsApp para tenant: ${tenantId}`);

    // Configurar callbacks para este tenant
    setupTenantCallbacks(tenantId);

    // Inicializar conexão
    const connection = await whatsappService.initializeTenantConnection(tenantId, config);

    // console.log(`✅ Bot WhatsApp inicializado com sucesso para tenant ${tenantId}`); // Otimizado - log removido para reduzir spam
    return connection;

  } catch (error) {
    console.error(`❌ Erro ao inicializar bot WhatsApp para tenant ${tenantId}:`, error);
    throw error;
  }
};

// Importar configuração do WhatsApp
const whatsappConfig = require('./whatsapp-bot/config/whatsapp-config');

// Inicialização baseada em configuração
const initializeWhatsAppBots = async () => {
  if (!whatsappConfig.autoStart.enabled) {
    console.log('🤖 Bot WhatsApp não inicializado automaticamente');
    console.log('💡 Para ativar, defina START_WHATSAPP_BOT=true ou execute em produção');
    return;
  }

  console.log('🤖 Inicializando sistema multi-tenant WhatsApp...');

  try {
    // Verificar se há tenants para inicializar automaticamente
    const tenantList = whatsappConfig.autoStart.tenants;

    if (tenantList.length > 0) {
      console.log(`📋 Inicializando tenants configurados: ${tenantList.join(', ')}`);
      
      for (const tenantId of tenantList) {
        try {
          await initializeTenantBot(tenantId);
        } catch (error) {
          console.error(`❌ Falha ao inicializar tenant ${tenantId}, continuando...`);
        }
      }
    } else {
      console.log('ℹ️ Nenhum tenant configurado para inicialização automática');
    }

    // Configurar limpeza automática de conexões inativas (apenas se houver tenants ativos)
    if (tenantList.length > 0 && whatsappConfig.cleanup.autoCleanup) {
      setInterval(() => {
        if (typeof whatsappService.cleanupInactiveConnections === 'function') {
          whatsappService.cleanupInactiveConnections();
        }
      }, whatsappConfig.cleanup.intervalMs);
    }

    // console.log('✅ Sistema multi-tenant WhatsApp inicializado com sucesso'); // Otimizado - log removido para reduzir spam

  } catch (error) {
    console.error('❌ Erro ao inicializar sistema multi-tenant WhatsApp:', error);
  }
};

// Inicializar sistema (pular em ambiente de teste)
if (process.env.NODE_ENV !== 'test') {
  initializeWhatsAppBots();
}

// Rotas públicas
app.use('/api/auth', require('./routes/auth'));

// (removido) rota de teste público /api/test

// Rotas protegidas (requerem autenticação + isolamento tenant + rate limit por tenant)
const tenantMW = require('./middleware/tenant');
// Rate limiting por tenant - Desabilitado em desenvolvimento
const rateLite = isDevelopment ? 
  (req, res, next) => next() : // Middleware vazio em desenvolvimento
  tenantMW.tenantRateLimit({ 
    windowMs: 60 * 1000, 
    max: 120,
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  });

app.use('/api/usuarios', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/usuarios'));
app.use('/api/servicos', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/servicos'));
app.use('/api/clientes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/clientes'));
app.use('/api/agendamentos', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/agendamentos'));
app.use('/api/whatsapp', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/whatsapp'));
app.use('/api/whatsapp-v2', require('./routes/whatsapp-v2'));
app.use('/api/dashboard', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/dashboard'));
app.use('/api/configuracoes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/configuracoes'));
app.use('/api/notificacoes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/notificacoes'));
app.use('/api/backup', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/backup'));

// Rotas do Bot WhatsApp (requer autenticação de admin)
app.use('/api/bot', authenticateToken, tenantMW.isolateTenant, rateLite, require('./whatsapp-bot/routes/bot-admin'));


// ====================
// ROTAS DA API v2 (OTIMIZADA)
// ====================
// Temporariamente desabilitada para correção de dependências
// app.use('/api/v2', require('./routes/appointmentV2'));

// ====================
// ROTAS MULTI-TENANT
// ====================
app.use('/api/tenants', require('./routes/tenant'));

// ====================
// ROTAS DO PAINEL ADMINISTRATIVO
// ====================
app.use('/api/admin', require('./routes/admin'));
app.use('/api/security', require('./routes/security'));

// ====================
// SERVIR ARQUIVOS ESTÁTICOS DO ADMIN
// ====================
// app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// ====================
// SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
// ====================
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Rota específica para o index.html do frontend
app.get('/frontend/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota raiz redireciona para o frontend
app.get('/', (req, res) => {
  res.redirect('/frontend/index.html');
});

// Expor imagens públicas (para fundos e assets não dentro de /frontend)
app.use('/image', express.static(path.join(__dirname, '../image')));

// Rota específica para servir o painel admin
app.get('/admin', (req, res) => {
  res.redirect('/frontend');
});

// Rota para admin com ID específico (para compatibilidade com dados de teste)
app.get('/admin/:id', (req, res) => {
  res.redirect('/frontend');
});

// Rota principal do frontend (dashboard)
app.get('/frontend', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } catch (e) {
    console.error('Erro ao enviar index.html:', e);
    res.status(500).json({ success: false, message: 'Erro ao carregar a aplicação' });
  }
});

// Rota para páginas específicas do frontend
app.get('/frontend/pages/:page', (req, res) => {
  const page = req.params.page;
  const allowed = new Set(['login', 'admin-users', 'dev-console']); // whitelist de páginas
  if (!allowed.has(page)) {
    return res.redirect('/frontend');
  }
  const filePath = path.join(__dirname, `../frontend/pages/${page}.html`);
  try {
    if (require('fs').existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, message: 'Página não encontrada' });
    }
  } catch (e) {
    console.error('Erro ao servir página /frontend/pages:', e);
    res.status(500).json({ success: false, message: 'Erro ao carregar a página' });
  }
});

// Rota de login (redireciona para login do frontend)
app.get('/login', (req, res) => {
  res.redirect('/frontend/pages/login');
});

// Aliases para a página de login
app.get('/frontend/login', (req, res) => {
  res.redirect('/frontend/pages/login');
});
app.get('/frontend/login.html', (req, res) => {
  res.redirect('/frontend/pages/login');
});

// Redirecionar raiz para o frontend por padrão
app.get('/', (req, res) => {
  res.redirect('/frontend');
});

// Favicon básico para remover 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Rotas administrativas
app.get('/api/admin/cron-status', (req, res) => {
  const status = cronJobService.getJobStatus();
  res.json({
    success: true,
    jobs: status
  });
});

app.post('/api/admin/run-slot-generation', async (req, res) => {
  try {
    await cronJobService.runManualSlotGeneration();
    res.json({
      success: true,
      message: 'Geração manual de slots executada com sucesso'
    });
  } catch (error) {
    console.error('Erro na execução manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na execução manual',
      error: error.message
    });
  }
});

// Diagnóstico de cache/Redis
app.get('/api/cache-stats', async (req, res) => {
  try {
    const CacheService = require('./services/CacheService');
    const cs = new CacheService();
    const stats = await cs.getStats();
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erro ao obter status do cache', error: e.message });
  }
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Função para obter IP local
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue;
      }
      
      const ip = iface.address;
      if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
          (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
        return ip;
      }
    }
  }
  
  return null;
}

// Iniciar servidor somente quando este arquivo for o entrypoint e não estiver em teste
if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    // console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`); // Otimizado para reduzir spam no console
    console.log(`🌐 Host: ${HOST}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`💻 Acesso local: http://localhost:${PORT}/frontend`);
    
    if (localIP) {
      console.log(`🌐 IP da rede local: ${localIP}`);
      console.log(`📱 Acesse do celular: http://${localIP}:${PORT}/frontend`);
      console.log(`💻 Acesse de outros PCs: http://${localIP}:${PORT}/frontend`);
    } else {
      console.log(`❌ Não foi possível detectar o IP da rede local`);
      console.log(`💡 Verifique sua conexão de rede ou configure manualmente`);
    }

    // Iniciar jobs cron
    cronJobService.startJobs();
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT. Encerrando servidor...');
  console.log('🤖 Encerrando conexões WhatsApp multi-tenant...');

  // Encerrar todas as conexões WhatsApp ativas
  const allTenants = await whatsappService.getAllTenants();
  for (const tenant of allTenants) {
    try {
      await whatsappService.stopTenantConnection(tenant.tenantId);
    } catch (error) {
      console.error(`❌ Erro ao encerrar tenant ${tenant.tenantId}:`, error);
    }
  }

  cronJobService.stopJobs();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM. Encerrando servidor...');
  console.log('🤖 Encerrando conexões WhatsApp multi-tenant...');

  // Encerrar todas as conexões WhatsApp ativas
  const allTenants = await whatsappService.getAllTenants();
  for (const tenant of allTenants) {
    try {
      await whatsappService.stopTenantConnection(tenant.tenantId);
    } catch (error) {
      console.error(`❌ Erro ao encerrar tenant ${tenant.tenantId}:`, error);
    }
  }

  cronJobService.stopJobs();
  await pool.end();
  process.exit(0);
});

module.exports = app;
