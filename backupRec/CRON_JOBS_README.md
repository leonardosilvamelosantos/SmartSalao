# Sistema de Cron Jobs - Geração de Slots

Este documento descreve o sistema de cron jobs implementado para geração automática de slots de horário no sistema de agendamentos.

## 📋 Visão Geral

O sistema foi implementado seguindo as especificações fornecidas:

- **Objetivo**: Manter sempre disponíveis os próximos `max_advance_days` slots para cada usuário
- **Execução**: Uma vez por dia, durante horário de baixa carga (02:00)
- **Funcionalidades**:
  - Geração automática de slots baseada na configuração de horários do usuário
  - Conversão precisa de timezones (local → UTC)
  - Preservação de slots já reservados (status 'booked')
  - Limpeza semanal de slots antigos

## 🏗️ Arquitetura

### Arquivos Implementados

```
src/services/CronJobService.js    # Serviço principal de cron jobs
src/index.js                      # Integração com aplicação principal
scripts/test-cron.js             # Script de teste
CRON_JOBS_README.md             # Esta documentação
```

### Dependências

- `node-cron`: Para agendamento de tarefas
- `moment-timezone`: Para conversão precisa de timezones

## ⚙️ Configuração

### Jobs Configurados

1. **Geração Diária de Slots** (`daily-slot-generation`)
   - **Horário**: 02:00 todos os dias (timezone America/Sao_Paulo)
   - **Função**: `generateDailySlots()`
   - **Objetivo**: Gerar slots para os próximos `max_advance_days`

2. **Limpeza Semanal** (`weekly-cleanup`)
   - **Horário**: 03:00 todos os domingos (timezone America/Sao_Paulo)
   - **Função**: `weeklyCleanup()`
   - **Objetivo**: Remover slots antigos e livres

### Configuração do Usuário

Cada usuário possui as seguintes configurações relevantes:

```javascript
{
  timezone: 'America/Sao_Paulo',           // Timezone do usuário
  config_horarios: [                       // Configuração de horários por dia
    { dia: 1, inicio: '09:00', fim: '18:00' }, // Segunda-feira
    { dia: 2, inicio: '09:00', fim: '18:00' }, // Terça-feira
    // ... dias 3, 4, 5
  ],
  intervalo_min: 15,                       // Intervalo entre slots (minutos)
  max_advance_days: 60                      // Dias à frente para gerar
}
```

## 🔄 Algoritmo de Geração

O algoritmo segue exatamente o pseudocódigo fornecido:

```javascript
for each usuario u:
  for day in next 0..max_advance_days:
    if day is open according to u.config_horarios:
      start = date at horario_inicio (in u.timezone)
      while start + intervalo_min <= horario_fim:
        if no slot exists at (u.id, start):
           INSERT slot (start_at, end_at=start_at+intervalo_min, status='free')
        start += intervalo_min
```

### Características Técnicas

- **Armazenamento UTC**: Todos os horários são convertidos e armazenados em UTC
- **Preservação de Reservas**: Slots com status 'booked' nunca são sobrescritos
- **Timezone-aware**: Conversão precisa usando moment-timezone
- **Dias da Semana**: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

## 🚀 Como Usar

### Inicialização Automática

O sistema inicia automaticamente quando o servidor é iniciado:

```bash
npm start        # Inicia servidor com jobs cron
npm run dev      # Modo desenvolvimento com jobs cron
```

### Execução Manual

Para testes e depuração:

```bash
# Executar geração manual de slots
npm run generate-slots

# Executar teste completo com dados de exemplo
npm run test-cron
```

### API de Administração

#### Verificar Status dos Jobs

```http
GET /api/admin/cron-status
```

Resposta:
```json
{
  "success": true,
  "jobs": [
    {
      "name": "daily-slot-generation",
      "schedule": "0 2 * * *",
      "running": true
    },
    {
      "name": "weekly-cleanup",
      "schedule": "0 3 * * 0",
      "running": false
    }
  ]
}
```

#### Executar Geração Manual via API

```http
POST /api/admin/run-slot-generation
```

Resposta:
```json
{
  "success": true,
  "message": "Geração manual de slots executada com sucesso"
}
```

## 🧪 Testes

### Script de Teste

O script `scripts/test-cron.js` cria dados de teste automaticamente:

1. Cria um tenant de teste
2. Cria um usuário com configuração de horários
3. Executa a geração de slots
4. Mostra estatísticas dos slots criados

### Execução do Teste

```bash
npm run test-cron
```

**Pré-requisitos**: PostgreSQL rodando com banco configurado.

## 📊 Monitoramento e Logs

### Logs do Sistema

Os jobs geram logs detalhados no console:

```
🚀 Iniciando jobs cron...
📅 Job de geração diária de slots agendado para 02:00 (America/Sao_Paulo)
📅 Job de limpeza semanal agendado para domingos às 03:00 (America/Sao_Paulo)
✅ Jobs cron iniciados com sucesso

🔄 Iniciando geração diária de slots...
👥 Processando 5 usuários...
🔧 Configurações: maxAdvanceDays=60, intervalo=15min, timezone=America/Sao_Paulo
📅 Processando dia 2025-09-10: 09:00-18:00 (America/Sao_Paulo)
✅ Slots gerados para usuário 1 (Barbearia Teste)
✅ Geração diária de slots concluída
```

### Possíveis Problemas

1. **Timezone incorreto**: Verificar configuração do usuário
2. **Slots não gerados**: Verificar configuração de `config_horarios`
3. **Conflito de reservas**: Slots 'booked' são preservados por design
4. **Banco de dados**: Verificar conexão e migrações

## 🔧 Manutenção

### Limpeza Manual

```javascript
const CronJobService = require('./src/services/CronJobService');

// Limpeza de slots antigos (30+ dias)
await CronJobService.weeklyCleanup();

// Geração manual para um usuário específico
await CronJobService.generateSlotsForUser(userId);
```

### Modificação de Horários

Após alterar `config_horarios` de um usuário:

```javascript
const SlotService = require('./src/services/SlotService');

// Limpar e regenerar slots
await SlotService.updateSlotsForUser(userId);
```

## 🎯 Considerações de Produção

1. **Horário de Execução**: 02:00 foi escolhido por ser horário de baixa carga
2. **Timezone**: Sempre usar timezones IANA (ex: 'America/Sao_Paulo')
3. **Monitoramento**: Implementar alertas para falhas nos jobs
4. **Performance**: Otimizar queries para grande volume de usuários
5. **Backup**: Incluir slots na estratégia de backup do banco

## 📝 Próximas Melhorias

- [ ] Dashboard de monitoramento dos jobs
- [ ] Métricas de performance (tempo de execução, slots criados)
- [ ] Notificações de erro por email/Slack
- [ ] Suporte a múltiplos timezones avançados
- [ ] Otimização para milhares de usuários
- [ ] Cache de configurações de usuário

---

**Implementado em**: Setembro 2025
**Versão**: 1.0.0
**Status**: ✅ Pronto para produção
