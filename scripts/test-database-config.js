#!/usr/bin/env node

/**
 * Script de Teste da Configuração de Banco
 * Testa a detecção automática SQLite/PostgreSQL
 */

const dbConfig = require('../src/config/database');

class DatabaseConfigTester {
  constructor() {
    this.results = {
      sqlite: null,
      postgresql: null,
      hybrid: null
    };
  }

  async run() {
    console.log('🧪 Testando configuração de banco de dados...\n');

    try {
      await this.testCurrentConfig();
      await this.testSQLiteMode();
      await this.testPostgreSQLMode();
      await this.testHybridMode();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
      process.exit(1);
    }
  }

  async testCurrentConfig() {
    console.log('🔍 Testando configuração atual...');
    
    try {
      const connection = await dbConfig.testConnection();
      
      console.log(`✅ Banco atual: ${connection.type}`);
      console.log(`📊 Status: ${connection.success ? 'Conectado' : 'Erro'}`);
      console.log(`⏰ Timestamp: ${connection.timestamp}`);
      console.log(`📋 Versão: ${connection.version}`);
      
      this.results.current = connection;
      
    } catch (error) {
      console.error('❌ Erro na configuração atual:', error.message);
    }
  }

  async testSQLiteMode() {
    console.log('\n🗃️ Testando modo SQLite...');
    
    // Salvar configuração atual
    const originalEnv = { ...process.env };
    
    try {
      // Forçar SQLite
      process.env.NODE_ENV = 'development';
      process.env.DB_TYPE = 'sqlite';
      process.env.USE_POSTGRESQL = 'false';
      
      // Recarregar configuração
      delete require.cache[require.resolve('../src/config/database')];
      const sqliteConfig = require('../src/config/database');
      
      const connection = await sqliteConfig.testConnection();
      
      console.log(`✅ SQLite: ${connection.success ? 'OK' : 'Erro'}`);
      console.log(`📊 Tipo: ${connection.type}`);
      
      this.results.sqlite = connection;
      
    } catch (error) {
      console.error('❌ Erro no SQLite:', error.message);
    } finally {
      // Restaurar configuração
      process.env = originalEnv;
    }
  }

  async testPostgreSQLMode() {
    console.log('\n🐘 Testando modo PostgreSQL...');
    
    // Salvar configuração atual
    const originalEnv = { ...process.env };
    
    try {
      // Forçar PostgreSQL
      process.env.NODE_ENV = 'production';
      process.env.DB_TYPE = 'postgresql';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'agendamento';
      process.env.DB_USER = 'agendamento_user';
      process.env.DB_PASSWORD = 'agendamento_pass_2024';
      
      // Recarregar configuração
      delete require.cache[require.resolve('../src/config/database')];
      const pgConfig = require('../src/config/database');
      
      const connection = await pgConfig.testConnection();
      
      console.log(`✅ PostgreSQL: ${connection.success ? 'OK' : 'Erro'}`);
      console.log(`📊 Tipo: ${connection.type}`);
      
      this.results.postgresql = connection;
      
    } catch (error) {
      console.error('❌ Erro no PostgreSQL:', error.message);
      console.log('💡 Dica: Execute "node scripts/start-postgresql.js" primeiro');
    } finally {
      // Restaurar configuração
      process.env = originalEnv;
    }
  }

  async testHybridMode() {
    console.log('\n🔄 Testando modo híbrido...');
    
    try {
      // Testar detecção automática
      const isPostgreSQL = process.env.NODE_ENV === 'production' || 
                          process.env.DB_TYPE === 'postgresql' || 
                          process.env.USE_POSTGRESQL === 'true';
      
      const isSQLite = !isPostgreSQL;
      
      console.log(`📊 Detecção automática:`);
      console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      console.log(`  - DB_TYPE: ${process.env.DB_TYPE || 'undefined'}`);
      console.log(`  - USE_POSTGRESQL: ${process.env.USE_POSTGRESQL || 'undefined'}`);
      console.log(`  - Resultado: ${isPostgreSQL ? 'PostgreSQL' : 'SQLite'}`);
      
      this.results.hybrid = {
        isPostgreSQL,
        isSQLite,
        detection: 'automatic'
      };
      
    } catch (error) {
      console.error('❌ Erro no modo híbrido:', error.message);
    }
  }

  printResults() {
    console.log('\n📊 Resultados dos Testes:');
    console.log('========================');
    
    // Configuração atual
    if (this.results.current) {
      console.log(`\n🔍 Configuração Atual:`);
      console.log(`  - Tipo: ${this.results.current.type}`);
      console.log(`  - Status: ${this.results.current.success ? '✅ OK' : '❌ Erro'}`);
    }
    
    // SQLite
    if (this.results.sqlite) {
      console.log(`\n🗃️ SQLite:`);
      console.log(`  - Status: ${this.results.sqlite.success ? '✅ OK' : '❌ Erro'}`);
      console.log(`  - Versão: ${this.results.sqlite.version || 'N/A'}`);
    }
    
    // PostgreSQL
    if (this.results.postgresql) {
      console.log(`\n🐘 PostgreSQL:`);
      console.log(`  - Status: ${this.results.postgresql.success ? '✅ OK' : '❌ Erro'}`);
      console.log(`  - Versão: ${this.results.postgresql.version || 'N/A'}`);
    }
    
    // Modo híbrido
    if (this.results.hybrid) {
      console.log(`\n🔄 Modo Híbrido:`);
      console.log(`  - Detecção: ${this.results.hybrid.detection}`);
      console.log(`  - PostgreSQL: ${this.results.hybrid.isPostgreSQL ? '✅' : '❌'}`);
      console.log(`  - SQLite: ${this.results.hybrid.isSQLite ? '✅' : '❌'}`);
    }
    
    // Recomendações
    console.log('\n💡 Recomendações:');
    
    if (this.results.sqlite?.success && this.results.postgresql?.success) {
      console.log('✅ Ambos os bancos estão funcionando!');
      console.log('   - Use SQLite para desenvolvimento');
      console.log('   - Use PostgreSQL para produção');
    } else if (this.results.sqlite?.success) {
      console.log('✅ SQLite funcionando - ideal para desenvolvimento');
      console.log('⚠️ PostgreSQL não disponível - configure para produção');
    } else if (this.results.postgresql?.success) {
      console.log('✅ PostgreSQL funcionando - ideal para produção');
      console.log('⚠️ SQLite não disponível - configure para desenvolvimento');
    } else {
      console.log('❌ Nenhum banco funcionando - verifique a configuração');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new DatabaseConfigTester();
  tester.run();
}

module.exports = DatabaseConfigTester;
