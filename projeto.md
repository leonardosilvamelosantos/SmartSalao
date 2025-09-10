# 🚀 Sistema de Agendamento para Barbearias - Documentação Completa

## 📋 Visão Geral

Sistema web completo para gerenciamento de barbearias com foco em agendamentos personalizados, multi-tenant e segurança robusta. Cada barbeiro possui seu próprio ambiente isolado com configurações únicas.

## 🏗️ Arquitetura do Sistema

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Banco de Dados**: SQLite com SQLite3
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Middleware customizado
- **Estrutura**: MVC (Model-View-Controller)

### Frontend (Vanilla JavaScript)
- **Tecnologia**: JavaScript puro (ES6+)
- **UI Framework**: Bootstrap 5
- **Roteamento**: Router customizado
- **Modularização**: Módulos por página
- **Responsividade**: Mobile-first design

## 🔐 Segurança e Multi-Tenant

### Autenticação JWT
```javascript
// Estrutura do token
{
  "id_usuario": 1,
  "userId": 1,
  "email": "admin@teste.com",
  "role": "barbeiro",
  "type": "access",
  "tenant_id": 1,
  "iat": 1757536664,
  "exp": 1757623064
}
```

### Isolamento de Dados
- **Middleware `tenantMW.isolateTenant`**: Garante que cada usuário só acessa seus próprios dados
- **Validação de propriedade**: Todas as operações verificam se o recurso pertence ao usuário
- **Rate Limiting**: Controle de requisições por usuário

### Middleware de Segurança
```javascript
// Ordem dos middlewares
app.use('/api/agendamentos', 
  authenticateToken,           // 1. Verificar token JWT
  tenantMW.isolateTenant,     // 2. Isolar dados por tenant
  rateLite,                   // 3. Controlar taxa de requisições
  require('./routes/agendamentos')
);
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### `usuarios`
```sql
CREATE TABLE usuarios (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT DEFAULT 'barbeiro',
  created_at TEXT,
  updated_at TEXT
);
```

#### `configuracoes`
```sql
CREATE TABLE configuracoes (
  id_configuracao INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL,
  nome_estabelecimento TEXT,
  endereco TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email_contato TEXT,
  horario_abertura TEXT,        -- "08:00"
  horario_fechamento TEXT,      -- "18:00"
  dias_funcionamento TEXT,      -- JSON: ["segunda", "terca", "quarta", "quinta", "sexta"]
  intervalo_agendamento INTEGER, -- 30 (minutos)
  notificar_agendamentos INTEGER,
  lembrete_cliente INTEGER,
  horas_lembrete INTEGER,
  metodo_pagamento_padrao TEXT,
  aceitar_pix INTEGER,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
```

#### `agendamentos`
```sql
CREATE TABLE agendamentos (
  id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL,
  id_cliente INTEGER NOT NULL,
  id_servico INTEGER NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  observacoes TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  FOREIGN KEY (id_servico) REFERENCES servicos(id_servico)
);
```

## 🧠 Lógica de Negócio

### Sistema de Agendamentos Personalizado

#### 1. Validação de Horários
```javascript
// Validação baseada nas configurações do usuário
const validacao = await this.validationService.validateAgendamento(userId, {
  start_at,
  duracao_min: servico.duracao_min
});
```

#### 2. Geração de Slots Disponíveis
```javascript
// Algoritmo de geração de slots
for (let hora = inicio; hora < fim; hora += intervalo) {
  const slotTime = this.formatTime(hora);
  const slotDateTime = new Date(`${data}T${slotTime}:00`);
  
  // Verificar disponibilidade
  const disponivel = await this.verificarSlotDisponivel(userId, slotDateTime);
  if (disponivel) {
    slots.push({
      horario: slotTime,
      datetime: slotDateTime.toISOString(),
      disponivel: true
    });
  }
}
```

#### 3. Validação de Conflitos
```javascript
// Verificar sobreposição de horários
const conflitos = await this.agendamentoModel.query(`
  SELECT COUNT(*) as count FROM agendamentos 
  WHERE id_usuario = ? 
  AND status IN ('confirmed', 'pending')
  AND (
    (start_at < ? AND end_at > ?) OR
    (start_at < ? AND end_at > ?) OR
    (start_at >= ? AND end_at <= ?)
  )
`, [userId, start_at, start_at, end_at, end_at, start_at, end_at]);
```

## 🔄 Fluxo de Funcionamento

### 1. Autenticação
1. Usuário faz login
2. Sistema gera JWT com `tenant_id`
3. Token é armazenado no localStorage
4. Todas as requisições incluem o token

### 2. Configurações
1. Usuário acessa página de configurações
2. Sistema busca configurações existentes ou cria padrão
3. Usuário define horários, dias, intervalos
4. Configurações são salvas no banco

### 3. Agendamento
1. Cliente seleciona data
2. Sistema busca configurações do barbeiro
3. Gera slots baseados nas configurações
4. Valida disponibilidade em tempo real
5. Cria agendamento com validação completa

## 📱 Interface do Usuário

### Páginas Principais

#### 1. **Dashboard**
- Visão geral dos agendamentos
- Estatísticas rápidas
- Ações principais

#### 2. **Clientes**
- CRUD completo de clientes
- Busca e filtros
- Histórico de agendamentos

#### 3. **Serviços**
- Gerenciamento de serviços
- Preços e durações
- Categorização

#### 4. **Agenda**
- Calendário de agendamentos
- Criação/edição de agendamentos
- Slots disponíveis dinâmicos
- Status de agendamentos

#### 5. **Usuários** (Admin)
- Gerenciamento de usuários
- Controle de acesso
- Configurações de perfil

#### 6. **Configurações**
- Dados do estabelecimento
- Horários de funcionamento
- Configurações de notificação
- Segurança da conta

### Roteamento Frontend
```javascript
class Router {
  constructor() {
    this.pages = new Map();
  }

  registerPage(name, pageInstance) {
    this.pages.set(name, pageInstance);
  }

  async navigate(pageName) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(page => {
      page.style.display = 'none';
    });

    // Mostrar página selecionada
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
      targetPage.style.display = 'block';
    }

    // Carregar dados da página
    const pageInstance = this.pages.get(pageName);
    if (pageInstance && pageInstance.load) {
      await pageInstance.load();
    }
  }
}
```

## 🛡️ Medidas de Segurança

### 1. **Autenticação JWT**
- Tokens com expiração
- Renovação automática
- Validação em todas as rotas protegidas

### 2. **Isolamento Multi-Tenant**
- Middleware `tenantMW.isolateTenant`
- Verificação de propriedade em todas as operações
- Dados completamente isolados por usuário

### 3. **Rate Limiting**
- Controle de requisições por usuário
- Prevenção de spam e ataques
- Limites configuráveis

### 4. **Validação de Dados**
- Middleware de validação
- Sanitização de inputs
- Validação de tipos e formatos

### 5. **CORS e Headers**
- Configuração de CORS
- Headers de segurança
- Prevenção de ataques XSS

## 🔧 Tecnologias e Dependências

### Backend
```json
{
  "express": "^4.18.2",
  "sqlite3": "^5.1.6",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5"
}
```

### Frontend
- **Bootstrap 5**: UI framework
- **Vanilla JavaScript**: Lógica da aplicação
- **HTML5**: Estrutura
- **CSS3**: Estilos customizados

## 📈 Funcionalidades Avançadas

### 1. **Sistema de Notificações**
- Lembretes automáticos
- Configuração por usuário
- Integração com WhatsApp (planejado)

### 2. **Relatórios Personalizados**
- Estatísticas por período
- Análise de performance
- Exportação de dados

### 3. **Integração de Pagamentos**
- Múltiplos métodos
- Configuração por estabelecimento
- Histórico de transações

### 4. **Sistema de Backup**
- Backup automático do banco
- Restauração de dados
- Versionamento de configurações

## 🚀 Deploy e Produção

### Estrutura de Arquivos
```
projeto15/
├── src/
│   ├── controllers/     # Controladores
│   ├── middleware/      # Middlewares
│   ├── models/         # Modelos de dados
│   ├── routes/         # Rotas da API
│   ├── services/       # Lógica de negócio
│   └── index.js        # Ponto de entrada
├── frontend/
│   ├── css/           # Estilos
│   ├── js/            # JavaScript
│   │   ├── pages/     # Módulos de páginas
│   │   ├── router.js  # Roteador
│   │   └── main.js    # Aplicação principal
│   └── index.html     # Interface principal
├── database/          # Arquivos do banco
└── projeto.md         # Esta documentação
```

### Variáveis de Ambiente
```env
JWT_SECRET=agendamento-platform-secret-key-2025
NODE_ENV=production
PORT=3000
DB_PATH=./database/agendamentos.db
```

## 🔍 Monitoramento e Logs

### Sistema de Logs
- Logs de erro detalhados
- Rastreamento de operações
- Monitoramento de performance

### Métricas
- Número de agendamentos por usuário
- Tempo de resposta da API
- Uso de recursos do sistema

## 🎯 Próximas Funcionalidades

### 1. **Integração WhatsApp**
- Envio automático de lembretes
- Confirmação de agendamentos
- Notificações de status

### 2. **Sistema de Pagamentos**
- Integração com gateways
- Cobrança automática
- Relatórios financeiros

### 3. **App Mobile**
- React Native ou Flutter
- Sincronização em tempo real
- Notificações push

### 4. **Analytics Avançado**
- Dashboard de métricas
- Previsões de demanda
- Otimização de horários

## 📚 Conclusão

Este sistema foi projetado para ser:
- **Escalável**: Suporta múltiplos usuários independentes
- **Seguro**: Isolamento completo de dados
- **Flexível**: Configurações personalizáveis por usuário
- **Intuitivo**: Interface amigável e responsiva
- **Robusto**: Validações e tratamento de erros completos

A arquitetura multi-tenant garante que cada barbeiro tenha seu próprio ambiente isolado, enquanto o sistema de validação inteligente garante que os agendamentos respeitem as configurações individuais de cada estabelecimento.
