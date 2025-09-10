#!/bin/bash

# Script de monitoramento da aplicação
# Uso: ./monitor.sh

echo "📊 MONITORAMENTO - $(date)"
echo "=================================="

# Status dos containers
echo "🐳 Status dos Containers:"
docker-compose ps
echo ""

# Uso de recursos
echo "💾 Uso de Disco:"
df -h | grep -E "(Filesystem|/$)"
echo ""

echo "🧠 Uso de Memória:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# Health checks
echo "🏥 Health Checks:"

# API principal
if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API: OK"
else
    echo "❌ API: FALHA"
fi

# Evolution API
if curl -s -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Evolution API: OK"
else
    echo "❌ Evolution API: FALHA"
fi

# Banco de dados
if docker-compose exec -T db pg_isready -U agendamento_user -d agendamento > /dev/null 2>&1; then
    echo "✅ Banco PostgreSQL: OK"
else
    echo "❌ Banco PostgreSQL: FALHA"
fi

echo ""

# Logs recentes de erro
echo "📋 Últimos erros da aplicação:"
docker-compose logs --tail=20 app 2>&1 | grep -i error || echo "Nenhum erro recente"

echo ""

# Espaço em disco dos volumes
echo "📏 Espaço dos Volumes:"
docker system df -v
echo ""

# Conexões ativas (se tiver netstat)
if command -v netstat &> /dev/null; then
    echo "🌐 Conexões ativas na porta 3000:"
    netstat -tlnp 2>/dev/null | grep :3000 || echo "Nenhuma conexão ativa"
fi

echo ""
echo "✅ Monitoramento concluído - $(date)"
