#!/bin/bash

# Script de backup para banco e arquivos
# Uso: ./backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
PROJECT_NAME="agendamento-barbearias"

echo "💾 Iniciando backup - $TIMESTAMP"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Backup do banco de dados
echo "📊 Fazendo backup do banco..."
if docker-compose ps db | grep -q "Up"; then
    docker-compose exec -T db pg_dump -U agendamento_user -d agendamento > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    echo "✅ Backup do banco criado: db_backup_$TIMESTAMP.sql"
else
    echo "⚠️ Container do banco não está rodando. Pulando backup do banco."
fi

# Backup de uploads (se existir)
if [ -d "uploads" ]; then
    echo "📁 Fazendo backup de uploads..."
    tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" uploads/
    echo "✅ Backup de uploads criado: uploads_backup_$TIMESTAMP.tar.gz"
fi

# Backup das configurações
echo "⚙️ Fazendo backup das configurações..."
tar -czf "$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz" \
    docker-compose.yml \
    Dockerfile \
    nginx.conf \
    scripts/ \
    --exclude="*.log" \
    2>/dev/null || true

echo "✅ Backup de configurações criado: config_backup_$TIMESTAMP.tar.gz"

# Calcular tamanho total
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "📏 Tamanho total dos backups: $TOTAL_SIZE"

# Listar backups recentes
echo ""
echo "📋 Backups recentes:"
ls -la "$BACKUP_DIR" | tail -10

# Limpar backups antigos (manter apenas últimos 10)
echo ""
echo "🧹 Limpando backups antigos..."
cd "$BACKUP_DIR"
ls -t *.tar.gz *.sql 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -t *.tar.gz *.sql 2>/dev/null | tail -n +11 | xargs -r rm -f

echo ""
echo "✅ Backup concluído com sucesso!"
echo "📂 Local dos backups: $BACKUP_DIR"
echo ""
echo "🔄 Para restaurar:"
echo "   Banco: docker-compose exec -T db psql -U agendamento_user -d agendamento < backup.sql"
echo "   Arquivos: tar -xzf backup.tar.gz"
