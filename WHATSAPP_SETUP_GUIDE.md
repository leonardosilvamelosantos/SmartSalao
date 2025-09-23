# 🚀 Guia de Configuração - WhatsApp Multi-Tenant

## 📋 Pré-requisitos

- ✅ Servidor funcionando
- ✅ Sistema de autenticação JWT ativo
- ✅ Pelo menos um usuário logado
- ✅ Permissões de administrador

## ⚙️ Passos para Configuração

### 1. **Configurar Variáveis de Ambiente**

Adicione ao seu arquivo `.env`:

```bash
# Ativar WhatsApp Bot
START_WHATSAPP_BOT=true

# Lista de tenants para inicialização automática (opcional)
WHATSAPP_AUTO_START_TENANTS=empresa1,clinica_medica
```

### 2. **Reiniciar o Servidor**

```bash
# Parar o servidor atual (Ctrl+C)
# Reiniciar
npm run dev
```

### 3. **Acessar a Página WhatsApp**

1. Faça login no sistema
2. No menu lateral, clique em **"WhatsApp Bot"**
3. Você será redirecionado para a página de gerenciamento

### 4. **Primeiro Uso**

1. **Selecione um tenant** no dropdown
2. **Clique em "Conectar"**
3. **Escaneie o QR Code** que aparecerá
4. **Aguarde a conexão** ser estabelecida

## 🎯 Funcionalidades Disponíveis

### ✅ **Gestão de Conexões**
- Conectar/desconectar tenants individualmente
- Visualizar status em tempo real
- Reiniciar conexões com problemas
- Logout e limpeza de dados

### ✅ **QR Code Interativo**
- Geração automática de QR codes
- Streaming em tempo real
- Interface responsiva
- Compatível com dispositivos móveis

### ✅ **Monitoramento**
- Estatísticas de mensagens
- Status de conversas ativas
- Histórico de conexões
- Alertas em tempo real

### ✅ **Envio de Mensagens**
- Teste de conectividade
- Envio manual de mensagens
- Histórico de mensagens enviadas

## 🔧 Solução de Problemas

### **Problema: "Erro ao carregar tenants"**

**Possíveis causas:**
- Token JWT expirado
- Falta de permissões de administrador
- Problema de conectividade com a API

**Soluções:**
1. Faça logout e login novamente
2. Verifique se você tem permissões de administrador
3. Verifique a conexão com o servidor

### **Problema: QR Code não aparece**

**Possíveis causas:**
- Tenant não selecionado
- Conexão já estabelecida
- Problema na geração do QR code

**Soluções:**
1. Selecione um tenant no dropdown
2. Se já estiver conectado, faça logout primeiro
3. Tente recarregar a página

### **Problema: Mensagens não são enviadas**

**Possíveis causas:**
- Conexão não estabelecida
- Número de telefone inválido
- Problemas na API do WhatsApp

**Soluções:**
1. Verifique se a conexão está ativa
2. Use um número de telefone válido (com DDD)
3. Verifique os logs do servidor

## 📱 Como Usar o Sistema

### **Para Clientes**

1. **Envie uma mensagem** para o número do estabelecimento
2. **Receba respostas automáticas** do bot
3. **Agende serviços** através de comandos simples
4. **Receba confirmações** e lembretes

### **Para Administradores**

1. **Acesse a página WhatsApp** no painel
2. **Gerencie múltiplas conexões** simultaneamente
3. **Monitore estatísticas** em tempo real
4. **Envie mensagens manuais** quando necessário

## 💬 Comandos Disponíveis para Clientes

### **Comandos Básicos**
- `oi` ou `olá` - Iniciar conversa
- `menu` - Ver opções disponíveis
- `agendar` - Iniciar agendamento
- `serviços` - Ver serviços disponíveis
- `agendamentos` - Ver agendamentos pessoais

### **Agendamento por Voz**
- `"amanhã às 14h"` - Agendamento natural
- `"sexta-feira 15h"` - Dia da semana + horário
- `"15 de setembro"` - Data específica

### **Confirmação**
- `sim` - Confirmar agendamento
- `não` - Cancelar ou corrigir

## 🔒 Segurança

### **Isolamento de Tenants**
- Cada tenant tem sua própria conexão WhatsApp
- Dados completamente isolados
- Autenticação individual por tenant

### **Controle de Acesso**
- Apenas administradores podem gerenciar conexões
- Logs detalhados de todas as operações
- Rate limiting por tenant

### **Dados Sensíveis**
- QR codes gerados dinamicamente
- Dados de autenticação criptografados
- Sessões isoladas por tenant

## 📊 Monitoramento

### **Métricas Disponíveis**
- Número de conexões ativas
- Taxa de resposta do bot
- Tempo médio de resposta
- Taxa de conversões (mensagens → agendamentos)

### **Logs do Sistema**
```
🤖 [tenant1] Bot WhatsApp inicializado
📱 [tenant1] QR Code gerado
✅ [tenant1] WhatsApp conectado
📨 [tenant1] Mensagem recebida
📤 [tenant1] Resposta enviada
```

## 🚀 Próximos Passos

### **Funcionalidades Planejadas**
- [ ] Suporte a mídia (fotos, documentos)
- [ ] Templates de mensagens personalizáveis
- [ ] Lembretes automáticos de agendamento
- [ ] Relatórios detalhados de conversas
- [ ] Suporte a múltiplos idiomas
- [ ] Integração com calendários externos

### **Melhorias de Performance**
- [ ] Cache de respostas frequentes
- [ ] Otimização de conexões simultâneas
- [ ] Compressão de dados em tempo real
- [ ] Balanceamento de carga entre tenants

## 📞 Suporte

### **Logs de Debug**
Para ativar logs detalhados, adicione ao `.env`:
```bash
WHATSAPP_LOG_LEVEL=debug
WHATSAPP_LOG_PREFIX=[WHATSAPP-DEBUG]
```

### **Health Checks**
```bash
# Verificar saúde geral
GET /api/bot/health

# Verificar saúde do WhatsApp
GET /api/bot/health/whatsapp

# Verificar saúde das conversas
GET /api/bot/health/conversations
```

## 🎉 Conclusão

O sistema WhatsApp Multi-Tenant está totalmente funcional e integrado ao seu sistema de agendamento. Ele oferece:

- ✅ **Gestão completa** de conexões por tenant
- ✅ **Interface intuitiva** para administradores
- ✅ **Experiência natural** para clientes
- ✅ **Segurança e isolamento** de dados
- ✅ **Monitoramento em tempo real**

**Para começar:** Acesse a página WhatsApp no seu painel e configure sua primeira conexão! 🚀📱






