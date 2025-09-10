# 📋 Documentação Completa da API

Sistema de Agendamento via WhatsApp - APIs REST implementadas

## 🔐 Autenticação

Todas as APIs (exceto login/registro) requerem autenticação JWT via header:
```
Authorization: Bearer seu_token_jwt_aqui
```

### POST /api/auth/login
Login de usuário
```json
// Request
{
  "whatsapp": "5511999999999",
  "password": "sua_senha",
  "tenantId": 1
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nome": "João Silva",
      "whatsapp": "5511999999999",
      "tenant": {
        "id": 1,
        "nome": "Minha Barbearia"
      }
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": "24h"
  }
}
```

### POST /api/auth/register
Registro de novo usuário
```json
// Request
{
  "nome": "João Silva",
  "whatsapp": "5511999999999",
  "password": "sua_senha",
  "tenantId": 1
}
```

### POST /api/auth/refresh
Renovar token
```json
// Request
{
  "refreshToken": "seu_refresh_token"
}
```

### GET /api/auth/me
Dados do usuário logado
```json
// Response
{
  "success": true,
  "data": {
    "id": 1,
    "nome": "João Silva",
    "whatsapp": "5511999999999",
    "tenant": {
      "id": 1,
      "nome": "Minha Barbearia"
    }
  }
}
```

---

## 👤 Gestão de Usuários

### GET /api/usuarios
Listar usuários do tenant
```
Query params: page, limit, search
```

### GET /api/usuarios/:id
Buscar usuário específico

### POST /api/usuarios
Criar novo usuário
```json
{
  "nome": "João Silva",
  "whatsapp": "5511999999999",
  "password": "senha_segura",
  "timezone": "America/Sao_Paulo",
  "config_horarios": [
    {"dia": 1, "inicio": "09:00", "fim": "18:00"},
    {"dia": 2, "inicio": "09:00", "fim": "18:00"}
  ],
  "intervalo_min": 15,
  "max_advance_days": 60
}
```

### PUT /api/usuarios/:id
Atualizar usuário

### PUT /api/usuarios/:id/horarios
Atualizar configuração de horários
```json
{
  "config_horarios": [
    {"dia": 1, "inicio": "08:00", "fim": "19:00"}
  ]
}
```

### DELETE /api/usuarios/:id
Deletar usuário

---

## ✂️ Gestão de Serviços

### GET /api/servicos
Listar serviços
```
Query params: page, limit, id_usuario, search
```

### GET /api/servicos/:id
Buscar serviço específico

### POST /api/servicos
Criar novo serviço
```json
{
  "nome_servico": "Corte de Cabelo",
  "duracao_min": 30,
  "valor": 25.00
}
```

### PUT /api/servicos/:id
Atualizar serviço

### DELETE /api/servicos/:id
Deletar serviço

### GET /api/servicos/usuario/:id_usuario/disponiveis
Serviços disponíveis em período
```
Query params: start_date, end_date
```

### GET /api/servicos/usuario/:id_usuario/populares
Serviços mais populares
```
Query params: limit
```

### GET /api/servicos/usuario/:id_usuario/estatisticas
Serviços com estatísticas

---

## 👥 Gestão de Clientes

### GET /api/clientes
Listar clientes
```
Query params: page, limit, search
```

### GET /api/clientes/:id
Buscar cliente específico

### GET /api/clientes/:id/historico
Buscar cliente com histórico de agendamentos

### POST /api/clientes
Criar novo cliente
```json
{
  "nome": "Maria Silva",
  "whatsapp": "5511888888888"
}
```

### POST /api/clientes/find-or-create
Buscar ou criar cliente por WhatsApp
```json
{
  "whatsapp": "5511888888888",
  "nome": "Maria Silva"
}
```

### PUT /api/clientes/:id
Atualizar cliente

### DELETE /api/clientes/:id
Deletar cliente

### GET /api/clientes/estatisticas
Clientes com estatísticas
```
Query params: page, limit
```

---

## 📅 Gestão de Agendamentos

### GET /api/agendamentos
Listar agendamentos
```
Query params: page, limit, status, start_date, end_date
```

### GET /api/agendamentos/:id
Buscar agendamento específico

### POST /api/agendamentos
Criar novo agendamento
```json
{
  "id_cliente": 1,
  "id_servico": 1,
  "start_at": "2024-01-15T10:00:00Z",
  "status": "confirmed"
}
```

### PUT /api/agendamentos/:id
Atualizar agendamento

### DELETE /api/agendamentos/:id
Deletar agendamento

### POST /api/agendamentos/:id/cancelar
Cancelar agendamento

### POST /api/agendamentos/:id/concluir
Marcar como concluído

### GET /api/agendamentos/periodo
Agendamentos por período
```
Query params: start_date, end_date, status
```

### GET /api/agendamentos/hoje
Agendamentos de hoje

### GET /api/agendamentos/estatisticas
Estatísticas de agendamentos

---

## 🏢 Gestão de Tenants

### GET /api/tenants
Listar tenants
```
Query params: page, limit, search
```

### GET /api/tenants/:id
Buscar tenant específico

### POST /api/tenants
Criar novo tenant
```json
{
  "nome_tenant": "Barbearia Central",
  "dominio": "barbearia-central",
  "status": "ativo"
}
```

### PUT /api/tenants/:id
Atualizar tenant

### DELETE /api/tenants/:id
Deletar tenant

---

## 🤖 WhatsApp (Evolution API)

### POST /api/whatsapp/webhook
Webhook para receber mensagens do WhatsApp

### POST /api/whatsapp/send
Enviar mensagem manual
```json
{
  "to": "5511999999999",
  "message": "Olá! Agendamento confirmado! ✅"
}
```

### GET /api/whatsapp/status
Status da integração WhatsApp

---

## 📊 Monitoramento e Administração

### GET /health
Health check da aplicação

### GET /api/admin/cron-status
Status dos jobs cron

### POST /api/admin/run-slot-generation
Executar geração manual de slots

---

## 📋 Códigos de Status HTTP

### Sucesso (2xx)
- `200` - OK (operações GET)
- `201` - Created (operações POST)
- `204` - No Content (operações DELETE)

### Erro do Cliente (4xx)
- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (não autenticado)
- `403` - Forbidden (sem permissão)
- `404` - Not Found (recurso não encontrado)
- `409` - Conflict (conflito de horários)
- `422` - Unprocessable Entity (validação falhou)

### Erro do Servidor (5xx)
- `500` - Internal Server Error

---

## 🔒 Segurança Implementada

### Autenticação JWT
- ✅ Tokens de acesso (24h)
- ✅ Tokens de refresh (7 dias)
- ✅ Hash de senhas (bcrypt)
- ✅ Isolamento por tenant

### Validações
- ✅ Schema validation (Joi)
- ✅ Sanitização de dados
- ✅ Rate limiting
- ✅ Controle de permissões

### Autorização
- ✅ Middleware de autenticação obrigatória
- ✅ Verificação de propriedade de recursos
- ✅ Isolamento por tenant

---

## 📱 Exemplos de Uso Completo

### 1. Fluxo de Agendamento
```javascript
// 1. Login
const login = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    whatsapp: '5511999999999',
    password: 'minha_senha'
  })
});

// 2. Buscar serviços disponíveis
const services = await fetch('/api/servicos', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Criar cliente (se não existir)
const client = await fetch('/api/clientes/find-or-create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    whatsapp: '5511888888888',
    nome: 'Maria Silva'
  })
});

// 4. Criar agendamento
const booking = await fetch('/api/agendamentos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    id_cliente: client.id,
    id_servico: service.id,
    start_at: '2024-01-15T10:00:00Z'
  })
});
```

### 2. Dashboard Básico
```javascript
// Estatísticas gerais
const stats = await fetch('/api/agendamentos/estatisticas', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Agendamentos de hoje
const today = await fetch('/api/agendamentos/hoje', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Serviços populares
const popular = await fetch('/api/servicos/usuario/1/populares', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🎯 Próximos Passos

Com esta API completa, você pode:

1. ✅ **Criar interface web** para o barbeiro
2. ✅ **Integrar WhatsApp** via Evolution API
3. ✅ **Implementar notificações** automáticas
4. ✅ **Criar dashboard** com métricas
5. ✅ **Adicionar pagamentos** e financeiro
6. ✅ **Escalar** para múltiplas barbearias

**🎉 API 100% funcional e segura!**

---

**Implementado em:** Outubro 2024
**Status:** ✅ Completo e Produção-Ready
**Cobertura:** Autenticação, CRUD completo, validações, segurança
