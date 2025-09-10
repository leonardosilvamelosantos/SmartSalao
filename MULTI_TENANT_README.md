# 🏢 Sistema Multi-Tenant - Plataforma Self-Delivered

## 📋 **VISÃO GERAL**

Sistema completo de multi-tenancy para plataforma de agendamentos self-delivered. Cada barbearia/salão possui isolamento total de dados, controle de planos e limites customizáveis.

---

## 🎯 **ARQUITETURA MULTI-TENANT**

### **🏗️ Modelo de Isolamento:**
- **Schema Separation**: Cada tenant tem seu próprio schema PostgreSQL
- **Database Level**: Isolamento físico de dados
- **Row Level Security**: Controle granular de acesso
- **Connection Pooling**: Otimizado por tenant

### **🔐 Controle de Acesso:**
- **JWT Authentication**: Tokens específicos por tenant
- **Role-Based Access**: Admin, Funcionário, Cliente
- **Plan Enforcement**: Limites baseados no plano contratado
- **Audit Trail**: Log completo de todas as ações

---

## 📊 **PLANOS E LIMITES**

### **💰 Planos Disponíveis:**

| Plano | Agendamentos/Mês | Serviços | Usuários | API Requests/Dia | Armazenamento |
|-------|------------------|----------|----------|------------------|---------------|
| **Básico** | 100 | 5 | 2 | 1.000 | 100MB |
| **Profissional** | 500 | 20 | 5 | 5.000 | 500MB |
| **Premium** | 2.000 | 100 | 20 | 20.000 | 2GB |

### **⚡ Recursos por Plano:**

#### **Básico** 🟢
- ✅ Até 100 agendamentos/mês
- ✅ 5 serviços cadastrados
- ✅ 2 usuários (1 admin + 1 funcionário)
- ✅ WhatsApp integrado
- ✅ Dashboard básico
- ✅ Suporte por email

#### **Profissional** 🟡
- ✅ Até 500 agendamentos/mês
- ✅ 20 serviços cadastrados
- ✅ 5 usuários
- ✅ WhatsApp + SMS
- ✅ Dashboard avançado
- ✅ Relatórios detalhados
- ✅ API completa
- ✅ Suporte prioritário

#### **Premium** 🟣
- ✅ Até 2000 agendamentos/mês
- ✅ 100 serviços cadastrados
- ✅ 20 usuários
- ✅ Integrações ilimitadas
- ✅ Analytics avançado
- ✅ Backup automático
- ✅ White-label
- ✅ Suporte 24/7

---

## 🚀 **COMO USAR**

### **1. 📦 Inicialização do Sistema**

```bash
# Instalar dependências
npm install

# Inicializar banco multi-tenant
npm run tenant:init

# Iniciar servidor
npm start
```

### **2. 🧪 Criar Tenant de Teste**

```bash
# Criar tenant de teste básico
npm run tenant:create-test

# Criar tenant personalizado
npm run tenant:create-test -- --name "Minha Barbearia" --plan premium

# Criar múltiplos tenants
npm run tenant:multiple-test -- --count 10 --plan profissional
```

### **3. 👤 Login no Sistema**

```bash
# Credenciais de teste
Email: admin@teste.com
Senha: admin123
```

### **4. 🎮 Usar a API**

```javascript
// Login
const loginResponse = await fetch('/api/tenants/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@teste.com',
    password: 'admin123'
  })
});

const { token } = await loginResponse.json();

// Usar token nas requisições
const response = await fetch('/api/admin/1/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 🔧 **FERRAMENTAS DE GERENCIAMENTO**

### **📊 Listar Tenants**

```bash
# Listar todos os tenants
npm run tenant:list

# Filtrar por status
npm run tenant:list -- --status ativo

# Filtrar por plano
npm run tenant:list -- --plan premium

# Buscar por nome
npm run tenant:list -- --search "Barbearia"
```

### **🧪 Sistema de Testes**

```bash
# Criar tenant de teste
npm run tenant:create-test

# Criar 5 tenants de teste
npm run tenant:multiple-test -- --count 5

# Relatório de tenants de teste
npm run tenant:report

# Limpar tenants de teste
npm run tenant:cleanup
```

### **📤 Backup e Restore**

```bash
# Exportar dados de um tenant
npm run tenant:export -- --id 123

# Importar dados de backup
npm run tenant:import -- --file ./backup/tenant_123_backup.json
```

### **🚀 Teste de Carga**

```bash
# Teste básico
npm run tenant:load-test

# Teste personalizado
npm run tenant:load-test -- --tenants 20 --operations 100 --duration 10
```

---

## 📋 **API ENDPOINTS**

### **🔐 Autenticação**

```http
POST /api/tenants/auth/login
POST /api/tenants/auth/verify
POST /api/tenants/auth/logout
```

### **🏗️ Provisionamento**

```http
POST /api/tenants                    # Criar tenant
GET  /api/tenants                    # Listar tenants
GET  /api/tenants/:id               # Detalhes do tenant
PUT  /api/tenants/:id               # Atualizar tenant
DELETE /api/tenants/:id             # Remover tenant
```

### **🧪 Testes**

```http
POST /api/tenants/test              # Criar tenant de teste
POST /api/tenants/bulk-test         # Criar múltiplos tenants
POST /api/tenants/test/cleanup      # Limpar tenants de teste
GET  /api/tenants/test/report       # Relatório de testes
POST /api/tenants/test/load         # Teste de carga
```

### **📊 Monitoramento**

```http
GET /api/tenants/stats              # Estatísticas da plataforma
GET /api/tenants/:id/usage          # Uso do tenant
```

---

## 🗃️ **ESTRUTURA DO BANCO**

### **📊 Tabelas Principais**

```sql
-- Controle de tenants
tenants                     # Dados dos tenants
tenant_users               # Usuários por tenant
tenant_usage               # Controle de uso
tenant_billing             # Histórico de cobrança
audit_logs                 # Logs de auditoria

-- Schema isolado por tenant
tenant_{id}.usuarios       # Usuários da barbearia
tenant_{id}.servicos       # Serviços oferecidos
tenant_{id}.clientes       # Clientes
tenant_{id}.agendamentos   # Agendamentos
tenant_{id}.slots          # Horários disponíveis
```

### **🔑 Functions Úteis**

```sql
-- Criar schema automaticamente
SELECT create_tenant_schema('tenant_nome');

-- Verificar limites
SELECT check_tenant_limits(tenant_id, 'agendamentos_mes', 5);

-- Atualizar uso
SELECT update_tenant_usage(tenant_id, 'api_requests_dia', 10);
```

---

## ⚙️ **CONFIGURAÇÃO**

### **🔧 Variáveis de Ambiente**

```bash
# Autenticação
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agendamento_multi_tenant
DB_USER=postgres
DB_PASSWORD=your_password

# Sistema
NODE_ENV=development
PORT=3000
```

### **🎛️ Configuração do PostgreSQL**

```sql
-- Configurações recomendadas
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 4096;
```

---

## 📈 **MONITORAMENTO E ANALYTICS**

### **📊 Métricas Principais**

- **Uso por Tenant**: Agendamentos, API calls, armazenamento
- **Performance**: Tempo de resposta, taxa de erro
- **Planos**: Distribuição de usuários por plano
- **Crescimento**: Novos tenants por período

### **📋 Dashboards Disponíveis**

1. **Painel do Admin**: Visão geral da plataforma
2. **Painel do Tenant**: Gestão da própria barbearia
3. **Dashboard Público**: Agendamento online

### **🔍 Logs e Auditoria**

```sql
-- Ver logs de auditoria
SELECT * FROM audit_logs
WHERE id_tenant = 123
ORDER BY data_evento DESC;

-- Ver uso por período
SELECT * FROM tenant_usage
WHERE id_tenant = 123
  AND periodo >= CURRENT_DATE - INTERVAL '30 days';
```

---

## 🚨 **SEGURANÇA IMPLEMENTADA**

### **🔐 Autenticação e Autorização**

- **JWT Tokens**: Com expiração e refresh
- **Password Hashing**: bcrypt com salt rounds
- **Rate Limiting**: Por tenant e endpoint
- **Session Management**: Controle de sessões ativas

### **🛡️ Isolamento de Dados**

- **Schema Separation**: Dados completamente isolados
- **Row Level Security**: Controle granular de acesso
- **Audit Trail**: Log completo de todas as operações
- **Encryption**: Dados sensíveis criptografados

### **⚡ Proteções Adicionais**

- **Input Validation**: Sanitização completa
- **SQL Injection Prevention**: Prepared statements
- **XSS Protection**: Headers de segurança
- **CORS**: Controle de origens permitidas

---

## 🧪 **TESTES AUTOMATIZADOS**

### **🎯 Tipos de Teste**

```bash
# Testes unitários
npm test -- --grep "tenant"

# Testes de integração
npm run test:integration

# Testes de carga
npm run tenant:load-test

# Testes end-to-end
npm run test:e2e
```

### **📝 Cenários de Teste**

- ✅ **Provisionamento**: Criar tenant automaticamente
- ✅ **Isolamento**: Verificar que dados não se misturam
- ✅ **Limites**: Testar enforcement de planos
- ✅ **Performance**: Testes de carga e stress
- ✅ **Backup/Restore**: Verificar integridade dos dados

---

## 🎯 **EXEMPLOS PRÁTICOS**

### **1. 🚀 Criar Nova Barbearia**

```javascript
const tenantData = {
  name: "Barbearia do João",
  email: "joao@barbearia.com",
  phone: "+5511987654321",
  plan: "profissional"
};

const response = await fetch('/api/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tenantData)
});

const result = await response.json();
console.log('Tenant criado:', result.data);
```

### **2. 📊 Verificar Uso do Plano**

```javascript
// Verificar limites atuais
const limits = await fetch(`/api/tenants/${tenantId}/usage`);
const usage = await limits.json();

// Verificar se pode fazer mais agendamentos
const canCreateAppointment = await checkLimit(tenantId, 'agendamentos_mes', 1);
```

### **3. 🔄 Fazer Upgrade de Plano**

```javascript
const upgradeData = {
  plan: "premium"
};

await fetch(`/api/tenants/${tenantId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(upgradeData)
});
```

---

## 🔧 **MANUTENÇÃO E MONITORAMENTO**

### **📋 Tarefas de Manutenção**

```bash
# Backup diário
npm run backup:create

# Limpeza de logs antigos
npm run logs:cleanup

# Otimização de índices
npm run db:optimize

# Verificação de integridade
npm run db:check
```

### **📊 Monitoramento**

- **Health Checks**: Verificação automática de saúde
- **Metrics**: Coleta de métricas de uso
- **Alerts**: Notificações de problemas
- **Reports**: Relatórios automáticos

---

## 🎉 **CONCLUSÃO**

**✅ Sistema Multi-Tenant Completo Implementado!**

### **🎯 Principais Benefícios:**

- **🏢 Isolamento Total**: Cada tenant com dados 100% isolados
- **📊 Controle de Planos**: Limites flexíveis por tipo de conta
- **⚡ Performance**: Otimizado para múltiplos tenants simultâneos
- **🔐 Segurança**: Autenticação e autorização robustas
- **🧪 Testes**: Sistema completo de testes automatizados
- **📈 Escalabilidade**: Suporte a milhares de tenants

### **🚀 Próximos Passos:**

1. **Deploy**: Configurar ambiente de produção
2. **Monitoring**: Implementar dashboards de monitoramento
3. **Billing**: Sistema de cobrança automática
4. **API Docs**: Documentação interativa da API
5. **Mobile App**: Aplicativos para tenants

---

**🏆 Plataforma Enterprise-Ready para múltiplas barbearias com isolamento completo e controle granular de recursos!**

**💎 Arquitetura robusta, segura e escalável para crescimento ilimitado.**
