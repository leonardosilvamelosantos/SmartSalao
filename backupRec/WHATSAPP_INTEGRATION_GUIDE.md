# 📱 Guia de Integração WhatsApp com Evolution API

## 🎯 Visão Geral

Este guia explica como integrar seu sistema de agendamentos com o WhatsApp usando o **Evolution API**, uma alternativa mais acessível ao WhatsApp Business API oficial.

## 🏗️ Arquitetura da Integração

```
Cliente WhatsApp → Evolution API → Seu Sistema → Resposta
       ↓                ↓             ↓           ↓
   Mensagem       Webhook POST   Processamento  Resposta
   Recebida       /api/whatsapp/webhook
```

## ⚙️ Configuração do Evolution API

### 1. Instalação do Evolution API

```bash
# Usando Docker (recomendado)
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -v $(pwd)/evolution-data:/evolution \
  atendai/evolution-api:latest
```

### 2. Configuração da Instância

Acesse `http://localhost:8080` e:

1. **Criar Instância**: Dê um nome (ex: `meu-sistema-agendamento`)
2. **Conectar WhatsApp**: Escaneie o QR Code com seu WhatsApp
3. **Configurar Webhook**:
   - **URL do Webhook**: `https://seusistema.com/api/whatsapp/webhook`
   - **Eventos**: Marcar "Mensagens"
   - **Token de Segurança**: Configure um token secreto

### 3. Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave-api-aqui
EVOLUTION_INSTANCE_NAME=meu-sistema-agendamento
EVOLUTION_WEBHOOK_TOKEN=token-seguro-para-webhook
```

## 📡 Formato do Webhook

### Payload Recebido

```json
{
  "from": "5511999999999",
  "message": "Oi, quero agendar",
  "businessNumber": "5511888888888",
  "messageType": "text",
  "timestamp": 1703123456789,
  "instanceName": "meu-sistema-agendamento"
}
```

### Resposta Esperada

```json
{
  "success": true,
  "message": "Mensagem processada"
}
```

## 🎭 Controle de Conversas

### Estados da Conversa

```javascript
{
  "idle": "Aguardando comando",
  "waiting_service": "Escolhendo serviço",
  "waiting_date": "Escolhendo data",
  "waiting_time": "Escolhendo horário",
  "waiting_confirmation": "Confirmando agendamento"
}
```

### Exemplo de Fluxo Completo

```
Cliente: "Oi"
Sistema: "Olá! Escolha uma opção:
         1. Agendar serviço
         2. Ver meus agendamentos"

Cliente: "1"
Sistema: "Escolha o serviço:
         1. Corte de cabelo - R$25
         2. Barba - R$15"

Cliente: "1"
Sistema: "Perfeito! Informe a data (DD/MM):"

Cliente: "15/12"
Sistema: "Ótimo! Agora o horário (HH:MM):"

Cliente: "14:30"
Sistema: "Confirme o agendamento:
         📅 15/12 às 14:30
         💇 Corte de cabelo - R$25

         1. ✅ Confirmar
         2. ❌ Cancelar"

Cliente: "1"
Sistema: "✅ Agendamento confirmado!"
```

## 🔄 Lidando com Múltiplas Mensagens

### Problema Comum

Clientes frequentemente mandam várias mensagens seguidas:

```
Cliente: "Oii"
Cliente: "tudo bem?"
Cliente: "Boa Tarde"
Cliente: "quero agendar"
```

### Solução Implementada

```javascript
// 1. FILA DE MENSAGENS
const messageQueue = {
  "5511999999999": [
    { message: "Oii", processed: false },
    { message: "tudo bem?", processed: false },
    { message: "quero agendar", processed: false }
  ]
};

// 2. DETECÇÃO DE SAUDAÇÕES
const greetings = ['oi', 'olá', 'bom dia', 'boa tarde'];
const isGreeting = (msg) => greetings.some(g => msg.includes(g));

// 3. AGRUPAMENTO DE MENSAGENS SIMILARES
function groupSimilar(messages) {
  // Agrupa mensagens iguais ou muito similares
  // Processa apenas uma do grupo
}

// 4. PROCESSAMENTO SEQUENCIAL
async function processQueue(userId) {
  const queue = getUserQueue(userId);
  for (const msg of queue) {
    if (!msg.processed) {
      await processMessage(msg);
      msg.processed = true;
      await sleep(1000); // Evitar flood
    }
  }
}
```

### Estratégias de Resposta

✅ **Saudações**: Responder imediatamente com menu
✅ **Mensagens Similares**: Agrupar e processar uma vez
✅ **Sequência Lógica**: Processar em ordem cronológica
✅ **Timeout**: Limpar mensagens antigas (>5min)

## 📤 Envio de Mensagens

### Via Evolution API

```javascript
const sendMessage = async (to, message) => {
  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: to,
      text: message,
      delay: 1000
    })
  });

  return response.json();
};
```

### Templates de Mensagens

```javascript
const templates = {
  booking_created: {
    title: '✅ Agendamento Confirmado',
    body: (booking) => `Olá! Seu agendamento foi confirmado.
📅 ${booking.date} às ${booking.time}
💇 ${booking.service} - R$ ${booking.price}`
  },

  booking_reminder_24h: {
    title: '🔔 Lembrete: Agendamento Amanhã',
    body: (booking) => `Olá! Você tem agendamento marcado para amanhã.
📅 ${booking.date} às ${booking.time}
💇 ${booking.service}`
  }
};
```

## 🧪 Testes da Integração

### 1. Teste do Webhook

```bash
# Testar webhook manualmente
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "Oi, quero agendar",
    "businessNumber": "5511888888888",
    "messageType": "text"
  }'
```

### 2. Teste de Envio

```bash
# Testar envio de mensagem
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999",
    "message": "Olá! Teste do sistema"
  }'
```

### 3. Verificar Status

```bash
# Verificar status da integração
curl http://localhost:3000/api/whatsapp/status
```

## 📊 Monitoramento

### Estatísticas Disponíveis

```javascript
// GET /api/whatsapp/stats
{
  "conversations": {
    "activeSessions": 5,
    "sessionsByState": {
      "idle": 3,
      "waiting_service": 1,
      "waiting_date": 1
    }
  },
  "queue": {
    "totalQueues": 5,
    "totalMessages": 12,
    "oldestMessage": "2024-01-15T10:30:00Z"
  }
}
```

### Limpeza Automática

```javascript
// Limpar conversas antigas
POST /api/whatsapp/cleanup

// Resetar conversa específica
POST /api/whatsapp/reset/5511999999999
```

## 🚀 Produção

### Configurações de Produção

```env
# HTTPS obrigatório para webhooks
EVOLUTION_API_URL=https://api.evolution.com
EVOLUTION_WEBHOOK_URL=https://seusistema.com/api/whatsapp/webhook

# Rate limiting
WHATSAPP_RATE_LIMIT=10
WHATSAPP_RATE_WINDOW=60

# Logs detalhados
WHATSAPP_LOG_LEVEL=info
WHATSAPP_LOG_FILE=./logs/whatsapp.log
```

### Segurança

1. **Token de Webhook**: Valide sempre o token
2. **Rate Limiting**: Evite abuso da API
3. **Logs**: Monitore todas as mensagens
4. **Backup**: Faça backup das conversas importantes

### Escalabilidade

1. **Múltiplas Instâncias**: Use uma instância por barbeiro
2. **Balanceamento**: Distribua carga entre servidores
3. **Cache**: Cache de conversas ativas
4. **Banco**: Persista histórico de conversas

## 🛠️ Troubleshooting

### Problemas Comuns

**❌ Webhook não recebe mensagens**
- Verificar URL do webhook
- Confirmar token de segurança
- Checar logs do Evolution API

**❌ Mensagens não são enviadas**
- Verificar conexão da instância
- Confirmar formato do número (+55...)
- Checar rate limits

**❌ Conversas ficam travadas**
- Implementar timeout automático
- Adicionar opção "voltar ao início"
- Limpar sessões antigas

## 📚 Recursos Adicionais

- [Documentação Evolution API](https://doc.evolution-api.com)
- [Webhooks WhatsApp](https://developers.facebook.com/docs/whatsapp/webhooks)
- [Exemplos de Bots](https://github.com/pedroslopez/whatsapp-web.js)

---

**🎉 Sua integração WhatsApp está pronta!**

Agora seus clientes podem agendar serviços diretamente pelo WhatsApp de forma natural e intuitiva! 🤖✨
