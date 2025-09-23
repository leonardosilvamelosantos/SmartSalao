#!/usr/bin/env node

/**
 * Script de Configuração para Produção
 * Configura o ambiente e validações de segurança para produção
 */

const fs = require('fs');
const path = require('path');

class ProductionSetup {
  constructor() {
    this.envTemplate = {
      NODE_ENV: 'production',
      DB_TYPE: 'postgresql',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'agendamento_prod',
      DB_USER: 'agendamento_user',
      DB_PASSWORD: 'CHANGE_THIS_PASSWORD',
      JWT_SECRET: 'CHANGE_THIS_JWT_SECRET',
      JWT_EXPIRES_IN: '24h',
      BCRYPT_ROUNDS: '12',
      DB_MAX_CONNECTIONS: '50',
      DB_MIN_CONNECTIONS: '5',
      DB_IDLE_TIMEOUT: '30000',
      DB_CONNECTION_TIMEOUT: '10000',
      DB_ACQUIRE_TIMEOUT: '30000',
      SECURITY_ALERTS_EMAIL: 'admin@yourcompany.com',
      SECURITY_ALERTS_SLACK_WEBHOOK: '',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      LOG_LEVEL: 'warn',
      ENABLE_SECURITY_ALERTS: 'true',
      ENABLE_RATE_LIMITING: 'true'
    };
  }

  /**
   * Executar configuração completa
   */
  async run() {
    console.log('🚀 Configurando ambiente para produção...\n');

    try {
      await this.createEnvFile();
      await this.validateSecurityConfig();
      await this.createProductionScripts();
      await this.createSecurityChecklist();
      await this.createMonitoringScripts();

      console.log('\n✅ Configuração de produção concluída!');
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. Edite o arquivo .env.production com suas configurações');
      console.log('2. Configure o banco PostgreSQL');
      console.log('3. Execute: npm run setup:prod');
      console.log('4. Execute: npm run security:check');
      console.log('5. Execute: npm run start:prod');

    } catch (error) {
      console.error('❌ Erro na configuração:', error.message);
      process.exit(1);
    }
  }

  /**
   * Criar arquivo .env.production
   */
  async createEnvFile() {
    console.log('📝 Criando arquivo .env.production...');
    
    const envContent = Object.entries(this.envTemplate)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const envPath = path.join(__dirname, '..', '.env.production');
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Arquivo .env.production criado');
  }

  /**
   * Validar configurações de segurança
   */
  async validateSecurityConfig() {
    console.log('🔒 Validando configurações de segurança...');
    
    const checks = [
      {
        name: 'JWT Secret',
        check: () => this.envTemplate.JWT_SECRET !== 'CHANGE_THIS_JWT_SECRET',
        message: 'JWT_SECRET deve ser alterado para um valor seguro'
      },
      {
        name: 'Database Password',
        check: () => this.envTemplate.DB_PASSWORD !== 'CHANGE_THIS_PASSWORD',
        message: 'DB_PASSWORD deve ser alterado para um valor seguro'
      },
      {
        name: 'Environment',
        check: () => this.envTemplate.NODE_ENV === 'production',
        message: 'NODE_ENV deve ser "production"'
      },
      {
        name: 'Rate Limiting',
        check: () => this.envTemplate.ENABLE_RATE_LIMITING === 'true',
        message: 'Rate limiting deve estar habilitado'
      },
      {
        name: 'Security Alerts',
        check: () => this.envTemplate.ENABLE_SECURITY_ALERTS === 'true',
        message: 'Alertas de segurança devem estar habilitados'
      }
    ];

    const warnings = [];
    checks.forEach(check => {
      if (!check.check()) {
        warnings.push(`⚠️  ${check.name}: ${check.message}`);
      }
    });

    if (warnings.length > 0) {
      console.log('\n⚠️  AVISOS DE SEGURANÇA:');
      warnings.forEach(warning => console.log(warning));
    } else {
      console.log('✅ Configurações de segurança validadas');
    }
  }

  /**
   * Criar scripts de produção
   */
  async createProductionScripts() {
    console.log('📜 Criando scripts de produção...');

    // Script de inicialização
    const initScript = `#!/bin/bash
# Script de Inicialização para Produção

echo "🚀 Iniciando aplicação em modo produção..."

# Verificar se .env.production existe
if [ ! -f .env.production ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    echo "Execute: node scripts/setup-production.js"
    exit 1
fi

# Carregar variáveis de ambiente
export $(cat .env.production | xargs)

# Verificar conexão com banco
echo "🔍 Verificando conexão com banco de dados..."
node scripts/check-database.js

# Executar migrações
echo "📊 Executando migrações..."
node scripts/migrate.js

# Verificar segurança
echo "🔒 Verificando configurações de segurança..."
node scripts/security-check.js

# Iniciar aplicação
echo "✅ Iniciando aplicação..."
NODE_ENV=production node src/index.js
`;

    fs.writeFileSync(path.join(__dirname, 'start-production.sh'), initScript);
    
    // Tornar executável no Linux/Mac
    if (process.platform !== 'win32') {
      fs.chmodSync(path.join(__dirname, 'start-production.sh'), '755');
    }

    console.log('✅ Scripts de produção criados');
  }

  /**
   * Criar checklist de segurança
   */
  async createSecurityChecklist() {
    console.log('📋 Criando checklist de segurança...');

    const checklist = `# 🔒 CHECKLIST DE SEGURANÇA PARA PRODUÇÃO

## ✅ Configurações Obrigatórias

### Ambiente
- [ ] NODE_ENV=production
- [ ] Logs configurados para nível 'warn' ou 'error'
- [ ] Rate limiting habilitado
- [ ] Alertas de segurança habilitados

### Banco de Dados
- [ ] PostgreSQL configurado (não SQLite)
- [ ] Senha forte do banco
- [ ] Conexões limitadas (max: 50, min: 5)
- [ ] SSL habilitado se possível
- [ ] Backup automático configurado

### Autenticação
- [ ] JWT_SECRET forte e único
- [ ] BCRYPT_ROUNDS >= 12
- [ ] Tokens com expiração adequada (24h)
- [ ] Validação de permissões ativa

### Segurança
- [ ] Validação de entrada robusta
- [ ] Prevenção de SQL injection
- [ ] Headers de segurança configurados
- [ ] CORS configurado adequadamente
- [ ] Rate limiting por tenant

### Monitoramento
- [ ] Logs de auditoria ativos
- [ ] Alertas de segurança configurados
- [ ] Monitoramento de tentativas de ataque
- [ ] Notificações externas (email/Slack)

## 🚨 Verificações Pós-Deploy

### Testes de Segurança
- [ ] Testar tentativa de acesso não autorizado
- [ ] Testar tentativa de SQL injection
- [ ] Testar rate limiting
- [ ] Testar validação de entrada
- [ ] Verificar logs de segurança

### Monitoramento
- [ ] Verificar alertas ativos
- [ ] Monitorar performance
- [ ] Verificar logs de erro
- [ ] Testar backup e recuperação

## 📞 Contatos de Emergência

- **Admin Principal**: admin@yourcompany.com
- **DevOps**: devops@yourcompany.com
- **Segurança**: security@yourcompany.com

## 🔧 Comandos Úteis

\`\`\`bash
# Verificar status de segurança
npm run security:check

# Ver alertas ativos
npm run security:alerts

# Verificar logs de segurança
npm run security:logs

# Backup do banco
npm run db:backup

# Restaurar backup
npm run db:restore
\`\`\`
`;

    fs.writeFileSync(path.join(__dirname, '..', 'SECURITY_CHECKLIST.md'), checklist);
    console.log('✅ Checklist de segurança criado');
  }

  /**
   * Criar scripts de monitoramento
   */
  async createMonitoringScripts() {
    console.log('📊 Criando scripts de monitoramento...');

    // Script de verificação de segurança
    const securityCheckScript = `#!/usr/bin/env node

const SecurityAlertService = require('../src/services/SecurityAlertService');
const pool = require('../src/config/database');

async function checkSecurity() {
  console.log('🔒 Verificando status de segurança...');
  
  try {
    const securityAlert = new SecurityAlertService();
    
    // Verificar alertas ativos
    const activeAlerts = await securityAlert.getActiveAlerts(10);
    
    if (activeAlerts.length > 0) {
      console.log('🚨 ALERTAS ATIVOS:');
      activeAlerts.forEach(alert => {
        console.log(\`- \${alert.alert_type} (\${alert.severity}): \${alert.count} ocorrências\`);
      });
    } else {
      console.log('✅ Nenhum alerta de segurança ativo');
    }
    
    // Verificar configurações críticas
    const criticalChecks = [
      {
        name: 'Rate Limiting',
        check: process.env.ENABLE_RATE_LIMITING === 'true',
        critical: true
      },
      {
        name: 'Security Alerts',
        check: process.env.ENABLE_SECURITY_ALERTS === 'true',
        critical: true
      },
      {
        name: 'Production Mode',
        check: process.env.NODE_ENV === 'production',
        critical: true
      }
    ];
    
    console.log('\\n🔍 Verificações de configuração:');
    criticalChecks.forEach(check => {
      const status = check.check ? '✅' : '❌';
      const critical = check.critical ? ' (CRÍTICO)' : '';
      console.log(\`\${status} \${check.name}\${critical}\`);
    });
    
  } catch (error) {
    console.error('❌ Erro na verificação de segurança:', error.message);
    process.exit(1);
  }
}

checkSecurity();
`;

    fs.writeFileSync(path.join(__dirname, 'security-check.js'), securityCheckScript);
    console.log('✅ Scripts de monitoramento criados');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const setup = new ProductionSetup();
  setup.run();
}

module.exports = ProductionSetup;
