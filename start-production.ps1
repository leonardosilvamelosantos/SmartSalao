# Script para iniciar o servidor em produção com PostgreSQL
# Execute este script para garantir que o servidor use PostgreSQL

Write-Host "🚀 Iniciando servidor em produção com PostgreSQL..." -ForegroundColor Green

# Configurar variáveis de ambiente para PostgreSQL
$env:NODE_ENV = "production"
$env:DB_TYPE = "postgresql"
$env:USE_POSTGRESQL = "true"
$env:DB_HOST = "localhost"
$env:DB_PORT = "5433"
$env:DB_NAME = "agendamento"
$env:DB_USER = "agendamento_user"
$env:DB_PASSWORD = "agendamento_pass_2024"
$env:DB_SSL = "false"

# Configurações adicionais
$env:JWT_SECRET = "agendamento-platform-secret-key-2025"
$env:SESSION_SECRET = "agendamento-session-secret-2025"
$env:WHATSAPP_SESSION_PATH = "./data/whatsapp-auth"
$env:PRINT_QR_IN_TERMINAL = "false"

Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
Write-Host "🐘 Usando PostgreSQL na porta 5433" -ForegroundColor Cyan
Write-Host "🔐 JWT configurado" -ForegroundColor Cyan
Write-Host "📱 WhatsApp configurado" -ForegroundColor Cyan

# Iniciar o servidor
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Yellow
npm start
