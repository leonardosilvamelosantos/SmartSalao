# 🖥️ Teste Interativo no Terminal - Simulador WhatsApp

Este documento descreve como usar o **Terminal Chat Tester**, uma ferramenta interativa que simula conversas por WhatsApp diretamente no terminal para testar todas as funcionalidades do sistema de agendamentos.

## 🎯 Visão Geral

O **Terminal Chat Tester** permite testar todas as funcionalidades do sistema sem precisar:
- Usar o WhatsApp real
- Configurar webhooks
- Ter números de telefone reais

Ele cria automaticamente dados de teste e simula uma conversa completa por WhatsApp através de comandos no terminal.

## 🚀 Como Usar

### Pré-requisitos

1. **Banco PostgreSQL rodando** com as tabelas criadas
2. **Dependências instaladas**: `npm install`
3. **Migrações executadas**: `npm run migrate`

### Execução

```bash
# Executar o teste interativo
npm run test-chat

# Ou diretamente
node scripts/test-terminal-chat.js
```

## 📋 Menu Principal

Ao executar, você verá o menu principal:

```
🎯 Terminal Chat Tester - Simulador de WhatsApp

📋 MENU PRINCIPAL
================
1. Simular conversa completa por WhatsApp
2. Testar apenas agendamento
3. Testar apenas consulta de horários
4. Testar apenas cancelamento
5. Ver dados de teste criados
6. Limpar dados de teste
7. Executar geração de slots
0. Sair
```

## 🎮 Modos de Teste

### 1. Simulação Completa de Conversa

**Opção 1** - Simula uma conversa completa por WhatsApp:

```
📱 SIMULAÇÃO COMPLETA DE CONVERSA WHATSAPP

Digite o número do WhatsApp (ou pressione Enter para usar cliente de teste):
```

**Fluxo típico:**
1. **Cliente** envia mensagem inicial
2. **BOT** apresenta opções (Agendar, Ver agendamentos, Cancelar, Ver horários)
3. **Cliente** escolhe opção
4. **BOT** guia através do processo
5. **Cliente** confirma/cancela ações

### 2. Teste de Agendamento Apenas

**Opção 2** - Testa apenas o fluxo de agendamento:

```
📅 TESTE DE AGENDAMENTO APENAS

📞 Simulando conversa com: 11888888888
```

**Fluxo:**
1. Seleção de serviço
2. Consulta de horários disponíveis
3. Seleção de data/horário
4. Confirmação do agendamento

### 3. Teste de Consulta de Horários

**Opção 3** - Testa apenas consulta de horários:

```
🕐 TESTE DE CONSULTA DE HORÁRIOS

Quantos dias à frente deseja ver? (1-7):
```

**Resultado:**
```
🗓️ Horários disponíveis nos próximos 3 dias:

📅 segunda-feira, 16 de dezembro:
   ✅ 12 horários: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15...

📅 terça-feira, 17 de dezembro:
   ✅ 15 horários: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15...
```

### 4. Teste de Cancelamento

**Opção 4** - Testa apenas cancelamento:

```
❌ TESTE DE CANCELAMENTO

🤖 BOT: Seus agendamentos:
1. 16/12/2025 às 10:00 - Corte de Cabelo
2. 17/12/2025 às 14:30 - Corte de Cabelo
```

### 5. Ver Dados de Teste

**Opção 5** - Mostra todos os dados criados:

```
📊 DADOS DE TESTE CRIADOS
========================

🏢 TENANT:
   ID: 1
   Nome: Terminal Test
   Domínio: terminal-test.local

👤 USUÁRIO:
   ID: 1
   Nome: Barbearia Terminal
   WhatsApp: 11999999999

📈 ESTATÍSTICAS DE SLOTS:
   Total: 480
   Livres: 478
   Reservados: 2
   Taxa de ocupação: 0.42%
```

### 6. Limpar Dados de Teste

**Opção 6** - Remove todos os dados de teste:

```
🧹 LIMPANDO DADOS DE TESTE

⚠️  ATENÇÃO: Isso irá remover TODOS os dados de teste. Confirmar? (s/n):
```

### 7. Executar Geração de Slots

**Opção 7** - Executa geração manual de slots:

```
🔄 GERANDO SLOTS

⏳ Gerando slots para Barbearia Terminal...
✅ 336 slots gerados com sucesso!

📊 Estatísticas após geração:
   Total: 336
   Livres: 336
   Reservados: 0
```

## 🔧 Dados de Teste Automáticos

O sistema cria automaticamente os seguintes dados:

### Tenant
- **Nome**: Terminal Test
- **Domínio**: terminal-test.local

### Usuário (Barbearia)
- **Nome**: Barbearia Terminal
- **WhatsApp**: 11999999999
- **Horários**: Seg-Sex, 09:00-18:00
- **Intervalo**: 15 minutos
- **Timezone**: America/Sao_Paulo

### Cliente
- **Nome**: João Silva
- **WhatsApp**: 11888888888
- **Email**: joao@email.com

### Serviço
- **Nome**: Corte de Cabelo
- **Preço**: R$ 25,00
- **Duração**: 30 minutos

## 💡 Exemplos de Uso

### Exemplo 1: Primeiro Teste Completo

```bash
$ npm run test-chat
# Escolher opção 1
# Pressionar Enter (usa cliente de teste)
# Escolher opção 1 (Agendar)
# Seguir os prompts...
```

### Exemplo 2: Teste de Agendamento Rápido

```bash
$ npm run test-chat
# Escolher opção 2
# Seguir apenas o fluxo de agendamento
```

### Exemplo 3: Verificar Estado do Sistema

```bash
$ npm run test-chat
# Escolher opção 5 (Ver dados)
# Ver estatísticas de slots e agendamentos
```

## 🎨 Interface Interativa

### Navegação
- Use **números** para escolher opções
- Pressione **Enter** para valores padrão
- Digite **s/n** para confirmações

### Cores e Emojis
- 🤖 **BOT**: Mensagens do assistente
- 👤 **Cliente**: Ações do cliente
- ✅ **Sucesso**: Operações bem-sucedidas
- ❌ **Erro**: Problemas encontrados
- 📊 **Dados**: Informações estatísticas

## 🔍 Depuração e Troubleshooting

### Problemas Comuns

**1. "Cliente não encontrado"**
```bash
# Solução: Usar o cliente de teste (pressionar Enter)
# Ou criar novo cliente digitando nome
```

**2. "Nenhum horário disponível"**
```bash
# Solução: Usar opção 7 para gerar slots
# Ou verificar configuração de horários do usuário
```

**3. "Erro de conexão com banco"**
```bash
# Verificar se PostgreSQL está rodando
# Verificar configurações em config/database.js
```

### Logs Detalhados

O sistema mostra logs detalhados de todas as operações:

```
🔧 Inicializando dados de teste...
🏢 Criando tenant de teste...
✅ Tenant criado: 1

👤 Criando usuário de teste...
✅ Usuário criado: 1
```

### Verificação de Integridade

Use a **opção 5** para verificar:
- Dados criados corretamente
- Estatísticas de slots
- Status dos agendamentos
- Integridade dos relacionamentos

## 🎯 Casos de Teste Sugeridos

### 1. Fluxo Básico de Agendamento
1. Executar teste completo (opção 1)
2. Agendar um horário
3. Verificar dados (opção 5)
4. Confirmar slot reservado

### 2. Teste de Capacidade
1. Gerar slots (opção 7)
2. Ver horários disponíveis (opção 3)
3. Fazer múltiplos agendamentos
4. Ver taxa de ocupação

### 3. Teste de Cancelamento
1. Criar agendamento
2. Listar agendamentos (opção 1 > 2)
3. Cancelar agendamento (opção 4)
4. Verificar slot liberado

### 4. Teste de Limites
1. Tentar agendar horário já ocupado
2. Tentar cancelar agendamento inexistente
3. Verificar validações de entrada

## 🛠️ Desenvolvimento e Extensões

### Arquitetura do Script

```javascript
TerminalChatTester
├── initializeTestData()     # Cria dados de teste
├── showMainMenu()          # Menu principal
├── simulateFullConversation()  # Simulação completa
├── simulateBooking()        # Fluxo de agendamento
├── simulateViewBookings()   # Visualização de agendamentos
├── simulateCancellation()   # Cancelamento
└── cleanupTestData()       # Limpeza
```

### Adicionando Novos Testes

Para adicionar novos testes, edite `scripts/test-terminal-chat.js`:

1. **Adicionar opção no menu** em `showMainMenu()`
2. **Implementar método** de teste
3. **Conectar com serviços** existentes
4. **Adicionar validações** e tratamento de erros

### Integração com APIs

O script usa as mesmas APIs do sistema:

```javascript
// Exemplo: Buscar horários disponíveis
const availableSlots = await SlotService.getAvailableSlots(
  userId, serviceId, date
);

// Exemplo: Criar agendamento
const booking = await Agendamento.create({
  id_cliente: clientId,
  id_usuario: userId,
  id_servico: serviceId,
  data_hora: selectedTime,
  status: 'confirmado'
});
```

## 📈 Métricas e Análise

### Métricas Disponíveis

Após testes, verifique:

- **Total de slots**: Quantidade total criada
- **Taxa de ocupação**: Slots livres vs. ocupados
- **Tempo de resposta**: Velocidade das operações
- **Taxa de erro**: Falhas vs. sucessos

### Análise de Performance

```bash
# Ver estatísticas detalhadas
npm run test-chat
# Opção 5: Ver dados de teste criados
```

## 🎉 Benefícios

✅ **Teste completo** sem WhatsApp real
✅ **Dados isolados** não afetam produção
✅ **Interface intuitiva** com menus claros
✅ **Logs detalhados** para depuração
✅ **Limpeza automática** de dados de teste
✅ **Flexibilidade** para testes específicos
✅ **Integração total** com sistema existente

---

**Implementado em**: Setembro 2025
**Arquivo**: `scripts/test-terminal-chat.js`
**Execução**: `npm run test-chat`
**Status**: ✅ Pronto para uso
