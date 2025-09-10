/**
 * Constantes Centralizadas - Evita Duplicação de Valores
 * Principio: Single Source of Truth
 */

// ====================
// CONFIGURAÇÕES GERAIS
// ====================
const CONFIG = {
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
  REQUEST_LIMIT: '10mb',
  MAX_PAGE_SIZE: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_SIMILAR_MESSAGES: 3,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  QUEUE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutos
  MAX_QUEUE_SIZE: 10,
  CONVERSATION_TIMEOUT: 1800000, // 30 minutos
};

// ====================
// STATUS E ESTADOS
// ====================
const STATUS = {
  APPOINTMENT: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  },
  SLOT: {
    FREE: 'free',
    BOOKED: 'booked'
  },
  SERVICE: {
    ACTIVE: true,
    INACTIVE: false
  },
  USER: {
    ACTIVE: true,
    INACTIVE: false,
    TYPE: {
      BARBER: 'barbeiro',
      ADMIN: 'admin'
    }
  }
};

// ====================
// CÓDIGOS DE ERRO PADRONIZADOS
// ====================
const ERROR_CODES = {
  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Autenticação
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Recursos
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Agendamentos específicos
  SLOT_NOT_AVAILABLE: 'SLOT_NOT_AVAILABLE',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_CANNOT_CANCEL: 'APPOINTMENT_CANNOT_CANCEL',
  CONCURRENT_BOOKING: 'CONCURRENT_BOOKING',

  // Sistema
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

// ====================
// LIMITES DE RATE LIMITING
// ====================
const RATE_LIMITS = {
  '/services': { windowMs: 60000, max: 30 },
  '/availability/days': { windowMs: 60000, max: 20 },
  '/availability/slots': { windowMs: 60000, max: 15 },
  '/appointments': { windowMs: 60000, max: 5 }
};

// ====================
// CONFIGURAÇÕES DE CACHE
// ====================
const CACHE_CONFIG = {
  services: { ttl: 3600 },      // 1 hora
  availability_days: { ttl: 900 }, // 15 minutos
  availability_slots: { ttl: 300 }, // 5 minutos
  barber_config: { ttl: 1800 }  // 30 minutos
};

// ====================
// REGEX PATTERNS COMUNS
// ====================
const REGEX = {
  PHONE_BR: /^\+55\d{10,11}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  TIMEZONE: /^[A-Za-z]+\/[A-Za-z_]+$/
};

// ====================
// MENSAGENS PADRONIZADAS
// ====================
const MESSAGES = {
  SUCCESS: {
    APPOINTMENT_CREATED: 'Agendamento criado com sucesso',
    APPOINTMENT_CANCELLED: 'Agendamento cancelado com sucesso',
    APPOINTMENT_UPDATED: 'Agendamento atualizado com sucesso',
    CACHE_CLEARED: 'Cache limpo com sucesso',
    DATA_RETRIEVED: 'Dados encontrados'
  },
  ERROR: {
    SLOT_NOT_AVAILABLE: 'O horário selecionado não está mais disponível',
    SERVICE_NOT_FOUND: 'Serviço não encontrado',
    APPOINTMENT_NOT_FOUND: 'Agendamento não encontrado',
    APPOINTMENT_CANNOT_CANCEL: 'Este agendamento não pode ser cancelado',
    CONCURRENT_BOOKING: 'Conflito de concorrência detectado',
    VALIDATION_FAILED: 'Dados inválidos fornecidos'
  },
  SUGGESTION: {
    RETRY_WITH_DIFFERENT_SLOT: 'Escolha outro horário disponível',
    CHECK_AVAILABILITY: 'Verifique a disponibilidade atual',
    CONTACT_SUPPORT: 'Entre em contato com o suporte'
  }
};

// ====================
// CONFIGURAÇÕES DE BANCO
// ====================
const DB_CONFIG = {
  MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
  IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  ACQUIRE_TIMEOUT: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000
};

// ====================
// PAGINAÇÃO PADRÃO
// ====================
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 50,
  MIN_LIMIT: 1
};

module.exports = {
  CONFIG,
  STATUS,
  ERROR_CODES,
  RATE_LIMITS,
  CACHE_CONFIG,
  REGEX,
  MESSAGES,
  DB_CONFIG,
  PAGINATION_DEFAULTS
};
