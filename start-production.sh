#!/bin/bash

# Script para iniciar o servidor em produção com PostgreSQL
# Execute este script para garantir que o servidor use PostgreSQL

echo "🚀 Iniciando servidor em produção com PostgreSQL..."

# Configurar variáveis de ambiente para PostgreSQL
export NODE_ENV="production"
export DB_TYPE="postgresql"
export USE_POSTGRESQL="true"
export DB_HOST="localhost"
export DB_PORT="5433"
export DB_NAME="agendamento"
export DB_USER="agendamento_user"
export DB_PASSWORD="agendamento_pass_2024"
export DB_SSL="false"

# Configurações adicionais
export JWT_SECRET="agendamento-platform-secret-key-2025"
export SESSION_SECRET="agendamento-session-secret-2025"
export WHATSAPP_SESSION_PATH="./data/whatsapp-auth"
export PRINT_QR_IN_TERMINAL="false"

echo "✅ Variáveis de ambiente configuradas"
echo "🐘 Usando PostgreSQL na porta 5433"
echo "🔐 JWT configurado"
echo "📱 WhatsApp configurado"

# Iniciar o servidor
echo "🚀 Iniciando servidor..."
npm start
