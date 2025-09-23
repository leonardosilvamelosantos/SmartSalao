#!/usr/bin/env node

/**
 * Script de Configuração do PostgreSQL
 * Configura e testa a conexão com PostgreSQL usando configuração centralizada
 */

const pool = require('../src/config/postgresql');
const fs = require('fs');
const path = require('path');

class PostgreSQLSetup {
  constructor() {
    this.pool = pool;
    this.config = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5433', 10),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'agendamento',
      user: process.env.PGUSER || process.env.DB_USER || 'agendamento_user',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'agendamento_pass_2024',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
  }

  async run() {
    console.log('🐘 Configurando PostgreSQL...\n');

    try {
      await this.testConnection();
      await this.checkDatabaseExists();
      await this.createTables();
      await this.testQueries();
      await this.checkPerformance();
      
      console.log('\n✅ PostgreSQL configurado com sucesso!');
      console.log('\n📊 Estatísticas:');
      console.log(`- Host: ${this.config.host}:${this.config.port}`);
      console.log(`- Database: ${this.config.database}`);
      console.log(`- User: ${this.config.user}`);
      console.log(`- Pool: ${this.config.min}-${this.config.max} conexões`);

    } catch (error) {
      console.error('❌ Erro na configuração do PostgreSQL:', error.message);
      console.log('\n🔧 Soluções possíveis:');
      console.log('1. Verificar se PostgreSQL está rodando');
      console.log('2. Verificar credenciais no .env');
      console.log('3. Executar: docker-compose up -d db');
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async testConnection() {
    console.log('🔍 Testando conexão...');
    
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      console.log(`✅ Conectado: ${result.rows[0].current_time}`);
      console.log(`📋 Versão: ${result.rows[0].db_version.split(' ')[0]}`);
    } finally {
      client.release();
    }
  }

  async checkDatabaseExists() {
    console.log('🗄️ Verificando banco de dados...');
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT datname FROM pg_database 
        WHERE datname = $1
      `, [this.config.database]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Banco '${this.config.database}' existe`);
      } else {
        console.log(`⚠️ Banco '${this.config.database}' não existe`);
        console.log('💡 Execute: createdb agendamento');
      }
    } finally {
      client.release();
    }
  }

  async createTables() {
    console.log('📋 Criando tabelas...');
    
    const client = await this.pool.connect();
    try {
      // Verificar se tabelas já existem
      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('usuarios', 'servicos', 'clientes', 'agendamentos', 'slots', 'tenants', 'notificacoes', 'configuracoes')
      `);
      
      if (tablesResult.rows.length > 0) {
        console.log(`✅ ${tablesResult.rows.length} tabelas já existem: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
        console.log('📋 Verificando estrutura das tabelas...');
        
        // Verificar se as tabelas têm as colunas necessárias
        const usuariosCheck = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'usuarios' AND table_schema = 'public'
        `);
        
        if (usuariosCheck.rows.length > 0) {
          console.log(`✅ Tabela usuarios tem ${usuariosCheck.rows.length} colunas`);
        }
        
        return;
      }

      // Criar tabelas completas do sistema
      const createTablesSQL = `
        -- Tabela de tenants (multi-tenant)
        CREATE TABLE IF NOT EXISTS tenants (
          id_tenant SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          telefone TEXT,
          documento TEXT,
          schema_name TEXT UNIQUE NOT NULL,
          plano TEXT NOT NULL DEFAULT 'basico',
          status TEXT NOT NULL DEFAULT 'ativo',
          limites JSONB DEFAULT '{
            "agendamentos_mes": 100,
            "servicos": 10,
            "usuarios": 3,
            "armazenamento_mb": 100,
            "api_requests_dia": 1000
          }'::jsonb,
          configuracoes JSONB DEFAULT '{
            "timezone": "America/Sao_Paulo",
            "moeda": "BRL",
            "idioma": "pt-BR",
            "notificacoes": {
              "email": true,
              "whatsapp": true,
              "sms": false
            }
          }'::jsonb,
          data_criacao TIMESTAMPTZ DEFAULT NOW(),
          data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
          data_expiracao TIMESTAMPTZ,
          ultimo_acesso TIMESTAMPTZ
        );

        -- Tabela de usuários
        CREATE TABLE IF NOT EXISTS usuarios (
          id_usuario SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha_hash TEXT,
          whatsapp VARCHAR(20),
          tipo TEXT DEFAULT 'barbeiro',
          ativo BOOLEAN DEFAULT true,
          id_tenant INTEGER DEFAULT 1,
          timezone TEXT DEFAULT 'America/Sao_Paulo',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de serviços
        CREATE TABLE IF NOT EXISTS servicos (
          id_servico SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          id_tenant INTEGER DEFAULT 1,
          nome_servico TEXT NOT NULL,
          duracao_min INTEGER NOT NULL,
          valor NUMERIC(10,2) NOT NULL,
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de clientes
        CREATE TABLE IF NOT EXISTS clientes (
          id_cliente SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          id_tenant INTEGER DEFAULT 1,
          nome TEXT NOT NULL,
          whatsapp VARCHAR(20) UNIQUE,
          email TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de agendamentos
        CREATE TABLE IF NOT EXISTS agendamentos (
          id_agendamento SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          id_servico INTEGER REFERENCES servicos(id_servico) ON DELETE CASCADE,
          id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE CASCADE,
          start_at TIMESTAMPTZ NOT NULL,
          end_at TIMESTAMPTZ NOT NULL,
          status TEXT DEFAULT 'confirmed',
          valor_total NUMERIC(10,2),
          observacoes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de slots
        CREATE TABLE IF NOT EXISTS slots (
          id_slot SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          start_at TIMESTAMPTZ NOT NULL,
          end_at TIMESTAMPTZ NOT NULL,
          status TEXT DEFAULT 'free',
          id_agendamento INTEGER REFERENCES agendamentos(id_agendamento) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de notificações
        CREATE TABLE IF NOT EXISTS notificacoes (
          id_notificacao SERIAL PRIMARY KEY,
          id_agendamento INTEGER REFERENCES agendamentos(id_agendamento) ON DELETE CASCADE,
          tipo TEXT NOT NULL,
          enviada BOOLEAN DEFAULT false,
          message_id TEXT,
          enviada_em TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de configurações
        CREATE TABLE IF NOT EXISTS configuracoes (
          id_configuracao SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          dias_funcionamento TEXT,
          horario_abertura TEXT,
          horario_fechamento TEXT,
          intervalo_agendamento INTEGER DEFAULT 30,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de cache do dashboard
        CREATE TABLE IF NOT EXISTS dashboard_cache (
          id_cache SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          cache_key TEXT NOT NULL,
          cache_data JSONB NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de logs de auditoria
        CREATE TABLE IF NOT EXISTS audit_logs (
          id_log SERIAL PRIMARY KEY,
          id_tenant INTEGER,
          id_usuario INTEGER,
          acao TEXT NOT NULL,
          tabela TEXT,
          registro_id INTEGER,
          dados_antigos JSONB,
          dados_novos JSONB,
          ip_address TEXT,
          user_agent TEXT,
          data_evento TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabelas de segurança
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          tenant_id INTEGER,
          user_id INTEGER,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS security_alerts (
          id SERIAL PRIMARY KEY,
          alert_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          count INTEGER NOT NULL,
          ip_address TEXT,
          tenant_id INTEGER,
          details TEXT,
          status TEXT DEFAULT 'active',
          resolved_by TEXT,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
        CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_servicos_usuario ON servicos(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_servicos_tenant ON servicos(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario ON agendamentos(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(start_at);
        CREATE INDEX IF NOT EXISTS idx_slots_usuario ON slots(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_slots_data ON slots(start_at);
        CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
        CREATE INDEX IF NOT EXISTS idx_tenants_schema ON tenants(schema_name);
        CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento ON notificacoes(id_agendamento);
        CREATE INDEX IF NOT EXISTS idx_configuracoes_usuario ON configuracoes(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_dashboard_cache_usuario ON dashboard_cache(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_dashboard_cache_key ON dashboard_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(id_usuario);
        CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
      `;

      await client.query(createTablesSQL);
      console.log('✅ Tabelas criadas com sucesso');

    } finally {
      client.release();
    }
  }

  async testQueries() {
    console.log('🧪 Testando queries...');
    
    const client = await this.pool.connect();
    try {
      // Teste de SELECT
      const selectResult = await client.query('SELECT COUNT(*) as count FROM usuarios');
      console.log(`✅ SELECT: ${selectResult.rows[0].count} usuários`);

      // Teste de INSERT
      const insertResult = await client.query(`
        INSERT INTO usuarios (nome, email, senha_hash, tipo) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id_usuario
      `, ['Teste PostgreSQL', 'teste@postgresql.com', 'hash123', 'admin']);
      
      console.log(`✅ INSERT: Usuário criado com ID ${insertResult.rows[0].id_usuario}`);

      // Teste de UPDATE
      const updateResult = await client.query(`
        UPDATE usuarios 
        SET nome = $1 
        WHERE id_usuario = $2
      `, ['Teste PostgreSQL Atualizado', insertResult.rows[0].id_usuario]);
      
      console.log(`✅ UPDATE: ${updateResult.rowCount} registro atualizado`);

      // Teste de DELETE
      const deleteResult = await client.query(`
        DELETE FROM usuarios 
        WHERE id_usuario = $1
      `, [insertResult.rows[0].id_usuario]);
      
      console.log(`✅ DELETE: ${deleteResult.rowCount} registro removido`);

    } finally {
      client.release();
    }
  }

  async checkPerformance() {
    console.log('⚡ Verificando performance...');
    
    const client = await this.pool.connect();
    try {
      const startTime = Date.now();
      
      // Executar query de performance
      await client.query(`
        SELECT u.nome, s.nome_servico, a.start_at 
        FROM usuarios u
        LEFT JOIN servicos s ON u.id_usuario = s.id_usuario
        LEFT JOIN agendamentos a ON u.id_usuario = a.id_usuario
        LIMIT 100
      `);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Query executada em ${duration}ms`);

      // Verificar configurações do pool
      console.log(`📊 Pool: ${this.pool.totalCount} total, ${this.pool.idleCount} idle, ${this.pool.waitingCount} waiting`);

    } finally {
      client.release();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const setup = new PostgreSQLSetup();
  setup.run();
}

module.exports = PostgreSQLSetup;
