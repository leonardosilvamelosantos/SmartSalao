#!/usr/bin/env node

/**
 * Demonstração da Configuração Híbrida de Banco
 * Mostra como o sistema detecta e usa SQLite/PostgreSQL automaticamente
 */

const dbConfig = require('../src/config/database');

class HybridDatabaseDemo {
  constructor() {
    this.demoData = {
      usuarios: [
        { nome: 'João Silva', email: 'joao@teste.com', tipo: 'barbeiro' },
        { nome: 'Maria Santos', email: 'maria@teste.com', tipo: 'admin' }
      ],
      servicos: [
        { nome_servico: 'Corte Masculino', duracao_min: 30, valor: 25.00 },
        { nome_servico: 'Barba', duracao_min: 20, valor: 15.00 }
      ]
    };
  }

  async run() {
    console.log('🎭 Demonstração da Configuração Híbrida de Banco\n');

    try {
      await this.showCurrentConfig();
      await this.demonstrateSQLiteMode();
      await this.demonstratePostgreSQLMode();
      await this.showMigrationProcess();
      
      console.log('\n✅ Demonstração concluída!');
      console.log('\n📚 Como usar:');
      console.log('1. Desenvolvimento: NODE_ENV=development (usa SQLite)');
      console.log('2. Produção: NODE_ENV=production (usa PostgreSQL)');
      console.log('3. Forçar SQLite: DB_TYPE=sqlite');
      console.log('4. Forçar PostgreSQL: DB_TYPE=postgresql');

    } catch (error) {
      console.error('❌ Erro na demonstração:', error.message);
    }
  }

  async showCurrentConfig() {
    console.log('🔍 Configuração Atual:');
    console.log('=====================');
    
    const connection = await dbConfig.testConnection();
    
    console.log(`📊 Banco detectado: ${connection.type}`);
    console.log(`✅ Status: ${connection.success ? 'Conectado' : 'Erro'}`);
    console.log(`⏰ Timestamp: ${connection.timestamp}`);
    console.log(`📋 Versão: ${connection.version}`);
    console.log(`🔧 Configuração: ${dbConfig.isPostgreSQL ? 'PostgreSQL' : 'SQLite'}`);
  }

  async demonstrateSQLiteMode() {
    console.log('\n🗃️ Modo SQLite (Desenvolvimento):');
    console.log('==================================');
    
    // Simular modo SQLite
    const originalEnv = { ...process.env };
    
    try {
      process.env.NODE_ENV = 'development';
      process.env.DB_TYPE = 'sqlite';
      
      console.log('📝 Variáveis de ambiente:');
      console.log(`  NODE_ENV=${process.env.NODE_ENV}`);
      console.log(`  DB_TYPE=${process.env.DB_TYPE}`);
      
      console.log('\n💡 Características do SQLite:');
      console.log('  ✅ Arquivo único (data/agendamento_dev.db)');
      console.log('  ✅ Sem dependências externas');
      console.log('  ✅ Ideal para desenvolvimento');
      console.log('  ❌ Não suporta schemas (multi-tenancy limitado)');
      console.log('  ❌ Performance limitada para muitos usuários');
      
      console.log('\n🔧 Como ativar:');
      console.log('  export NODE_ENV=development');
      console.log('  export DB_TYPE=sqlite');
      console.log('  npm start');
      
    } finally {
      process.env = originalEnv;
    }
  }

  async demonstratePostgreSQLMode() {
    console.log('\n🐘 Modo PostgreSQL (Produção):');
    console.log('==============================');
    
    // Simular modo PostgreSQL
    const originalEnv = { ...process.env };
    
    try {
      process.env.NODE_ENV = 'production';
      process.env.DB_TYPE = 'postgresql';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      
      console.log('📝 Variáveis de ambiente:');
      console.log(`  NODE_ENV=${process.env.NODE_ENV}`);
      console.log(`  DB_TYPE=${process.env.DB_TYPE}`);
      console.log(`  DB_HOST=${process.env.DB_HOST}`);
      console.log(`  DB_PORT=${process.env.DB_PORT}`);
      
      console.log('\n💡 Características do PostgreSQL:');
      console.log('  ✅ Suporte completo a schemas (multi-tenancy real)');
      console.log('  ✅ Performance superior');
      console.log('  ✅ Recursos avançados (JSONB, índices, etc.)');
      console.log('  ✅ Ideal para produção');
      console.log('  ❌ Requer configuração externa');
      console.log('  ❌ Mais complexo para desenvolvimento');
      
      console.log('\n🔧 Como ativar:');
      console.log('  export NODE_ENV=production');
      console.log('  export DB_TYPE=postgresql');
      console.log('  docker-compose up -d db');
      console.log('  npm start');
      
    } finally {
      process.env = originalEnv;
    }
  }

  async showMigrationProcess() {
    console.log('\n🔄 Processo de Migração:');
    console.log('========================');
    
    console.log('📋 Passos para migrar de SQLite para PostgreSQL:');
    console.log('  1. Configurar PostgreSQL:');
    console.log('     npm run db:start-postgres');
    console.log('  2. Migrar dados:');
    console.log('     npm run db:migrate-sqlite-to-postgres');
    console.log('  3. Testar configuração:');
    console.log('     npm run db:test-config');
    console.log('  4. Ativar PostgreSQL:');
    console.log('     export NODE_ENV=production');
    console.log('     npm start');
    
    console.log('\n📊 Vantagens da configuração híbrida:');
    console.log('  ✅ Desenvolvimento rápido com SQLite');
    console.log('  ✅ Produção robusta com PostgreSQL');
    console.log('  ✅ Detecção automática de banco');
    console.log('  ✅ Migração de dados simplificada');
    console.log('  ✅ Compatibilidade total entre bancos');
  }

  async demonstrateQueries() {
    console.log('\n🔍 Demonstração de Queries:');
    console.log('============================');
    
    try {
      // Testar query básica
      const result = await dbConfig.pool.query('SELECT 1 as test');
      console.log('✅ Query básica funcionando');
      
      // Testar inserção (se tabelas existirem)
      try {
        await dbConfig.pool.query(`
          INSERT INTO usuarios (nome, email, senha_hash, tipo) 
          VALUES ($1, $2, $3, $4)
        `, ['Teste Demo', 'demo@teste.com', 'hash123', 'demo']);
        
        console.log('✅ Inserção funcionando');
        
        // Limpar dados de teste
        await dbConfig.pool.query('DELETE FROM usuarios WHERE email = $1', ['demo@teste.com']);
        console.log('✅ Limpeza funcionando');
        
      } catch (error) {
        console.log('⚠️ Inserção não testada (tabelas podem não existir)');
      }
      
    } catch (error) {
      console.log('❌ Erro nas queries:', error.message);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const demo = new HybridDatabaseDemo();
  demo.run();
}

module.exports = HybridDatabaseDemo;
