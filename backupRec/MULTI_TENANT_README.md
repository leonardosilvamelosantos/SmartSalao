# Sistema Multi-Tenant - Agendamento WhatsApp

Este projeto implementa uma arquitetura multi-tenant completa para o sistema de agendamento via WhatsApp, permitindo que múltiplas organizações (tenants) utilizem a mesma instância da aplicação com isolamento completo de dados.

## 🏗️ Arquitetura Multi-Tenant

### Conceitos Principais

- **Tenant**: Cliente/organização que utiliza o sistema
- **Isolamento de Dados**: Cada tenant possui seus próprios dados isolados
- **Middleware de Tenant**: Identifica automaticamente o tenant da requisição
- **Domínios Personalizados**: Cada tenant pode ter seu próprio subdomínio

### Identificação de Tenant

O sistema suporta múltiplas formas de identificar o tenant atual:

1. **Header HTTP**: `X-Tenant-ID: 123`
2. **Subdomínio**: `tenant1.dominio.com`
3. **Parâmetro de Query**: `?tenant=tenant1`
4. **JWT Token**: Campo `id_tenant` no token

## 🗄️ Estrutura do Banco de Dados

### Tabelas Multi-Tenant

```sql
-- Tabela principal de tenants
CREATE TABLE tenants (
  id_tenant SERIAL PRIMARY KEY,
  nome_tenant TEXT NOT NULL,
  dominio TEXT UNIQUE, -- subdomínio personalizado
  status TEXT DEFAULT 'ativo',
  config_tenant JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usuários isolados por tenant
CREATE TABLE usuarios (
  id_usuario SERIAL PRIMARY KEY,
  id_tenant INT NOT NULL REFERENCES tenants(id_tenant) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  -- ... outros campos
  UNIQUE(id_tenant, whatsapp) -- WhatsApp único por tenant
);

-- Serviços isolados por tenant
CREATE TABLE servicos (
  id_servico SERIAL PRIMARY KEY,
  id_tenant INT NOT NULL REFERENCES tenants(id_tenant) ON DELETE CASCADE,
  id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  -- ... outros campos
);

-- Índices otimizados para isolamento
CREATE INDEX idx_usuarios_tenant ON usuarios(id_tenant);
CREATE INDEX idx_servicos_tenant ON servicos(id_tenant);
```

## 🚀 Como Usar

### 1. Criar um Tenant

```bash
# Via API
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "nome_tenant": "Salão Beleza Plus",
    "dominio": "beleza-plus"
  }'
```

### 2. Configurar Headers para Requisições

```bash
# Usar tenant específico
curl -H "X-Tenant-ID: 1" http://localhost:3000/api/usuarios

# Ou usar subdomínio
curl http://beleza-plus.dominio.com/api/usuarios

# Ou usar parâmetro de query
curl "http://localhost:3000/api/usuarios?tenant=beleza-plus"
```

### 3. Criar Usuários no Tenant

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "whatsapp": "5511999999999",
    "config_horarios": [
      {"dia": 1, "inicio": "09:00", "fim": "18:00"}
    ]
  }'
```

## 🔧 Middleware de Tenant

### Funcionamento

```javascript
// src/middleware/tenant.js
const tenantMiddleware = async (req, res, next) => {
  // 1. Tenta identificar tenant por header
  // 2. Tenta identificar por subdomínio
  // 3. Tenta identificar por query parameter
  // 4. Tenta identificar por JWT token

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant não identificado'
    });
  }

  req.tenant = tenant;
  req.tenantId = tenantId;
  next();
};
```

### Aplicação nas Rotas

```javascript
// src/routes/usuarios.js
const { tenantMiddleware } = require('../middleware/tenant');

// Aplicar middleware a todas as rotas
router.use(tenantMiddleware);

router.get('/', UsuarioController.index);
router.post('/', UsuarioController.create);
// ... outras rotas
```

## 📊 Isolamento de Dados

### BaseModel Atualizado

```javascript
// Todos os métodos incluem tenantId automaticamente
class BaseModel {
  async findAll(options = {}) {
    const { tenantId } = options;

    if (tenantId && this.tableName !== 'tenants') {
      // Adiciona WHERE id_tenant = $X automaticamente
    }
  }

  async create(data, tenantId = null) {
    // Adiciona id_tenant automaticamente
  }
}
```

### Controllers Atualizados

```javascript
// src/controllers/UsuarioController.js
async create(req, res) {
  const tenantId = req.tenantId; // Identificado pelo middleware

  const usuario = await Usuario.create(req.body, tenantId);
  // Dados criados apenas para o tenant atual
}
```

## 🎯 Endpoints da API

### Tenants
- `GET /api/tenants` - Listar tenants
- `POST /api/tenants` - Criar tenant
- `GET /api/tenants/:id` - Buscar tenant
- `PUT /api/tenants/:id` - Atualizar tenant
- `DELETE /api/tenants/:id` - Deletar tenant
- `GET /api/tenants/domain/:dominio` - Buscar por domínio

### Usuários (Multi-Tenant)
- `GET /api/usuarios` - Listar usuários do tenant atual
- `POST /api/usuarios` - Criar usuário no tenant atual
- `GET /api/usuarios/:id` - Buscar usuário (verificado no tenant)
- `PUT /api/usuarios/:id` - Atualizar usuário (verificado no tenant)
- `DELETE /api/usuarios/:id` - Deletar usuário (verificado no tenant)

## 🔒 Segurança

### Isolamento Completo
- ✅ Dados completamente isolados por tenant
- ✅ Índices otimizados para performance
- ✅ Validações de unicidade por tenant
- ✅ Middleware de autenticação de tenant

### Validações Implementadas
- ✅ Tenant obrigatório para operações
- ✅ Verificação de existência do tenant
- ✅ Unicidade de domínios
- ✅ Unicidade de WhatsApp por tenant

## 📈 Benefícios

1. **Escalabilidade**: Uma instância serve múltiplos clientes
2. **Isolamento**: Dados completamente separados
3. **Manutenibilidade**: Atualizações afetam todos os tenants
4. **Custo**: Infraestrutura compartilhada
5. **Personalização**: Configurações específicas por tenant

## 🛠️ Desenvolvimento

### Migrações
```bash
npm run migrate  # Executa migrações
npm run migrate:drop  # Remove tabelas (desenvolvimento)
```

### Servidor
```bash
npm start  # Produção
npm run dev  # Desenvolvimento com nodemon
```

### Estrutura de Arquivos
```
src/
├── models/
│   ├── Tenant.js          # Modelo de Tenant
│   ├── Usuario.js         # Modelo com isolamento
│   └── BaseModel.js       # Base com tenantId
├── controllers/
│   ├── TenantController.js    # CRUD de Tenants
│   └── UsuarioController.js   # CRUD com tenant
├── middleware/
│   ├── tenant.js         # Middleware de identificação
│   └── validation.js     # Validações incluindo tenant
└── routes/
    ├── tenants.js        # Rotas de tenants
    └── usuarios.js       # Rotas com middleware
```

## 🔍 Monitoramento

### Logs
O sistema registra automaticamente:
- Tenant identificado por requisição
- Operações por tenant
- Erros específicos por tenant

### Performance
- Índices otimizados por tenant
- Queries eficientes com isolamento
- Cache potencial por tenant

## 📝 Próximos Passos

1. **Autenticação JWT**: Incluir tenant no token
2. **Cache**: Implementar cache por tenant
3. **Logs**: Sistema de auditoria por tenant
4. **Backup**: Estratégias de backup por tenant
5. **Limites**: Controle de uso por tenant

---

## 📞 Suporte

Para dúvidas sobre o sistema multi-tenant, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.
