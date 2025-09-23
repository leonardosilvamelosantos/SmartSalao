# 🔧 Configuração do WhatsApp - Guia Rápido

## 📋 Passos para Configurar

### 1. **Criar arquivo .env**

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
# ==========================================
# CONFIGURAÇÕES DO SISTEMA DE AGENDAMENTO
# ==========================================

# Ambiente
NODE_ENV=development
PORT=3000

# ==========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ==========================================

# Usar SQLite por padrão
USE_SQLITE=true
DB_TYPE=sqlite
DB_PATH=./data/agendamento_dev.db

# ==========================================
# CONFIGURAÇÕES JWT
# ==========================================

JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_2024
JWT_EXPIRES_IN=24h

# ==========================================
# CONFIGURAÇÕES WHATSAPP MULTI-TENANT
# ==========================================

# Ativar sistema WhatsApp
START_WHATSAPP_BOT=true

# Lista de tenants para inicialização automática (opcional)
WHATSAPP_AUTO_START_TENANTS=empresa1,empresa2

# ==========================================
# CONFIGURAÇÕES GLOBAIS WHATSAPP
# ==========================================

WHATSAPP_DEFAULT_MAX_RETRIES=3
WHATSAPP_DEFAULT_RECONNECT_DELAY=5000
WHATSAPP_DEFAULT_QR_TIMEOUT=60000
WHATSAPP_DEFAULT_CONNECTION_TIMEOUT=30000

# ==========================================
# CONFIGURAÇÕES DE LIMPEZA
# ==========================================

WHATSAPP_CLEANUP_INTERVAL_MINUTES=5
WHATSAPP_MAX_INACTIVE_TIME_MINUTES=30

# ==========================================
# CONFIGURAÇÕES DE LOG
# ==========================================

WHATSAPP_LOG_LEVEL=info
WHATSAPP_LOG_PREFIX=[WHATSAPP]

# ==========================================
# CONFIGURAÇÕES DE MONITORAMENTO
# ==========================================

WHATSAPP_METRICS_ENABLED=true
WHATSAPP_METRICS_INTERVAL_SECONDS=60

# ==========================================
# CONFIGURAÇÕES DE RATE LIMITING
# ==========================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# CONFIGURAÇÕES DE REQUEST
# ==========================================

REQUEST_LIMIT=10mb
```

### 2. **Instalar Dependências**

```bash
npm install
```

### 3. **Iniciar o Servidor**

```bash
npm run dev
```

### 4. **Acessar a Interface WhatsApp**

1. Abra o navegador em: `http://localhost:3000/frontend/pages/whatsapp`
2. Faça login no sistema
3. Selecione um tenant no dropdown
4. Clique em "Conectar"
5. Escaneie o QR Code que aparecerá

## 🚀 Como Usar

### **Para Conectar WhatsApp:**

1. **Selecione um tenant** no dropdown
2. **Clique em "Conectar"**
3. **Escaneie o QR Code** com seu WhatsApp
4. **Aguarde a conexão** ser estabelecida

### **Para Enviar Mensagens de Teste:**

1. **Digite uma mensagem** no campo de texto
2. **Clique em "Enviar"**
3. **A mensagem será enviada** para o número de teste

## 🔧 Solução de Problemas

### **Problema: QR Code não aparece**

**Soluções:**
1. Verifique se o arquivo `.env` foi criado corretamente
2. Reinicie o servidor após criar o `.env`
3. Verifique os logs do servidor para erros
4. Tente fazer logout e conectar novamente

### **Problema: "Erro ao carregar tenants"**

**Soluções:**
1. Verifique se você está logado no sistema
2. Verifique se tem permissões de administrador
3. Verifique a conexão com o banco de dados

### **Problema: Conexão não estabelece**

**Soluções:**
1. Feche o WhatsApp Web no navegador
2. Tente escanear o QR Code novamente
3. Verifique se o número de telefone está correto
4. Aguarde alguns segundos e tente novamente

## 📱 Funcionalidades Disponíveis

- ✅ **Conexão Multi-Tenant**: Cada tenant tem sua própria conexão
- ✅ **QR Code Interativo**: Geração automática de QR codes
- ✅ **Envio de Mensagens**: Teste de conectividade
- ✅ **Monitoramento**: Status em tempo real
- ✅ **Logout Seguro**: Remoção de dados de autenticação

## 🔒 Segurança

- Cada tenant tem dados completamente isolados
- QR codes são gerados dinamicamente
- Dados de autenticação são armazenados localmente
- Rate limiting por tenant

## 📊 Monitoramento

- Status de conexão em tempo real
- Estatísticas de mensagens
- Logs detalhados por tenant
- Health checks automáticos

## 🎯 Próximos Passos

1. **Configure o arquivo .env**
2. **Inicie o servidor**
3. **Acesse a interface WhatsApp**
4. **Conecte seu primeiro tenant**
5. **Teste o envio de mensagens**

---

**Nota**: Este sistema usa WhatsApp Web (Baileys) para conexão. Certifique-se de que seu WhatsApp está fechado no navegador antes de escanear o QR Code.


