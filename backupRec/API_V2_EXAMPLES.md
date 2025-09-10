# 📋 Exemplos Práticos - API v2 Otimizada

## 🎯 **EXEMPLOS DE USO REAL**

### **Cenário: Cliente quer agendar um corte**

---

## 1. **Buscar Serviços Disponíveis**

```http
GET /api/v2/barbers/123/services?page=1&limit=10&active=true
```

**Resposta:**
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
        "created_at": "2025-01-01T00:00:00Z",
        "total_appointments": 45
      },
      {
        "id": 2,
        "name": "Barba",
        "duration_minutes": 20,
        "price": 25.00,
        "description": "Aparação e modelagem de barba",
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z",
        "total_appointments": 32
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/services?page=1&limit=10&active=true"
  }
}
```

---

## 2. **Ver Dias Disponíveis para o Serviço**

```http
GET /api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-15&end_date=2025-09-21&timezone=America/Sao_Paulo
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "barber_id": 123,
    "service_id": 1,
    "timezone": "America/Sao_Paulo",
    "available_days": [
      {
        "date": "2025-09-16",
        "weekday": "Terça-feira",
        "display_name": "Ter 16/09",
        "available_slots": 6,
        "time_range": "09:00 - 18:00",
        "_links": {
          "slots": "/api/v2/barbers/123/availability/slots?date=2025-09-16&service_id=1"
        }
      },
      {
        "date": "2025-09-17",
        "weekday": "Quarta-feira",
        "display_name": "Qua 17/09",
        "available_slots": 8,
        "time_range": "09:00 - 18:00",
        "_links": {
          "slots": "/api/v2/barbers/123/availability/slots?date=2025-09-17&service_id=1"
        }
      }
    ],
    "period": {
      "start_date": "2025-09-15",
      "end_date": "2025-09-21",
      "total_days_checked": 7,
      "days_with_availability": 2
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "_links": {
    "self": "/api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-15&end_date=2025-09-21",
    "service": "/api/v2/barbers/123/services/1"
  }
}
```

---

## 3. **Ver Horários Disponíveis no Dia Escolhido**

```http
GET /api/v2/barbers/123/availability/slots?service_id=1&date=2025-09-17&timezone=America/Sao_Paulo&page=1&limit=10
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "barber_id": 123,
    "service_id": 1,
    "date": "2025-09-17",
    "timezone": "America/Sao_Paulo",
    "available_slots": [
      {
        "slot_id": 456,
        "start_time": "09:00",
        "end_time": "09:30",
        "datetime_utc": "2025-09-17T12:00:00Z",
        "datetime_local": "2025-09-17T09:00:00-03:00",
        "duration_minutes": 30,
        "is_available": true,
        "_links": {
          "book": "/api/v2/barbers/123/appointments"
        }
      },
      {
        "slot_id": 457,
        "start_time": "09:30",
        "end_time": "10:00",
        "datetime_utc": "2025-09-17T12:30:00Z",
        "datetime_local": "2025-09-17T09:30:00-03:00",
        "duration_minutes": 30,
        "is_available": true,
        "_links": {
          "book": "/api/v2/barbers/123/appointments"
        }
      },
      {
        "slot_id": 458,
        "start_time": "14:00",
        "end_time": "14:30",
        "datetime_utc": "2025-09-17T17:00:00Z",
        "datetime_local": "2025-09-17T14:00:00-03:00",
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
    "self": "/api/v2/barbers/123/availability/slots?date=2025-09-17&service_id=1&page=1&limit=10",
    "days": "/api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-17&end_date=2025-09-17"
  }
}
```

---

## 4. **Criar Agendamento**

```http
POST /api/v2/barbers/123/appointments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Idempotency-Key: abc-123-def-456
```

**Payload:**
```json
{
  "service_id": 1,
  "slot_start_datetime": "2025-09-17T17:00:00Z",
  "customer": {
    "name": "João Silva Santos",
    "phone": "+5511999999999",
    "email": "joao.silva@email.com"
  },
  "notes": "Cliente prefere corte mais curto nas laterais"
}
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
      "start_datetime": "2025-09-17T17:00:00Z",
      "end_datetime": "2025-09-17T17:30:00Z",
      "status": "confirmed",
      "total_price": 35.00,
      "created_at": "2025-09-10T12:00:00Z",
      "notes": "Cliente prefere corte mais curto nas laterais"
    },
    "customer": {
      "id": 456,
      "name": "João Silva Santos",
      "phone": "+5511999999999",
      "email": "joao.silva@email.com"
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

## 5. **Cancelar Agendamento**

```http
POST /api/v2/barbers/123/appointments/789/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Payload:**
```json
{
  "reason": "Cliente não pode comparecer devido a compromisso inadiável",
  "notify_customer": true
}
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
      "cancel_reason": "Cliente não pode comparecer devido a compromisso inadiável"
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

## 🚨 **EXEMPLOS DE ERROS**

### **Slot Não Disponível (409):**
```http
POST /api/v2/barbers/123/appointments
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "O horário selecionado não está mais disponível",
    "details": {
      "slot_datetime": "2025-09-17T17:00:00Z",
      "service_id": 1,
      "barber_id": 123
    }
  },
  "timestamp": "2025-09-10T12:00:00Z",
  "suggestion": "Escolha outro horário disponível",
  "_links": {
    "retry": "/api/v2/barbers/123/availability/slots?date=2025-09-17&service_id=1"
  }
}
```

### **Dados Inválidos (400):**
```http
GET /api/v2/barbers/123/availability/days?service_id=abc&start_date=2025-09-15
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {
      "fields": [
        "service_id deve ser um número inteiro positivo",
        "end_date é obrigatório"
      ]
    }
  },
  "timestamp": "2025-09-10T12:00:00Z"
}
```

### **Rate Limit Excedido (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Muitas requisições. Tente novamente em alguns minutos."
  },
  "timestamp": "2025-09-10T12:00:00Z"
}
```

---

## 🔧 **TESTES COM CURL**

### **Buscar Serviços:**
```bash
curl -X GET "http://localhost:3000/api/v2/barbers/123/services?page=1&limit=5" \
  -H "Accept: application/json"
```

### **Ver Dias Disponíveis:**
```bash
curl -X GET "http://localhost:3000/api/v2/barbers/123/availability/days?service_id=1&start_date=2025-09-15&end_date=2025-09-21" \
  -H "Accept: application/json"
```

### **Ver Horários Disponíveis:**
```bash
curl -X GET "http://localhost:3000/api/v2/barbers/123/availability/slots?service_id=1&date=2025-09-17" \
  -H "Accept: application/json"
```

### **Criar Agendamento:**
```bash
curl -X POST "http://localhost:3000/api/v2/barbers/123/appointments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Idempotency-Key: test-123" \
  -d '{
    "service_id": 1,
    "slot_start_datetime": "2025-09-17T17:00:00Z",
    "customer": {
      "name": "João Silva",
      "phone": "+5511999999999",
      "email": "joao@email.com"
    },
    "notes": "Cliente prefere corte curto"
  }'
```

### **Cancelar Agendamento:**
```bash
curl -X POST "http://localhost:3000/api/v2/barbers/123/appointments/789/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reason": "Cliente não pode comparecer",
    "notify_customer": true
  }'
```

---

## 📊 **MÉTRICAS DE PERFORMANCE**

### **Tempos de Resposta Esperados:**
- **GET /services**: < 100ms (com cache)
- **GET /availability/days**: < 200ms (com cache)
- **GET /availability/slots**: < 150ms (com cache)
- **POST /appointments**: < 500ms (com transações)
- **POST /cancel**: < 300ms (com transações)

### **Rate Limits por Endpoint:**
- **Serviços**: 30 req/15min
- **Dias disponíveis**: 20 req/15min
- **Horários disponíveis**: 15 req/15min
- **Criar agendamento**: 5 req/min
- **Cancelar agendamento**: 5 req/min

### **Cache TTL:**
- **Serviços**: 1 hora
- **Dias disponíveis**: 15 minutos
- **Horários disponíveis**: 5 minutos
- **Agendamentos**: Não cacheado (dados dinâmicos)

---

## 🎯 **DIFERENÇAS DA API v1**

| Aspecto | API v1 | API v2 |
|---------|--------|--------|
| **URLs** | `/api/servicos` | `/api/v2/barbers/{id}/services` |
| **Paginação** | Básica | Completa com HATEOAS |
| **Cache** | Nenhum | Redis/Memory inteligente |
| **Rate Limiting** | Global | Granular por endpoint |
| **Validação** | Básica | Express-validator robusta |
| **Erros** | Genéricos | Padronizados com códigos |
| **Links** | Nenhum | HATEOAS completo |
| **Concorrência** | Básica | Locks pessimistas |
| **Idempotency** | Não | Suporte completo |

Esta API v2 é **production-ready** com foco em **performance**, **segurança** e **experiência do desenvolvedor**! 🚀✨
