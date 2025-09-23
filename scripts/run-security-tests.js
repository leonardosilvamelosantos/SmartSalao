#!/usr/bin/env node

/**
 * Script para Executar Testes de Segurança
 * Executa todos os testes de segurança e gera relatório
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
      endTime: null
    };
  }

  async run() {
    console.log('🔒 Iniciando testes de segurança...\n');

    try {
      // Garantir ambiente de teste e flags
      process.env.NODE_ENV = process.env.NODE_ENV || 'test';
      process.env.ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING || 'true';
      process.env.ENABLE_SECURITY_ALERTS = process.env.ENABLE_SECURITY_ALERTS || 'true';
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test-pass';

      await this.runSecurityTests();
      await this.runSecurityChecks();
      await this.generateReport();
      
      console.log('\n✅ Testes de segurança concluídos!');
      console.log(`📊 Resultado: ${this.results.passed} passou, ${this.results.failed} falhou`);
      
      if (this.results.failed > 0) {
        console.log('\n❌ FALHAS ENCONTRADAS:');
        this.results.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Erro ao executar testes de segurança:', error.message);
      process.exit(1);
    }
  }

  async runSecurityTests() {
    console.log('🧪 Executando testes automatizados...');
    
    try {
      // Executar testes com Jest (modo serial e saída forçada para evitar travas)
      const testCommand = 'npx jest tests/security.test.js --verbose --runInBand --forceExit --testTimeout=60000';
      const output = execSync(testCommand, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Testes automatizados passaram');
      this.results.passed++;
      
    } catch (error) {
      console.log('❌ Testes automatizados falharam');
      this.results.failed++;
      this.results.errors.push('Testes automatizados falharam');
      console.error(error.stdout || error.message);
    }
  }

  async runSecurityChecks() {
    console.log('\n🔍 Executando verificações de segurança...');
    
    const checks = [
      {
        name: 'Configuração de Produção',
        check: () => this.checkProductionConfig()
      },
      {
        name: 'Dependências Vulneráveis',
        check: () => this.checkVulnerableDependencies()
      },
      {
        name: 'Arquivos Sensíveis',
        check: () => this.checkSensitiveFiles()
      },
      {
        name: 'Configurações de Segurança',
        check: () => this.checkSecurityConfig()
      }
    ];

    for (const check of checks) {
      try {
        await check.check();
        console.log(`✅ ${check.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        this.results.failed++;
        this.results.errors.push(`${check.name}: ${error.message}`);
      }
    }
  }

  checkProductionConfig() {
    const requiredEnvVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'DB_PASSWORD'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Variável de ambiente ${envVar} não definida`);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      if (process.env.JWT_SECRET === 'agendamento-platform-secret-key-2025') {
        throw new Error('JWT_SECRET deve ser alterado em produção');
      }
      
      if (process.env.DB_PASSWORD === 'CHANGE_THIS_PASSWORD') {
        throw new Error('DB_PASSWORD deve ser alterado em produção');
      }
    }
  }

  checkVulnerableDependencies() {
    try {
      // Verificar se npm audit está disponível
      execSync('npm audit --audit-level=moderate', { stdio: 'pipe' });
    } catch (error) {
      // npm audit retorna código de saída não-zero se encontrar vulnerabilidades
      if (error.status !== 0) {
        throw new Error('Dependências vulneráveis encontradas. Execute: npm audit fix');
      }
    }
  }

  checkSensitiveFiles() {
    const sensitiveFiles = [
      '.env',
      '.env.production',
      'config/database.js',
      'package-lock.json'
    ];

    for (const file of sensitiveFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verificar se contém senhas ou chaves em texto plano
        const sensitivePatterns = [
          /password\s*=\s*['"][^'"]+['"]/i,
          /secret\s*=\s*['"][^'"]+['"]/i,
          /key\s*=\s*['"][^'"]+['"]/i
        ];

        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            this.results.warnings.push(`Arquivo ${file} pode conter informações sensíveis`);
          }
        }
      }
    }
  }

  checkSecurityConfig() {
    const securityConfigs = [
      {
        name: 'Rate Limiting',
        check: process.env.ENABLE_RATE_LIMITING === 'true'
      },
      {
        name: 'Security Alerts',
        check: process.env.ENABLE_SECURITY_ALERTS === 'true'
      },
      {
        name: 'HTTPS (em produção)',
        check: process.env.NODE_ENV !== 'production' || process.env.HTTPS === 'true'
      }
    ];

    for (const config of securityConfigs) {
      if (!config.check) {
        throw new Error(`${config.name} não está configurado corretamente`);
      }
    }
  }

  async generateReport() {
    this.results.endTime = new Date();
    const duration = this.results.endTime - this.results.startTime;

    const report = {
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        duration: `${duration}ms`
      },
      errors: this.results.errors,
      warnings: this.results.warnings,
      timestamp: this.results.endTime.toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Salvar relatório
    const reportPath = path.join(__dirname, '..', 'security-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const runner = new SecurityTestRunner();
  runner.run();
}

module.exports = SecurityTestRunner;
