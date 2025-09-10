### Visão Geral
- Stack: Node.js + Express (backend) • SQLite (dev) • HTML/CSS/JS + Bootstrap/Chart.js (frontend)
- Arquitetura: Monolito REST com SPA simples (carregamento dinâmico por páginas)
- Multi-tenant (dev): Simplificado; verificações de posse por id_usuario; tenants admin reativados

### Estrutura do Projeto
- src/
  - index.js: App Express, middlewares, CORS/CSP, rotas estáticas do frontend, rotas da API, rate limit
  - config/
    - database-sqlite.js: pool SQLite (arquivo único data/agendamento_dev.db)
    - database.js: exporta o pool SQLite
  - middleware/
    - auth.js: JWT (authenticateToken), permissões
    - tenant.js: isolamento multi-tenant (requer admin reativado)
    - validation.js: Joi (stripUnknown ativado)
  - models/
    - BaseModel.js: CRUD genérico, compatível com SQLite (placeholders ?, last_insert_rowid() via SELECT)
    - Usuario.js, Servico.js, Cliente.js, Agendamento.js, Slot.js: consultas com ? e CURRENT_TIMESTAMP
  - controllers/
    - UsuarioController.js, ServicoController.js, ClienteController.js, AgendamentoController.js
    - AdminController.js: padronizado p/ SQLite (sem FILTER/INTERVAL/DATE_TRUNC)
    - DashboardController.js, TenantController.js, WhatsappController.js
  - routes/
    - auth.js (rotas de debug removidas), usuarios.js, servicos.js, clientes.js, agendamentos.js
    - dashboard.js, tenant.js (requireSystemAdmin reativado), backup.js, whatsapp.js
  - services/
    - AuthService.js: JWT, mock simplificado no dev
    - DashboardService.js: métricas com ? e cache em dashboard_cache
    - NotificationService.js: lembretes (tabelas padrão, ?)
    - CronJobService.js: jobs controlados por ENABLE_CRON (false em dev)
    - SlotService.js, BackupService.js, etc.
  - database/
    - migrations.js: bloco único SQLite (cria tabelas + índices)
    - init-sqlite.js: inicialização e seed leve
- frontend/
  - index.html: dashboard e páginas (SPA-like)
  - css/: main.css, dark-mode.css
  - js/: main.js (navegação, CRUD, modais, cache local), theme.js, dashboard.js
  - pages/login.html: login

### Banco de Dados (SQLite)
- Arquivo: data/agendamento_dev.db
- Tabelas: usuarios, servicos, clientes, agendamentos, slots, notificacoes, dashboard_cache
- Convenções:
  - Placeholders: ?
  - Timestamps: created_at/updated_at com CURRENT_TIMESTAMP
  - dashboard_cache: índice único (id_usuario, tipo) e data_calculo, expires_at (DATETIME)

### Autenticação/Autorização
- JWT via AuthService.js (dev simplificado)
- authenticateToken aplicado às rotas protegidas
- requireSystemAdmin reativado nas rotas de tenants/admin

### Rotas Principais
- Públicas: GET /health, GET /api/db-health, POST /api/test, Frontend: /frontend, /frontend/pages/login
- Protegidas: /api/usuarios, /api/servicos, /api/clientes, /api/agendamentos, /api/dashboard, /api/backup, /api/whatsapp, /api/admin, /api/tenants

### Services e Cron
- DashboardService: métricas (hoje/semana/mês/trends), cache com dashboard_cache
- NotificationService: lembretes 24h/2h/30m; logs em notificacoes
- CronJobService: geração de slots, limpeza, backup, lembretes (desligados por padrão em dev com ENABLE_CRON=false)

### Frontend (UX/Estado)
- Navegação SPA por seções (.page.active)
- Dark/Light mode (persistido)
- Serviços: visualização table/cards persistida (localStorage), filtros e ordenação
- Agenda: listagem ordenada por start_at, agrupada por data
- Caches normalizados: clientesData, agendaData, usuariosData, servicosData
- Modais com checagens de DOM e fechamento seguro

### Segurança/Boas Práticas
- Helmet com CSP (em produção), CORS restrito (lista branca)
- Rate limiting (configurável)
- Joi com stripUnknown
- Logs padronizados por ambiente (morgan: dev/combined)

### Testes/Verificação
- Smoke básico: scripts/smoke-test.js (health, db-health, teste público + login + GETs protegidos)
- Scripts utilitários: criação/checagem de banco e cache

### Execução/Config (resumo)
- .env sugerido:
  - PORT=3000, NODE_ENV=development, JWT_SECRET=troque-esta-chave, ENABLE_CRON=false
- Migrar/criar:
  - node scripts/migrate.js && node scripts/create-dashboard-cache.js
- Rodar:
  - Dev: ENABLE_CRON=false npm run dev
  - Prod: NODE_ENV=production ENABLE_CRON=true node src/index.js
- Frontend: http://localhost:3000/frontend • Login: /frontend/pages/login

### Status Atual
- CRUDs, navegação SPA, dark mode, dashboards e lembretes prontos para dev
- Placeholders e timestamps padronizados para SQLite
- Admin/Tenant com permissões restauradas
- dashboard_cache e agenda ordenada implementados


