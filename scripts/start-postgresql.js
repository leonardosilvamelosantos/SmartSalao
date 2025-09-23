#!/usr/bin/env node

/**
 * Script para Iniciar PostgreSQL via Docker
 * Inicia o container PostgreSQL e configura o banco
 */

const { execSync } = require('child_process');
const path = require('path');

class PostgreSQLStarter {
  constructor() {
    this.dockerComposeFile = path.join(__dirname, '../docker-compose.yml');
  }

  async run() {
    console.log('🐘 Iniciando PostgreSQL via Docker...\n');

    try {
      await this.checkDocker();
      await this.startPostgreSQL();
      await this.waitForDatabase();
      await this.runSetup();
      
      console.log('\n✅ PostgreSQL iniciado e configurado com sucesso!');
      console.log('\n📊 Informações de Conexão:');
      console.log('- Host: localhost');
      console.log('- Porta: 5432');
      console.log('- Database: agendamento');
      console.log('- User: agendamento_user');
      console.log('- Password: agendamento_pass_2024');
      
      console.log('\n🔧 Para usar PostgreSQL:');
      console.log('export NODE_ENV=production');
      console.log('export DB_TYPE=postgresql');
      console.log('npm start');

    } catch (error) {
      console.error('❌ Erro ao iniciar PostgreSQL:', error.message);
      process.exit(1);
    }
  }

  async checkDocker() {
    console.log('🔍 Verificando Docker...');
    
    try {
      execSync('docker --version', { stdio: 'pipe' });
      console.log('✅ Docker encontrado');
    } catch (error) {
      throw new Error('Docker não encontrado. Instale o Docker Desktop');
    }
  }

  async startPostgreSQL() {
    console.log('🚀 Iniciando container PostgreSQL...');
    
    try {
      // Parar containers existentes
      try {
        execSync('docker-compose down', { 
          cwd: path.dirname(this.dockerComposeFile),
          stdio: 'pipe' 
        });
      } catch (e) {
        // Ignorar erro se não houver containers rodando
      }

      // Iniciar apenas o banco de dados
      execSync('docker-compose up -d db', { 
        cwd: path.dirname(this.dockerComposeFile),
        stdio: 'inherit' 
      });
      
      console.log('✅ Container PostgreSQL iniciado');
    } catch (error) {
      throw new Error(`Erro ao iniciar container: ${error.message}`);
    }
  }

  async waitForDatabase() {
    console.log('⏳ Aguardando banco de dados ficar pronto...');
    
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        // Testar conexão
        execSync('docker exec agendamento-db pg_isready -U agendamento_user -d agendamento', {
          stdio: 'pipe'
        });
        
        console.log('✅ Banco de dados pronto');
        return;
        
      } catch (error) {
        attempts++;
        console.log(`⏳ Tentativa ${attempts}/${maxAttempts}...`);
        await this.sleep(2000);
      }
    }
    
    throw new Error('Timeout: Banco de dados não ficou pronto');
  }

  async runSetup() {
    console.log('🔧 Executando configuração do banco...');
    
    try {
      // Configurar variáveis de ambiente para PostgreSQL
      process.env.NODE_ENV = 'production';
      process.env.DB_TYPE = 'postgresql';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'agendamento';
      process.env.DB_USER = 'agendamento_user';
      process.env.DB_PASSWORD = 'agendamento_pass_2024';
      
      // Executar script de setup
      const setupScript = path.join(__dirname, 'setup-postgresql.js');
      execSync(`node ${setupScript}`, { stdio: 'inherit' });
      
      console.log('✅ Configuração concluída');
    } catch (error) {
      throw new Error(`Erro na configuração: ${error.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const starter = new PostgreSQLStarter();
  starter.run();
}

module.exports = PostgreSQLStarter;
