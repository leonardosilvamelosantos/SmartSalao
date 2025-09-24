# 🚀 Guia de Configuração - Sistema Agendamento

## ✅ Status Atual
- ✅ **Login funcionando** com PostgreSQL
- ✅ **Tabela usuarios criada** e funcionando
- ✅ **Usuário admin configurado**
- ✅ **Servidor rodando** na porta 3000

## 🔑 Credenciais de Acesso
- **Email:** `admin@teste.com`
- **Senha:** `123456`
- **URL:** `http://localhost:3000/frontend`

## 🐘 Configuração do Banco de Dados

### PostgreSQL (Produção)
- **Host:** localhost
- **Porta:** 5433
- **Database:** agendamento
- **Usuário:** agendamento_user
- **Senha:** agendamento_pass_2024

### Como Iniciar o Servidor

#### Windows (PowerShell)
```powershell
.\start-production.ps1
```

#### Linux/Mac (Bash)
```bash
chmod +x start-production.sh
./start-production.sh
```

#### Manual
```bash
# Configurar variáveis de ambiente
export NODE_ENV="production"
export DB_TYPE="postgresql"
export USE_POSTGRESQL="true"
export DB_HOST="localhost"
export DB_PORT="5433"
export DB_NAME="agendamento"
export DB_USER="agendamento_user"
export DB_PASSWORD="agendamento_pass_2024"
export DB_SSL="false"

# Iniciar servidor
npm start
```

## 🐳 Docker Compose

Para subir o PostgreSQL:
```bash
docker-compose up -d db
```

## 📋 Tabelas Criadas
- ✅ `usuarios` - Usuários do sistema
- ✅ `tenants` - Multi-tenancy
- ✅ `servicos` - Serviços oferecidos
- ✅ `clientes` - Clientes
- ✅ `agendamentos` - Agendamentos
- ✅ `slots` - Horários disponíveis
- ✅ `notificacoes` - Notificações
- ✅ `configuracoes` - Configurações
- ✅ `audit_logs` - Logs de auditoria

## 🔧 Solução de Problemas

### Erro: "relation usuarios does not exist"
- Execute: `docker-compose up -d db`
- Verifique se o PostgreSQL está rodando na porta 5433

### Erro de Login
- Verifique as credenciais: `admin@teste.com` / `123456`
- Confirme que o servidor está usando PostgreSQL

### Servidor não inicia
- Verifique se a porta 3000 está livre
- Confirme que o PostgreSQL está rodando

## 📱 WhatsApp Bot
- **Status:** Configurado mas não conectado
- **Instância:** Tenant 6
- **QR Code:** Disponível na interface

## 🎯 Próximos Passos
1. Conectar WhatsApp Bot
2. Configurar serviços
3. Adicionar clientes
4. Criar agendamentos

---
**Última atualização:** 24/09/2025
**Status:** ✅ Funcionando
