-- Script completo para criar todas as tabelas PostgreSQL
-- TENANTS (Clientes/Organizações)
CREATE TABLE IF NOT EXISTS tenants (
  id_tenant SERIAL PRIMARY KEY,
  nome_tenant TEXT NOT NULL,
  dominio TEXT UNIQUE,
  status TEXT DEFAULT 'ativo',
  config_tenant JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USUÁRIOS (DONOS DE SALÕES)
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  config_horarios TEXT,
  intervalo_min INTEGER DEFAULT 15,
  max_advance_days INTEGER DEFAULT 60,
  email TEXT,
  senha_hash TEXT,
  tipo TEXT DEFAULT 'barbeiro',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_tenant, whatsapp)
);

-- SERVIÇOS
CREATE TABLE IF NOT EXISTS servicos (
  id_servico SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  nome_servico TEXT NOT NULL,
  duracao_min INTEGER NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  nome TEXT,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_tenant, whatsapp)
);

-- AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id_agendamento SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  id_servico INTEGER REFERENCES servicos(id_servico) ON DELETE SET NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'confirmed',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SLOTS: pré-cálculo de horários
CREATE TABLE IF NOT EXISTS slots (
  id_slot SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'free',
  id_agendamento INTEGER REFERENCES agendamentos(id_agendamento) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notificacoes (
  id_notificacao SERIAL PRIMARY KEY,
  id_agendamento INTEGER REFERENCES agendamentos(id_agendamento) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  enviada BOOLEAN DEFAULT false,
  message_id TEXT,
  enviada_em TIMESTAMP,
  erro TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DASHBOARD CACHE - Para armazenar métricas calculadas
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id_cache SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  dados JSONB,
  data_calculo TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- AUDITORIA DE AÇÕES ADMINISTRATIVAS
CREATE TABLE IF NOT EXISTS audit_logs (
  id_log SERIAL PRIMARY KEY,
  id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE SET NULL,
  id_usuario_admin INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  id_entidade INTEGER,
  dados JSONB,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

-- CONFIGURAÇÕES (PostgreSQL) - Estrutura correta
DROP TABLE IF EXISTS configuracoes;
CREATE TABLE configuracoes (
  id_configuracao SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  nome_estabelecimento TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  horario_abertura TEXT DEFAULT '08:00',
  horario_fechamento TEXT DEFAULT '18:00',
  dias_funcionamento TEXT DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta"]',
  intervalo_agendamento INTEGER DEFAULT 30,
  notificar_agendamentos INTEGER DEFAULT 1,
  notificar_cancelamentos INTEGER DEFAULT 1,
  lembrete_cliente INTEGER DEFAULT 1,
  horas_lembrete INTEGER DEFAULT 24,
  metodo_pagamento_padrao TEXT DEFAULT 'dinheiro',
  aceitar_pix INTEGER DEFAULT 0,
  auto_confirm_whatsapp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants(dominio);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(id_tenant);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_whatsapp ON usuarios(id_tenant, whatsapp);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
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
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(id_tenant);
CREATE INDEX IF NOT EXISTS idx_audit_usuario_admin ON audit_logs(id_usuario_admin);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs(acao);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_configuracoes_usuario ON configuracoes(id_usuario);

