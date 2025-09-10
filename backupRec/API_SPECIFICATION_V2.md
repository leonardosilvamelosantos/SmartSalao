# 📋 API v2 - Sistema de Agendamento Otimizado

## 🎯 **VISÃO GERAL**

API REST JSON otimizada para sistema de agendamento via WhatsApp, com foco em:
- **Performance** com cache inteligente
- **Concurrência** robusta com locks
- **Validação** completa e segura
- **Documentação** clara de erros
- **Rate limiting** granular
- **Versionamento** semântico

---

## 🔗 **ENDPOINTS PRINCIPAIS**

### **1. Serviços Disponíveis**
```http
GET /api/v2/barbers/{barberId}/services
```

**Parâmetros de Query:**
- `page` (opcional): página (default: 1)
- `limit` (opcional): itens por página (default: 20, max: 50)
- `active` (opcional): apenas serviços ativos (default: true)

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "Corte Masculino",
        "duration_minutes": 30,
        "price": 35.00,
        "description": "Corte completo com acabamento",
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/services?page=1&limit=20",
    "next": null,
    "prev": null
  }
}
```

---

### **2. Dias Disponíveis**
```http
GET /api/v2/barbers/{barberId}/availability/days
```

**Parâmetros de Query:**
- `service_id`: ID do serviço (obrigatório)
- `start_date`: data inicial (YYYY-MM-DD, obrigatório)
- `end_date`: data final (YYYY-MM-DD, obrigatório, max 30 dias)
- `timezone`: timezone do cliente (default: America/Sao_Paulo)

**Lógica Otimizada:**
- Cache por 15 minutos (dashboard_cache)
- Query otimizada com índices compostos
- Filtra apenas dias com slots disponíveis
- Calcula contagem de slots disponíveis

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "barber_id": 123,
    "service_id": 1,
    "timezone": "America/Sao_Paulo",
    "available_days": [
      {
        "date": "2025-09-15",
        "weekday": "Segunda-feira",
        "display_name": "Seg 15/09",
        "available_slots": 8,
        "time_range": "09:00 - 18:00",
        "_links": {
          "slots": "/api/v2/barbers/123/availability/slots?date=2025-09-15&service_id=1"
        }
      }
    ],
    "period": {
      "start_date": "2025-09-10",
      "end_date": "2025-09-20",
      "total_days_checked": 11,
      "days_with_availability": 7
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-10&end_date=2025-09-20",
    "service": "/api/v2/barbers/123/services/1"
  }
}
```

---

### **3. Horários Disponíveis**
```http
GET /api/v2/barbers/{barberId}/availability/slots
```

**Parâmetros de Query:**
- `service_id`: ID do serviço (obrigatório)
- `date`: data específica (YYYY-MM-DD, obrigatório)
- `timezone`: timezone (default: America/Sao_Paulo)
- `page`: página (default: 1)
- `limit`: itens por página (default: 10, max: 20)

**Lógica Otimizada:**
- Cache por 5 minutos (dashboard_cache)
- Query com window functions para eficiência
- Agrupamento inteligente de slots consecutivos
- Validação de disponibilidade em tempo real

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "barber_id": 123,
    "service_id": 1,
    "date": "2025-09-15",
    "timezone": "America/Sao_Paulo",
    "available_slots": [
      {
        "slot_id": 456,
        "start_time": "14:00",
        "end_time": "14:30",
        "datetime_utc": "2025-09-15T17:00:00Z",
        "datetime_local": "2025-09-15T14:00:00-03:00",
        "duration_minutes": 30,
        "is_available": true,
        "_links": {
          "book": "/api/v2/barbers/123/appointments"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    },
    "summary": {
      "total_slots": 16,
      "available_slots": 8,
      "booked_slots": 6,
      "utilization_percentage": 37.5
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/availability/slots?date=2025-09-15&service_id=1",
    "days": "/api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-10&end_date=2025-09-20"
  }
}
```

---

### **4. Criar Agendamento**
```http
POST /api/v2/barbers/{barberId}/appointments
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Idempotency-Key: {uuid} (opcional, para evitar duplicatas)
```

**Payload:**
```json
{
  "service_id": 1,
  "slot_start_datetime": "2025-09-15T17:00:00Z",
  "customer": {
    "name": "João Silva",
    "phone": "+5511999999999",
    "email": "joao@email.com"
  },
  "notes": "Cliente prefere corte mais curto nas laterais"
}
```

**Lógica de Concorrência (Crítica):**
```sql
-- Transação com lock pessimista
BEGIN;
SELECT pg_advisory_xact_lock({barber_id});

-- Verificar slots disponíveis com FOR UPDATE
SELECT * FROM slots
WHERE id_usuario = $1
  AND start_at >= $2
  AND end_at <= $3
  AND status = 'free'
FOR UPDATE;

-- Se todos slots estiverem livres, prosseguir
INSERT INTO agendamentos (...) VALUES (...);
UPDATE slots SET status = 'booked', id_agendamento = $new_id
WHERE id_usuario = $1 AND start_at >= $2 AND end_at <= $3;

COMMIT;
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": 789,
      "barber_id": 123,
      "service_id": 1,
      "customer_id": 456,
      "start_datetime": "2025-09-15T17:00:00Z",
      "end_datetime": "2025-09-15T17:30:00Z",
      "status": "confirmed",
      "total_price": 35.00,
      "created_at": "2025-09-10T12:00:00Z",
      "notes": "Cliente prefere corte mais curto nas laterais"
    },
    "customer": {
      "id": 456,
      "name": "João Silva",
      "phone": "+5511999999999",
      "email": "joao@email.com"
    },
    "service": {
      "id": 1,
      "name": "Corte Masculino",
      "duration_minutes": 30,
      "price": 35.00
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/appointments/789",
    "cancel": "/api/v2/barbers/123/appointments/789/cancel",
    "customer": "/api/v2/barbers/123/customers/456"
  }
}
```

---

### **5. Cancelar Agendamento**
```http
POST /api/v2/barbers/{barberId}/appointments/{appointmentId}/cancel
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Payload (opcional):**
```json
{
  "reason": "Cliente não pode comparecer",
  "notify_customer": true
}
```

**Lógica Otimizada:**
```sql
BEGIN;
SELECT pg_advisory_xact_lock({barber_id});

-- Verificar se agendamento existe e pode ser cancelado
SELECT * FROM agendamentos
WHERE id_agendamento = $1
  AND id_usuario = $2
  AND status IN ('confirmed', 'pending')
FOR UPDATE;

-- Liberar slots
UPDATE slots
SET status = 'free', id_agendamento = NULL
WHERE id_agendamento = $1;

-- Atualizar agendamento
UPDATE agendamentos
SET status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = $3
WHERE id_agendamento = $1;

COMMIT;
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": 789,
      "status": "cancelled",
      "cancelled_at": "2025-09-10T12:00:00Z",
      "cancel_reason": "Cliente não pode comparecer"
    },
    "refunded_slots": 1,
    "notification_sent": true
  },
  "message": "Agendamento cancelado com sucesso",
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/appointments/789",
    "reschedule": "/api/v2/barbers/123/availability/days?service_id=1"
  }
}
```

---

## 🚨 **SISTEMA DE ERROS PADRONIZADO**

### **Estrutura Consistente:**
```json
{
  "success": false,
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "O horário selecionado não está mais disponível",
    "details": {
      "slot_datetime": "2025-09-15T17:00:00Z",
      "service_id": 1,
      "barber_id": 123
    },
    "suggestion": "Escolha outro horário disponível"
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "retry": "/api/v2/barbers/123/availability/slots?date=2025-09-15&service_id=1"
  }
}
```

### **Códigos de Erro Principais:**
- `VALIDATION_ERROR`: Dados inválidos
- `SLOT_NOT_AVAILABLE`: Horário ocupado
- `SERVICE_NOT_FOUND`: Serviço inexistente
- `BARBER_NOT_FOUND`: Barbeiro inexistente
- `RATE_LIMIT_EXCEEDED`: Limite de requisições excedido
- `CONCURRENT_BOOKING`: Conflito de concorrência
- `APPOINTMENT_NOT_FOUND`: Agendamento não encontrado
- `APPOINTMENT_CANNOT_CANCEL`: Não pode cancelar (regra de negócio)

---

## 🔒 **SEGURANÇA E PERFORMANCE**

### **Rate Limiting Granular:**
```javascript
// Por endpoint e usuário
const limits = {
  '/services': { windowMs: 60000, max: 30 },      // 30 req/min
  '/availability/days': { windowMs: 60000, max: 20 }, // 20 req/min
  '/availability/slots': { windowMs: 60000, max: 15 }, // 15 req/min
  '/appointments': { windowMs: 60000, max: 10 }   // 10 req/min
};
```

### **Cache Estratégico:**
```javascript
// Cache por entidade
const cacheConfig = {
  services: { ttl: 3600 },      // 1 hora
  availability_days: { ttl: 900 }, // 15 minutos
  availability_slots: { ttl: 300 }, // 5 minutos
  barber_config: { ttl: 1800 }  // 30 minutos
};
```

### **Validação Robusta:**
```javascript
const bookingValidation = {
  service_id: Joi.number().integer().positive().required(),
  slot_start_datetime: Joi.date().iso().required(),
  customer: {
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^\\+55\\d{10,11}$/).required(),
    email: Joi.string().email().optional()
  }
};
```

---

## 📊 **MÉTRICAS E MONITORAMENTO**

### **Endpoints de Monitoramento:**
```http
GET /api/v2/health          # Status geral
GET /api/v2/metrics         # Métricas da aplicação
GET /api/v2/barbers/{id}/stats # Estatísticas do barbeiro
```

### **Métricas Principais:**
- Taxa de sucesso de bookings
- Tempo médio de resposta por endpoint
- Taxa de conflitos de concorrência
- Utilização de cache
- Rate limiting hits

---

## 🎯 **MELHORIAS IMPLEMENTADAS**

### **1. URLs Mais Limpas:**
- `/servicos` → `/barbers/{id}/services`
- `/disponibilidade/dias` → `/availability/days`
- `/book` → `/appointments` (POST)

### **2. Versionamento:**
- Prefixo `/api/v2/` para todas as rotas
- Suporte a HATEOAS básico
- Documentação de mudanças

### **3. Paginação Inteligente:**
- Default 20 itens por página
- Links de navegação
- Metadata completa

### **4. Cache Otimizado:**
- TTL diferente por tipo de dado
- Invalidação inteligente
- Headers apropriados

### **5. Concorrência Aprimorada:**
- Locks pessimistas com `pg_advisory_xact_lock`
- Detecção de conflitos
- Retry automático (até 3 tentativas)

### **6. Validação Completa:**
- Joi schemas robustos
- Sanitização de dados
- Mensagens de erro claras

Esta API v2 é **production-ready** com foco em performance, segurança e experiência do desenvolvedor! 🚀
