-- ==========================================
-- SISTEMA MULTI-TENANT - SCHEMA PRINCIPAL
-- ==========================================

-- Tabela de tenants (contratos/usuários principais)
CREATE TABLE IF NOT EXISTS tenants (
    id_tenant SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    documento VARCHAR(20), -- CPF/CNPJ
    schema_name VARCHAR(100) UNIQUE NOT NULL, -- Nome do schema isolado
    plano VARCHAR(50) NOT NULL DEFAULT 'basico',
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
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

-- Tabela de usuários por tenant (admin, funcionários, etc.)
CREATE TABLE IF NOT EXISTS tenant_users (
    id_usuario SERIAL PRIMARY KEY,
    id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    cargo VARCHAR(100) DEFAULT 'funcionario',
    permissoes JSONB DEFAULT '{
        "admin": false,
        "agendamentos": true,
        "clientes": true,
        "servicos": true,
        "relatorios": false,
        "configuracoes": false
    }'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    ultimo_login TIMESTAMPTZ,
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_tenant, email)
);

-- Controle de uso por tenant
CREATE TABLE IF NOT EXISTS tenant_usage (
    id_usage SERIAL PRIMARY KEY,
    id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE CASCADE,
    periodo DATE NOT NULL, -- YYYY-MM-01
    tipo VARCHAR(50) NOT NULL, -- agendamentos, api_requests, armazenamento
    quantidade INTEGER NOT NULL DEFAULT 0,
    limite INTEGER NOT NULL DEFAULT 0,
    data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_tenant, periodo, tipo)
);

-- Histórico de faturamento
CREATE TABLE IF NOT EXISTS tenant_billing (
    id_billing SERIAL PRIMARY KEY,
    id_tenant INTEGER REFERENCES tenants(id_tenant) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    plano VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMPTZ,
    forma_pagamento VARCHAR(50),
    notas TEXT,
    data_criacao TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id_log SERIAL PRIMARY KEY,
    id_tenant INTEGER REFERENCES tenants(id_tenant),
    id_usuario INTEGER REFERENCES tenant_users(id_usuario),
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(100),
    registro_id INTEGER,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    data_evento TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_schema ON tenants(schema_name);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(id_tenant);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);
CREATE INDEX idx_tenant_usage_tenant ON tenant_usage(id_tenant);
CREATE INDEX idx_tenant_usage_periodo ON tenant_usage(periodo);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(id_tenant);
CREATE INDEX idx_audit_logs_data ON audit_logs(data_evento);

-- ==========================================
-- FUNCTIONS ÚTEIS
-- ==========================================

-- Function para criar schema automaticamente
CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(schema_name);

    -- Criar tabelas padrão no novo schema
    EXECUTE '
        CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.usuarios (
            id_usuario SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            tipo VARCHAR(50) DEFAULT ''barbeiro'',
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.servicos (
            id_servico SERIAL PRIMARY KEY,
            id_usuario INTEGER REFERENCES ' || quote_ident(schema_name) || '.usuarios(id_usuario),
            nome_servico VARCHAR(255) NOT NULL,
            duracao_min INTEGER NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            ativo BOOLEAN DEFAULT true,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.clientes (
            id_cliente SERIAL PRIMARY KEY,
            id_usuario INTEGER REFERENCES ' || quote_ident(schema_name) || '.usuarios(id_usuario),
            nome VARCHAR(255) NOT NULL,
            whatsapp VARCHAR(20) UNIQUE,
            email VARCHAR(255),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.slots (
            id_slot SERIAL PRIMARY KEY,
            id_usuario INTEGER REFERENCES ' || quote_ident(schema_name) || '.usuarios(id_usuario),
            start_at TIMESTAMPTZ NOT NULL,
            end_at TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT ''free'',
            id_agendamento INTEGER,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.agendamentos (
            id_agendamento SERIAL PRIMARY KEY,
            id_usuario INTEGER REFERENCES ' || quote_ident(schema_name) || '.usuarios(id_usuario),
            id_servico INTEGER REFERENCES ' || quote_ident(schema_name) || '.servicos(id_servico),
            id_cliente INTEGER REFERENCES ' || quote_ident(schema_name) || '.clientes(id_cliente),
            start_at TIMESTAMPTZ NOT NULL,
            end_at TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT ''pending'',
            valor_total DECIMAL(10,2),
            observacoes TEXT,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ';
END;
$$ LANGUAGE plpgsql;

-- Function para verificar limites
CREATE OR REPLACE FUNCTION check_tenant_limits(
    p_tenant_id INTEGER,
    p_tipo VARCHAR(50),
    p_quantidade INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_limite INTEGER;
    v_atual INTEGER;
    v_periodo DATE;
BEGIN
    -- Obter período atual (mês corrente)
    v_periodo := date_trunc('month', CURRENT_DATE);

    -- Obter limite do tenant
    SELECT (limites->>p_tipo)::INTEGER INTO v_limite
    FROM tenants WHERE id_tenant = p_tenant_id;

    IF v_limite IS NULL THEN
        RETURN true; -- Sem limite definido
    END IF;

    -- Obter uso atual
    SELECT quantidade INTO v_atual
    FROM tenant_usage
    WHERE id_tenant = p_tenant_id
      AND periodo = v_periodo
      AND tipo = p_tipo;

    IF v_atual IS NULL THEN
        v_atual := 0;
    END IF;

    -- Verificar se excede limite
    RETURN (v_atual + p_quantidade) <= v_limite;
END;
$$ LANGUAGE plpgsql;

-- Function para atualizar uso
CREATE OR REPLACE FUNCTION update_tenant_usage(
    p_tenant_id INTEGER,
    p_tipo VARCHAR(50),
    p_quantidade INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    v_periodo DATE;
    v_limite INTEGER;
BEGIN
    v_periodo := date_trunc('month', CURRENT_DATE);

    -- Obter limite
    SELECT (limites->>p_tipo)::INTEGER INTO v_limite
    FROM tenants WHERE id_tenant = p_tenant_id;

    -- Inserir ou atualizar uso
    INSERT INTO tenant_usage (id_tenant, periodo, tipo, quantidade, limite)
    VALUES (p_tenant_id, v_periodo, p_tipo, p_quantidade, COALESCE(v_limite, 0))
    ON CONFLICT (id_tenant, periodo, tipo)
    DO UPDATE SET
        quantidade = tenant_usage.quantidade + p_quantidade,
        data_atualizacao = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS DE AUDITORIA
-- ==========================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id INTEGER;
    v_user_id INTEGER;
BEGIN
    -- Tentar obter tenant_id do contexto da sessão
    -- Isso pode ser configurado via aplicação
    v_tenant_id := NULLIF(current_setting('app.tenant_id', TRUE), '')::INTEGER;
    v_user_id := NULLIF(current_setting('app.user_id', TRUE), '')::INTEGER;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            id_tenant, id_usuario, acao, tabela, registro_id,
            dados_antigos, ip_address
        ) VALUES (
            v_tenant_id, v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id,
            row_to_json(OLD)::jsonb, inet_client_addr()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            id_tenant, id_usuario, acao, tabela, registro_id,
            dados_antigos, dados_novos, ip_address
        ) VALUES (
            v_tenant_id, v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id,
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, inet_client_addr()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            id_tenant, id_usuario, acao, tabela, registro_id,
            dados_novos, ip_address
        ) VALUES (
            v_tenant_id, v_user_id, 'INSERT', TG_TABLE_NAME, NEW.id,
            row_to_json(NEW)::jsonb, inet_client_addr()
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DADOS INICIAIS
-- ==========================================

-- Inserir tenant padrão para testes
INSERT INTO tenants (nome, email, telefone, schema_name, plano, limites)
VALUES (
    'Sistema de Testes',
    'admin@teste.com',
    '+5511999999999',
    'tenant_teste',
    'premium',
    '{
        "agendamentos_mes": 1000,
        "servicos": 50,
        "usuarios": 10,
        "armazenamento_mb": 1000,
        "api_requests_dia": 10000
    }'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Criar schema para o tenant de teste
SELECT create_tenant_schema('tenant_teste');

-- Inserir usuário admin no tenant de teste
INSERT INTO tenant_users (id_tenant, nome, email, senha_hash, cargo, permissoes)
SELECT
    t.id_tenant,
    'Administrador',
    'admin@teste.com',
    '$2b$10$rOz7Y9G5VzQG8HnG5VzQG8HnG5VzQG8HnG5VzQG8HnG5VzQG8HnG5VzQ', -- senha: admin123
    'admin',
    '{
        "admin": true,
        "agendamentos": true,
        "clientes": true,
        "servicos": true,
        "relatorios": true,
        "configuracoes": true
    }'::jsonb
FROM tenants t
WHERE t.email = 'admin@teste.com'
ON CONFLICT (id_tenant, email) DO NOTHING;
