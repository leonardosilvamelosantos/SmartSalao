const path = require('path');
const pool = require(path.join(__dirname, '../../config/database'));

/**
 * Script de migração para criar todas as tabelas do banco de dados
 * Sistema de Agendamento via WhatsApp - MVP Etapa 1
 */

const createTablesSQLite = `
-- TENANTS (Clientes/Organizações)
CREATE TABLE IF NOT EXISTS tenants (
  id_tenant INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_tenant TEXT NOT NULL,
  dominio TEXT UNIQUE,
  status TEXT DEFAULT 'ativo',
  config_tenant TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- USUÁRIOS (DONOS DE SALÕES)
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  config_horarios TEXT,
  intervalo_min INTEGER DEFAULT 15,
  max_advance_days INTEGER DEFAULT 60,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_tenant, whatsapp)
);

-- SERVIÇOS
CREATE TABLE IF NOT EXISTS servicos (
  id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  id_usuario INTEGER,
  nome_servico TEXT NOT NULL,
  duracao_min INTEGER NOT NULL,
  valor REAL NOT NULL,
  descricao TEXT,
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  id_usuario INTEGER,
  nome TEXT,
  whatsapp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_tenant, whatsapp)
);

-- AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  id_usuario INTEGER,
  id_cliente INTEGER,
  id_servico INTEGER,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SLOTS: pré-cálculo de horários
CREATE TABLE IF NOT EXISTS slots (
  id_slot INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  id_usuario INTEGER,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status TEXT DEFAULT 'free',
  id_agendamento INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notificacoes (
  id_notificacao INTEGER PRIMARY KEY AUTOINCREMENT,
  id_agendamento INTEGER,
  tipo TEXT NOT NULL,
  enviada INTEGER DEFAULT 0,
  message_id TEXT,
  enviada_em DATETIME,
  erro TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CONFIGURAÇÕES DE USUÁRIO - Para armazenar configurações específicas
-- CONFIGURAÇÕES DE USUÁRIO (SQLite)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS config_notificacoes TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'barbeiro';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo INTEGER DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- DASHBOARD CACHE - Para armazenar métricas calculadas
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id_cache INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER,
  tipo TEXT NOT NULL,
  dados TEXT,
  data_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- INDEXES importantes - AGORA MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants(dominio);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(id_tenant);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_whatsapp ON usuarios(id_tenant, whatsapp);
CREATE INDEX IF NOT EXISTS idx_servicos_tenant ON servicos(id_tenant);
CREATE INDEX IF NOT EXISTS idx_servicos_tenant_usuario ON servicos(id_tenant, id_usuario);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(id_tenant);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_whatsapp ON clientes(id_tenant, whatsapp);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant ON agendamentos(id_tenant);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_usuario_start ON agendamentos(id_tenant, id_usuario, start_at);
CREATE INDEX IF NOT EXISTS idx_slots_tenant ON slots(id_tenant);
CREATE INDEX IF NOT EXISTS idx_slots_tenant_usuario_start ON slots(id_tenant, id_usuario, start_at);
CREATE INDEX IF NOT EXISTS idx_slots_tenant_status ON slots(id_tenant, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento ON notificacoes(id_agendamento);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_usuario ON dashboard_cache(id_usuario);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- AUDITORIA DE AÇÕES ADMINISTRATIVAS
CREATE TABLE IF NOT EXISTS audit_logs (
  id_log INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER,
  id_usuario_admin INTEGER,
  acao TEXT NOT NULL,
  entidade TEXT,
  id_entidade INTEGER,
  dados TEXT,
  status TEXT DEFAULT 'success',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(id_tenant);
CREATE INDEX IF NOT EXISTS idx_audit_usuario_admin ON audit_logs(id_usuario_admin);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs(acao);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
`;

/**
 * Executa as migrações do banco de dados
 */
async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migrações do banco de dados...');

    // Executar script de criação das tabelas (SQLite)
    const statements = createTablesSQLite.split(';').map(s => s.trim()).filter(Boolean);
    for (const sql of statements) {
      await client.query(sql);
    }
    console.log('✅ Tabelas criadas com sucesso');

    console.log('📋 Migração SQLite executada.');

    console.log('🎉 Migrações concluídas com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante as migrações:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Remove todas as tabelas (para desenvolvimento/reset)
 */
async function dropTables() {
  const client = await pool.connect();

  try {
    console.log('🗑️  Removendo tabelas existentes...');

    await client.query(`
      DROP TABLE IF EXISTS slots CASCADE;
      DROP TABLE IF EXISTS agendamentos CASCADE;
      DROP TABLE IF EXISTS clientes CASCADE;
      DROP TABLE IF EXISTS servicos CASCADE;
      DROP TABLE IF EXISTS usuarios CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
    `);

    console.log('✅ Tabelas removidas com sucesso');

  } catch (error) {
    console.error('❌ Erro ao remover tabelas:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  runMigrations,
  dropTables,
  createTablesSQLite
};
