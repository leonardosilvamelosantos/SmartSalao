# ==================================
# CONFIGURAÇÃO WHATSAPP MULTI-TENANT
# ==================================

Adicione ao seu arquivo `.env`:

```bash
# Ativar sistema WhatsApp
START_WHATSAPP_BOT=true

# Lista de tenants para inicialização automática
# Separe por vírgula os IDs dos tenants que devem iniciar automaticamente
WHATSAPP_AUTO_START_TENANTS=empresa1,empresa2,clinica_medica

# ==================================
# CONFIGURAÇÕES POR TENANT
# ==================================

# Exemplo de configuração individual (opcional)
# Cada tenant pode ter suas próprias configurações específicas

# Configurações específicas do tenant empresa1
# TENANT_EMPRESA1_MAX_RETRIES=5
# TENANT_EMPRESA1_RECONNECT_DELAY=10000

# Configurações específicas do tenant empresa2
# TENANT_EMPRESA2_MAX_RETRIES=3
# TENANT_EMPRESA2_RECONNECT_DELAY=15000

# ==================================
# CONFIGURAÇÕES GLOBAIS
# ==================================

# Configurações padrão aplicáveis a todos os tenants
WHATSAPP_DEFAULT_MAX_RETRIES=3
WHATSAPP_DEFAULT_RECONNECT_DELAY=5000
WHATSAPP_DEFAULT_QR_TIMEOUT=60000
WHATSAPP_DEFAULT_CONNECTION_TIMEOUT=30000

# ==================================
# CONFIGURAÇÕES DE LIMPEZA
# ==================================

# Intervalo para limpeza de conexões inativas (em minutos)
WHATSAPP_CLEANUP_INTERVAL_MINUTES=5

# Tempo máximo de inatividade antes de desconectar (em minutos)
WHATSAPP_MAX_INACTIVE_TIME_MINUTES=30

# ==================================
# CONFIGURAÇÕES DE LOG
# ==================================

# Nível de log para o sistema WhatsApp
WHATSAPP_LOG_LEVEL=info

# Prefixo para logs do WhatsApp
WHATSAPP_LOG_PREFIX=[WHATSAPP]

# ==================================
# CONFIGURAÇÕES DE MONITORAMENTO
# ==================================

# Habilitar métricas detalhadas
WHATSAPP_METRICS_ENABLED=true

# Intervalo para coleta de métricas (em segundos)
WHATSAPP_METRICS_INTERVAL_SECONDS=60

# ==================================
# EXEMPLO DE USO
# ==================================

# 1. Para iniciar apenas tenants específicos:
WHATSAPP_AUTO_START_TENANTS=empresa1,clinica_medica

# 2. Para desenvolvimento (nenhum tenant inicia automaticamente):
WHATSAPP_AUTO_START_TENANTS=

# 3. Para produção (todos os tenants ativos):
WHATSAPP_AUTO_START_TENANTS=empresa1,empresa2,clinica_medica,farmacia_central

# ==================================
# NOTAS IMPORTANTES
# ==================================

# - Cada tenant terá sua própria pasta de autenticação
# - Os dados são completamente isolados entre tenants
# - Cada tenant precisa escanear seu próprio QR code
# - As configurações são aplicadas por tenant
# - Os logs são identificados por tenant para facilitar debug
```

## 🎯 Como Usar

### 1. **Configuração Básica**

```bash
# Copie as configurações acima para seu .env
# Ajuste os tenants de acordo com seu sistema
START_WHATSAPP_BOT=true
WHATSAPP_AUTO_START_TENANTS=empresa1,empresa2
```

### 2. **Inicialização**

```bash
# Iniciar servidor
npm start

# Ou com variável específica
START_WHATSAPP_BOT=true npm start
```

### 3. **Gerenciamento via Frontend**

Acesse: `http://localhost:3000/frontend/pages/whatsapp`

### 4. **Gerenciamento via API**

```bash
# Ver todos os tenants
curl http://localhost:3000/api/bot/tenants

# Inicializar tenant específico
curl -X POST http://localhost:3000/api/bot/tenants/empresa1/initialize

# Obter QR code
curl http://localhost:3000/api/bot/tenants/empresa1/qr
```

## 📁 Estrutura de Arquivos Criada

```
data/whatsapp-auth/
├── empresa1/          # Dados de autenticação do tenant empresa1
├── empresa2/          # Dados de autenticação do tenant empresa2
└── clinica_medica/    # Dados de autenticação do tenant clinica_medica

src/whatsapp-bot/
├── config/
│   └── TenantBaileyConfig.js     # Configuração individual por tenant
├── services/
│   ├── MultiTenantWhatsAppService.js  # Gerenciamento multi-tenant
│   ├── BotActivationService.js        # Ativação inteligente
│   ├── BotStateService.js            # Estados de conversa
│   └── BotProcessorService.js        # Processador principal
├── controllers/
│   └── BotAdminController.js         # API de administração
├── routes/
│   └── bot-admin.js                  # Rotas da API
└── utils/
    ├── DateParser.js                # Interpretação de datas
    ├── ConfirmationService.js       # Confirmações
    └── MessageFormatter.js          # Formatação de mensagens

frontend/pages/
└── whatsapp.html                    # Interface de gerenciamento
```

## 🔐 Segurança Multi-Tenant

- ✅ **Isolamento Completo**: Cada tenant tem seus próprios dados
- ✅ **Autenticação JWT**: Controle de acesso por tenant
- ✅ **Rate Limiting**: Limitação por tenant
- ✅ **Logs Isolados**: Identificação clara por tenant
- ✅ **Cleanup Automático**: Remoção de conexões inativas

## 🚀 Próximos Passos

1. **Configure as variáveis** no seu `.env`
2. **Inicie o servidor** com `START_WHATSAPP_BOT=true`
3. **Acesse o frontend** em `/frontend/pages/whatsapp`
4. **Selecione um tenant** e clique em "Conectar"
5. **Escaneie o QR code** que aparecerá
6. **Pronto!** Seu bot multi-tenant está funcionando






