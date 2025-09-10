const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importações locais
const path = require('path');

// Carregar configuração do banco (apenas SQLite)
const pool = require('./config/database');

const cronJobService = require('./services/CronJobService');

// Inicializar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança e utilitários
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", 'data:'],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'"]
    }
  } : false
})); // Segurança básica com CSP em produção

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = ['http://localhost:3000'];
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
})); // CORS restrito em dev
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Logging de requests

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => process.env.NODE_ENV === 'development',
  handler: (req, res) => {
    const { ApiError } = require('./utils/ApiError');
    return ApiError.rateLimit('Muitas requisições. Tente novamente mais tarde.').send(res);
  }
});
app.use('/api/', limiter);

// ====================
// MIDDLEWARE CORE
// ====================

// Parsing de dados
app.use(express.json({ limit: process.env.REQUEST_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '10mb' }));

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
  const isSQLite = process.env.USE_SQLITE === 'true' || process.env.DB_TYPE === 'sqlite';

  console.log('Database config:', {
    USE_SQLITE: process.env.USE_SQLITE,
    DB_TYPE: process.env.DB_TYPE,
    isSQLite: isSQLite
  });

  try {
    let result;
    let dbHealth;

    if (isSQLite) {
      // Health check para SQLite
      result = await pool.query('SELECT datetime("now") as current_time, sqlite_version() as sqlite_version');
      const responseTime = Date.now() - startTime;

      dbHealth = {
        status: 'OK',
        database: {
          type: 'SQLite',
          version: result.rows[0].sqlite_version,
          timestamp: result.rows[0].current_time,
          responseTime: `${responseTime}ms`
        },
        connections: 1, // SQLite usa uma única conexão
        idle: 0,
        waiting: 0
      };
    } else {
      // Health check para PostgreSQL
      // SQLite: obter tamanho do arquivo de banco
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../data/agendamento_dev.db');
      const stats = fs.statSync(dbPath);
      result = { rows: [{ now: new Date().toISOString(), db_size: stats.size }] };
      const responseTime = Date.now() - startTime;

      dbHealth = {
        status: 'OK',
        database: {
          type: 'PostgreSQL',
          name: process.env.DB_NAME || 'agendamento',
          size: formatBytes(result.rows[0].db_size),
          timestamp: result.rows[0].now,
          responseTime: `${responseTime}ms`
        },
        connections: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
    }

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

// Rotas públicas
app.use('/api/auth', require('./routes/auth'));

// (removido) rota de teste público /api/test

// Rotas protegidas (requerem autenticação + isolamento tenant + rate limit por tenant)
const tenantMW = require('./middleware/tenant');
const rateLite = tenantMW.tenantRateLimit({ windowMs: 60 * 1000, max: (process.env.NODE_ENV === 'development' ? 600 : 120) });

app.use('/api/usuarios', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/usuarios'));
app.use('/api/servicos', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/servicos'));
app.use('/api/clientes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/clientes'));
app.use('/api/agendamentos', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/agendamentos'));
app.use('/api/whatsapp', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/whatsapp'));
app.use('/api/dashboard', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/dashboard'));
app.use('/api/configuracoes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/configuracoes'));
app.use('/api/notificacoes', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/notificacoes'));
app.use('/api/backup', authenticateToken, tenantMW.isolateTenant, rateLite, require('./routes/backup'));

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

// ====================
// SERVIR ARQUIVOS ESTÁTICOS DO ADMIN
// ====================
// app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// ====================
// SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
// ====================
app.use('/frontend', (req, res, next) => {
  try {
    return express.static(path.join(__dirname, '../frontend'))(req, res, next);
  } catch (e) {
    console.error('Erro ao servir estático /frontend:', e);
    return res.status(500).json({ success: false, message: 'Erro ao servir arquivos estáticos' });
  }
});

// Expor imagens públicas (para fundos e assets não dentro de /frontend)
app.use('/image', (req, res, next) => {
  try {
    return express.static(path.join(__dirname, '../image'))(req, res, next);
  } catch (e) {
    console.error('Erro ao servir estático /image:', e);
    return res.status(500).json({ success: false, message: 'Erro ao servir imagens' });
  }
});

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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);

  // Iniciar jobs cron
  cronJobService.startJobs();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT. Encerrando servidor...');
  cronJobService.stopJobs();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM. Encerrando servidor...');
  cronJobService.stopJobs();
  await pool.end();
  process.exit(0);
});

module.exports = app;
