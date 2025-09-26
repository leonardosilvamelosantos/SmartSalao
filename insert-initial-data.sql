-- Inserir dados iniciais para teste

-- Inserir tenant
INSERT INTO tenants (nome_tenant, dominio, status) VALUES ('Tenant Teste', 'teste.local', 'ativo');

-- Inserir usuário (assumindo que o tenant foi criado com ID 1)
INSERT INTO usuarios (id_tenant, nome, email, senha_hash, tipo, ativo) VALUES (1, 'Usuário Teste', 'test@test.com', 'hash_senha', 'barbeiro', true);

