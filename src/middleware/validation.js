const Joi = require('joi');

/**
 * Middleware de validação usando Joi
 */

// Schema para usuário
const usuarioSchema = Joi.object({
  nome: Joi.string().min(2).max(100).required(),
  whatsapp: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
  timezone: Joi.string().default('America/Sao_Paulo'),
  config_horarios: Joi.array().items(
    Joi.object({
      dia: Joi.number().min(0).max(6).required(),
      inicio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      fim: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })
  ).default([]),
  intervalo_min: Joi.number().min(5).max(120).default(15),
  max_advance_days: Joi.number().min(1).max(365).default(60)
});

// Schema para login
const loginSchema = Joi.object({
  whatsapp: Joi.string().pattern(/^\+?\d{10,15}$/),
  email: Joi.string().email(),
  password: Joi.string().min(6).required(),
  tenantId: Joi.number().integer().positive()
}).or('whatsapp', 'email'); // Pelo menos um dos campos deve estar presente

// Schema para registro
const registerSchema = Joi.object({
  nome: Joi.string().min(2).max(100).required(),
  whatsapp: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
  password: Joi.string().min(6).required(),
  tenantId: Joi.number().integer().positive().required(),
  timezone: Joi.string().default('America/Sao_Paulo'),
  config_horarios: Joi.array().items(
    Joi.object({
      dia: Joi.number().min(0).max(6).required(),
      inicio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      fim: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })
  ).default([]),
  intervalo_min: Joi.number().min(5).max(120).default(15),
  max_advance_days: Joi.number().min(1).max(365).default(60)
});

// Schema para alteração de senha
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required()
});

// Schema para serviço
const servicoSchema = Joi.object({
  // id_usuario vem do token; não deve ser enviado pelo cliente
  nome_servico: Joi.string().min(2).max(100).required(),
  duracao_min: Joi.number().integer().min(5).max(480).required(),
  valor: Joi.number().precision(2).min(0).required(),
  descricao: Joi.string().max(500).allow('').optional(),
  ativo: Joi.boolean().default(true).optional()
});

// Schema para cliente
const clienteSchema = Joi.object({
  // id_usuario será atribuído no servidor a partir do token (não deve vir no body)
  nome: Joi.string().min(1).max(100).required(),
  whatsapp: Joi.string().pattern(/^\+?\d{10,15}$/).required(),
  email: Joi.string().email().optional().allow(''),
  observacoes: Joi.string().max(500).optional().allow('')
});

// Schema para tenant
const tenantSchema = Joi.object({
  nome_tenant: Joi.string().min(2).max(100).required(),
  dominio: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/, 'domínio válido').required(),
  status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
  config_tenant: Joi.object().default({})
});

// Schema para agendamento
const agendamentoSchema = Joi.object({
  // id_usuario vem do token; não deve ser enviado pelo cliente
  id_cliente: Joi.number().integer().positive().required(),
  id_servico: Joi.number().integer().positive().required(),
  start_at: Joi.date().iso().required(),
  status: Joi.string().valid('confirmed', 'cancelled', 'completed').default('confirmed')
});

// Middleware de validação
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors
      });
    }

    req.body = value; // Substituir pelos dados validados
    next();
  };
};

// Validações específicas
const validateUsuario = validate(usuarioSchema);
const validateLogin = validate(loginSchema);
const validateRegister = validate(registerSchema);
const validateChangePassword = validate(changePasswordSchema);
const validateServico = validate(servicoSchema);
const validateCliente = validate(clienteSchema);
const validateTenant = validate(tenantSchema);
const validateAgendamento = validate(agendamentoSchema);

// Middleware para validar parâmetros de rota
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }

  req.params.id = id;
  next();
};

// Middleware para validar query parameters de paginação
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  const pageNum = page ? parseInt(page) : 1;
  const limitNum = limit ? parseInt(limit) : 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Parâmetros de paginação inválidos'
    });
  }

  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };

  next();
};

module.exports = {
  validateUsuario,
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateServico,
  validateCliente,
  validateTenant,
  validateAgendamento,
  validateId,
  validatePagination,
  validate
};
