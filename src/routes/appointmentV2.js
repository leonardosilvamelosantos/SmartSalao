/**
 * Rotas da API v2 - Agendamentos Otimizados
 * Endpoints REST com foco em performance e concorrência
 */
const express = require('express');
const router = express.Router();
const AppointmentControllerV2 = require('../controllers/AppointmentControllerV2');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// ====================
// MIDDLEWARE DE RATE LIMITING
// ====================

// Rate limiting por barbeiro (mais permissivo para leituras)
// Temporariamente removido por problema de IPv6
// const barberRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: (req) => {
//     // Limites diferentes por endpoint
//     const path = req.path;
//     if (path.includes('/availability/days')) return 30; // 30 req/15min
//     if (path.includes('/availability/slots')) return 20; // 20 req/15min
//     if (path.includes('/appointments') && req.method === 'GET') return 50; // 50 req/15min
    //     return 10; // Default: 10 req/15min
//   }
// });

// Rate limiting mais restritivo para operações de escrita
const writeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 operações de escrita por minuto
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas operações de escrita. Aguarde um minuto.'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ====================
// VALIDAÇÃO DE PARÂMETROS
// ====================

const { body, param, query } = require('express-validator');

// Validação para criação de agendamento
const validateCreateAppointment = [
  param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro deve ser um número inteiro positivo'),

  body('service_id').isInt({ min: 1 }).withMessage('ID do serviço é obrigatório'),

  body('slot_start_datetime')
    .isISO8601()
    .withMessage('Data/hora deve estar no formato ISO 8601')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 90); // Máximo 90 dias no futuro

      if (date <= now) {
        throw new Error('Data/hora deve ser no futuro');
      }

      if (date > maxFuture) {
        throw new Error('Data/hora não pode ser mais de 90 dias no futuro');
      }

      return true;
    }),

  body('customer')
    .isObject()
    .withMessage('Dados do cliente são obrigatórios'),

  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do cliente deve ter entre 2 e 100 caracteres'),

  body('customer.phone')
    .matches(/^\+55\d{10,11}$/)
    .withMessage('Telefone deve estar no formato +55XXXXXXXXXX'),

  body('customer.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações não podem exceder 500 caracteres')
];

// Validação para cancelamento
const validateCancelAppointment = [
  param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro deve ser um número inteiro positivo'),
  param('appointmentId').isInt({ min: 1 }).withMessage('ID do agendamento deve ser um número inteiro positivo'),

  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Motivo não pode exceder 200 caracteres'),

  body('notify_customer')
    .optional()
    .isBoolean()
    .withMessage('Notificar cliente deve ser true ou false')
];

// ====================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ====================

// Serviços disponíveis (pode ser público para clientes verem)
router.get('/barbers/:barberId/services',
  // barberRateLimit, // Temporariamente removido
  [
    param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro inválido'),
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50'),
    query('active').optional().isBoolean().withMessage('Ativo deve ser true ou false')
  ],
  AppointmentControllerV2.getServices
);

// Dias disponíveis
router.get('/barbers/:barberId/availability/days',
  // barberRateLimit, // Temporariamente removido
  [
    param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro inválido'),
    query('service_id').isInt({ min: 1 }).withMessage('ID do serviço é obrigatório'),
    query('start_date').isISO8601().withMessage('Data inicial deve estar no formato YYYY-MM-DD'),
    query('end_date').isISO8601().withMessage('Data final deve estar no formato YYYY-MM-DD'),
    query('timezone').optional().isString().withMessage('Timezone deve ser uma string')
  ],
  AppointmentControllerV2.getAvailableDays
);

// Horários disponíveis
router.get('/barbers/:barberId/availability/slots',
  // barberRateLimit, // Temporariamente removido
  [
    param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro inválido'),
    query('service_id').isInt({ min: 1 }).withMessage('ID do serviço é obrigatório'),
    query('date').isISO8601().withMessage('Data deve estar no formato YYYY-MM-DD'),
    query('timezone').optional().isString().withMessage('Timezone deve ser uma string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limite deve ser entre 1 e 20')
  ],
  AppointmentControllerV2.getAvailableSlots
);

// ====================
// ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
// ====================

// Middleware de autenticação para rotas protegidas
router.use('/barbers/:barberId/appointments', authenticateToken);

// Criar agendamento
router.post('/barbers/:barberId/appointments',
  writeRateLimit,
  validateCreateAppointment,
  AppointmentControllerV2.createAppointment
);

// Cancelar agendamento
router.post('/barbers/:barberId/appointments/:appointmentId/cancel',
  writeRateLimit,
  validateCancelAppointment,
  AppointmentControllerV2.cancelAppointment
);

// Listar agendamentos (admin)
router.get('/barbers/:barberId/appointments',
  // barberRateLimit, // Temporariamente removido
  [
    param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro inválido'),
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50'),
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Status inválido'),
    query('start_date').optional().isISO8601().withMessage('Data inicial deve estar no formato YYYY-MM-DD'),
    query('end_date').optional().isISO8601().withMessage('Data final deve estar no formato YYYY-MM-DD')
  ],
  AppointmentControllerV2.getAppointments
);

// Detalhes de agendamento específico
router.get('/barbers/:barberId/appointments/:appointmentId',
  // barberRateLimit, // Temporariamente removido
  [
    param('barberId').isInt({ min: 1 }).withMessage('ID do barbeiro inválido'),
    param('appointmentId').isInt({ min: 1 }).withMessage('ID do agendamento inválido')
  ],
  AppointmentControllerV2.getAppointment
);

// ====================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ====================

// Middleware para tratar erros de validação
const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

// Tratamento de erros de validação
router.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return ApiError.badRequest('Dados inválidos', { fields: errorMessages }).send(res);
  }
  next();
});

// Tratamento de erros gerais
router.use((error, req, res, next) => {
  console.error('Erro na rota de agendamentos v2:', error);

  // Erros de validação do Joi/express-validator já foram tratados acima
  if (error.name === 'ValidationError') {
    return ApiError.badRequest('Dados inválidos', error.details).send(res);
  }

  // Erros customizados com código
  if (error.code) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      },
      timestamp: new Date().toISOString()
    });
  }

  // Erro interno genérico
  return ApiError.internal('Erro interno do servidor').send(res);
});

module.exports = router;
