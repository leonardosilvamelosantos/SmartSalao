# 🔐 Guia de Segurança - Sistema de Agendamentos

## Visão Geral

Este documento descreve as medidas de segurança implementadas no sistema e como configurá-las adequadamente.

## ✅ Melhorias de Segurança Implementadas

### 1. **Eliminação de Credenciais Hardcoded**

- ❌ **Antes**: Credenciais hardcoded nos arquivos de configuração
- ✅ **Agora**: Todas as credenciais vêm de variáveis de ambiente

**Arquivos modificados:**
- `config/postgres-config.js`
- `src/config/database.js`
- `src/config/postgresql.js`

### 2. **Validação de Variáveis de Ambiente**

- ✅ Validação obrigatória de variáveis críticas
- ✅ Verificação de formato e tamanho mínimo
- ✅ Falha rápida se variáveis essenciais estiverem ausentes

**Arquivo criado:** `src/config/env-validation.js`

### 3. **Configuração Segura do Banco de Dados**

- ✅ Sem fallbacks de credenciais sensíveis
- ✅ Validação de conexão obrigatória
- ✅ Configuração via variáveis de ambiente

## 🔧 Configuração Segura

### Variáveis Obrigatórias

```bash
# Servidor
PORT=3000
NODE_ENV=production

# Banco de Dados (OBRIGATÓRIO)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=agendamento
DB_USER=agendamento_user
DB_PASSWORD=sua_senha_forte_aqui

# Segurança (OBRIGATÓRIO)
JWT_SECRET=chave-secreta-com-pelo-menos-32-caracteres
JWT_EXPIRES_IN=24h
```

### Variáveis Opcionais

```bash
# Configuração Avançada do Banco
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Rede
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.100:3000

# WhatsApp
WHATSAPP_SESSION_PATH=./data/whatsapp-auth
WHATSAPP_WEBHOOK_URL=http://seu-ip:3000/api/whatsapp/webhook
```

## 🚨 Validações de Segurança

### 1. **JWT Secret**
- Mínimo de 32 caracteres em produção
- Deve ser único e imprevisível
- Não deve ser compartilhado

### 2. **Credenciais do Banco**
- Não podem ter fallbacks hardcoded
- Devem ser únicas por ambiente
- Devem ser rotacionadas regularmente

### 3. **Portas e Hosts**
- Validação de range de portas (1-65535)
- Verificação de formato de host
- Validação de ambiente (development/production/test)

## 📋 Checklist de Segurança

### ✅ Configuração Inicial
- [ ] Arquivo `.env` criado com todas as variáveis obrigatórias
- [ ] JWT_SECRET com pelo menos 32 caracteres
- [ ] Credenciais do banco únicas e fortes
- [ ] NODE_ENV definido corretamente

### ✅ Produção
- [ ] JWT_SECRET gerado aleatoriamente
- [ ] Senhas do banco complexas
- [ ] SSL habilitado se necessário
- [ ] Logs de segurança monitorados

### ✅ Desenvolvimento
- [ ] Arquivo `.env` não commitado no Git
- [ ] Credenciais diferentes da produção
- [ ] Validações funcionando

## 🔄 Migração de Configuração

### Antes (Inseguro)
```javascript
// ❌ Credenciais hardcoded
const config = {
  host: 'localhost',
  user: 'agendamento_user',
  password: 'agendamento_pass_2024'
};
```

### Depois (Seguro)
```javascript
// ✅ Validação obrigatória
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis obrigatórias não encontradas');
  process.exit(1);
}

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
```

## 🛡️ Benefícios das Melhorias

1. **Redução de Riscos**: Eliminação de credenciais expostas no código
2. **Validação Robusta**: Falha rápida se configuração estiver incorreta
3. **Flexibilidade**: Fácil mudança de configuração por ambiente
4. **Auditoria**: Todas as configurações vêm de variáveis de ambiente
5. **Compliance**: Atende boas práticas de segurança

## 📞 Suporte

Se encontrar problemas com a configuração:

1. Verifique se todas as variáveis obrigatórias estão definidas
2. Confirme que o JWT_SECRET tem pelo menos 32 caracteres
3. Teste a conexão com o banco de dados
4. Verifique os logs de erro para detalhes específicos

---

**Última atualização**: 25/09/2025  
**Versão**: 1.0.0

