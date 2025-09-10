-- Script de inicialização do banco de dados
-- Executado automaticamente quando o container do PostgreSQL inicia

-- Criar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar schema se necessário
CREATE SCHEMA IF NOT EXISTS public;

-- Configurações básicas
SET timezone = 'America/Sao_Paulo';

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE 'Banco de dados inicializado com sucesso em %', now();
END
$$;
