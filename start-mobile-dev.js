#!/usr/bin/env node

/**
 * Script de inicialização para desenvolvimento mobile
 * Resolve problemas de carregamento em dispositivos móveis
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Configurar banco de dados
const pool = require('./src/config/database');

// Importar configuração mobile
const { mobileCompatibilityMiddleware, staticMiddleware, setupMobileRoutes } = require('./mobile-dev-config');

// Inicializar aplicação
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Iniciando servidor para desenvolvimento mobile...');

// Middleware de segurança desabilitado para desenvolvimento mobile
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Middleware de compatibilidade mobile
app.use(mobileCompatibilityMiddleware);

// CORS permissivo para desenvolvimento mobile
app.use(cors({
  origin: true, // Permitir qualquer origem em desenvolvimento
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'X-Requested-With', 'Accept', 'Origin']
}));

// Logging
app.use(morgan('dev'));

// Parsing de dados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar arquivos estáticos
staticMiddleware(app);

// Configurar rotas mobile-friendly
setupMobileRoutes(app);

// ====================
// ROTAS DA API (IMPORTANTE PARA LOGIN)
// ====================

// Importar e configurar rotas da API
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const agendamentosRoutes = require('./src/routes/agendamentos');
const clientesRoutes = require('./src/routes/clientes');
const servicosRoutes = require('./src/routes/servicos');
const usuariosRoutes = require('./src/routes/usuarios');
const configuracoesRoutes = require('./src/routes/configuracoes');
const notificacoesRoutes = require('./src/routes/notificacoes');
const whatsappRoutes = require('./src/routes/whatsapp');

// Middleware de autenticação (simplificado para mobile)
const { authenticateToken } = require('./src/middleware/auth');

// Aplicar rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/agendamentos', authenticateToken, agendamentosRoutes);
app.use('/api/clientes', authenticateToken, clientesRoutes);
app.use('/api/servicos', authenticateToken, servicosRoutes);
app.use('/api/usuarios', authenticateToken, usuariosRoutes);
app.use('/api/configuracoes', authenticateToken, configuracoesRoutes);
app.use('/api/notificacoes', authenticateToken, notificacoesRoutes);
app.use('/api/whatsapp', authenticateToken, whatsappRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'mobile-development',
    mobile: true
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

// Iniciar servidor
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  
  console.log('\n' + '='.repeat(60));
  console.log('📱 SERVIDOR MOBILE DEVELOPMENT INICIADO');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Host: ${HOST}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`💻 Acesso local: http://localhost:${PORT}/frontend`);
  
  if (localIP) {
    console.log(`\n📱 ACESSO MOBILE:`);
    console.log(`🌐 IP da rede local: ${localIP}`);
    console.log(`📱 Acesse do celular: http://${localIP}:${PORT}/frontend`);
    console.log(`💻 Acesse de outros PCs: http://${localIP}:${PORT}/frontend`);
    console.log(`\n⚠️  IMPORTANTE: Use HTTP (não HTTPS) para desenvolvimento`);
    console.log(`🔧 Headers mobile-friendly ativados`);
    console.log(`🛡️  Segurança relaxada para desenvolvimento`);
  } else {
    console.log(`\n❌ Não foi possível detectar o IP da rede local`);
    console.log(`💡 Verifique sua conexão de rede`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Servidor pronto para desenvolvimento mobile!');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor mobile development...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando servidor mobile development...');
  process.exit(0);
});

module.exports = app;
