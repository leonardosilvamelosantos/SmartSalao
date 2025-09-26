/**
 * Validação de Variáveis de Ambiente
 * Garante que todas as variáveis obrigatórias estejam definidas
 */

const requiredEnvVars = {
  // Configuração do servidor
  PORT: 'Porta do servidor',
  NODE_ENV: 'Ambiente de execução',
  
  // Configuração do banco de dados
  DB_HOST: 'Host do banco de dados',
  DB_PORT: 'Porta do banco de dados',
  DB_NAME: 'Nome do banco de dados',
  DB_USER: 'Usuário do banco de dados',
  DB_PASSWORD: 'Senha do banco de dados',
  
  // Configuração de segurança
  JWT_SECRET: 'Chave secreta para JWT',
  JWT_EXPIRES_IN: 'Tempo de expiração do JWT'
};

const optionalEnvVars = {
  // Configuração do servidor
  HOST: '0.0.0.0',
  
  // Configuração do banco de dados
  DB_SSL: 'false',
  DB_MAX_CONNECTIONS: '20',
  DB_MIN_CONNECTIONS: '2',
  DB_IDLE_TIMEOUT: '30000',
  DB_CONNECTION_TIMEOUT: '10000',
  
  // Configuração de segurança
  SESSION_SECRET: 'sessao-secreta-padrao',
  
  // Configuração de rede
  ALLOWED_ORIGINS: '',
  
  // Configuração do WhatsApp
  WHATSAPP_SESSION_PATH: './data/whatsapp-auth',
  WHATSAPP_WEBHOOK_URL: ''
};

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão definidas
 */
function validateRequiredEnvVars() {
  const missing = [];
  
  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[varName]) {
      missing.push({ varName, description });
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missing.forEach(({ varName, description }) => {
      console.error(`   - ${varName}: ${description}`);
    });
    console.error('\n💡 Crie um arquivo .env com essas variáveis ou defina-as no sistema.');
    process.exit(1);
  }
}

/**
 * Define valores padrão para variáveis opcionais
 */
function setDefaultEnvVars() {
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }
}

/**
 * Valida formato das variáveis de ambiente
 */
function validateEnvVarFormats() {
  const errors = [];
  
  // Validar PORT
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT deve ser um número entre 1 e 65535');
  }
  
  // Validar DB_PORT
  const dbPort = parseInt(process.env.DB_PORT);
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    errors.push('DB_PORT deve ser um número entre 1 e 65535');
  }
  
  // Validar NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    errors.push(`NODE_ENV deve ser um dos seguintes: ${validEnvs.join(', ')}`);
  }
  
  // Validar JWT_SECRET (deve ter pelo menos 32 caracteres em produção)
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres em produção');
  }
  
  if (errors.length > 0) {
    console.error('❌ Erros de validação nas variáveis de ambiente:');
    errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
}

/**
 * Inicializa e valida as variáveis de ambiente
 */
function initializeEnvValidation() {
  console.log('🔐 Validando variáveis de ambiente...');
  
  // Definir valores padrão primeiro
  setDefaultEnvVars();
  
  // Validar variáveis obrigatórias
  validateRequiredEnvVars();
  
  // Validar formatos
  validateEnvVarFormats();
  
  console.log('✅ Variáveis de ambiente validadas com sucesso');
}

module.exports = {
  initializeEnvValidation,
  validateRequiredEnvVars,
  setDefaultEnvVars,
  validateEnvVarFormats
};

