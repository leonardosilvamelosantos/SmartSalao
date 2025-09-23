#!/bin/bash

# Script de deploy para VPS
# Uso: ./deploy.sh [ambiente]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="agendamento-barbearias"

echo "🚀 Iniciando deploy para $ENVIRONMENT"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instale o Docker primeiro."
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Instale o Docker Compose primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Fazer backup do banco (se existir)
if [ -d "postgres_data" ]; then
    echo "💾 Fazendo backup do banco..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p backups
    tar -czf "backups/db_backup_$TIMESTAMP.tar.gz" postgres_data/
fi

# Build das imagens
echo "🔨 Construindo imagens..."
docker-compose build --no-cache

# Iniciar serviços
echo "🏃 Iniciando serviços..."
docker-compose up -d

# Aguardar banco ficar pronto
echo "⏳ Aguardando banco de dados..."
sleep 30

# Executar migrações
echo "📊 Executando migrações..."
docker-compose exec -T app npm run migrate

# Verificar status dos serviços
echo "📊 Verificando status dos serviços..."
docker-compose ps

# Mostrar logs
echo "📋 Logs dos últimos 50 linhas:"
docker-compose logs --tail=50

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 A aplicação estará disponível em:"
echo "   - API: http://$(curl -s ifconfig.me):3000"
echo "   - WhatsApp Multi-Tenant: http://$(curl -s ifconfig.me):3000/frontend/pages/whatsapp"
echo "   - Health Check: http://$(curl -s ifconfig.me):3000/health"
echo ""
echo "📝 Comandos úteis:"
echo "   - Ver logs: docker-compose logs -f"
echo "   - Parar: docker-compose down"
echo "   - Reiniciar: docker-compose restart"
echo "   - Backup: ./backup.sh"
