#!/bin/bash
# Script de Inicialização para Produção

echo "🚀 Iniciando aplicação em modo produção..."

# Verificar se .env.production existe
if [ ! -f .env.production ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    echo "Execute: node scripts/setup-production.js"
    exit 1
fi

# Carregar variáveis de ambiente
export $(cat .env.production | xargs)

# Verificar conexão com banco
echo "🔍 Verificando conexão com banco de dados..."
node scripts/check-database.js

# Executar migrações
echo "📊 Executando migrações..."
node scripts/migrate.js

# Verificar segurança
echo "🔒 Verificando configurações de segurança..."
node scripts/security-check.js

# Iniciar aplicação
echo "✅ Iniciando aplicação..."
NODE_ENV=production node src/index.js
