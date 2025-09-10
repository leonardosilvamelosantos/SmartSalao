/**
 * Utilitários de Validação - Elimina Duplicação de Validações
 * Centraliza regras de negócio e validações comuns
 */
const { REGEX, CONFIG } = require('../constants');
const { ApiError } = require('./ApiError');

/**
 * Validações de parâmetros de entrada
 */
class ParameterValidation {
  /**
   * Valida ID numérico positivo
   */
  static validateId(id, fieldName = 'ID') {
    const numId = parseInt(id);
    if (isNaN(numId) || numId < 1) {
      throw ApiError.badRequest(`${fieldName} deve ser um número inteiro positivo`);
    }
    return numId;
  }

  /**
   * Valida paginação
   */
  static validatePagination(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || CONFIG.DEFAULT_PAGE_SIZE, CONFIG.MAX_PAGE_SIZE);

    if (pageNum < 1) {
      throw ApiError.badRequest('Página deve ser maior que 0');
    }

    if (limitNum < 1 || limitNum > CONFIG.MAX_PAGE_SIZE) {
      throw ApiError.badRequest(`Limite deve estar entre 1 e ${CONFIG.MAX_PAGE_SIZE}`);
    }

    return { page: pageNum, limit: limitNum };
  }

  /**
   * Valida dados do cliente
   */
  static validateCustomer(customer) {
    if (!customer || typeof customer !== 'object') {
      throw ApiError.badRequest('Dados do cliente são obrigatórios');
    }

    const { name, phone, email } = customer;

    // Nome
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw ApiError.badRequest('Nome do cliente deve ter pelo menos 2 caracteres');
    }

    // Telefone
    if (!phone || !REGEX.PHONE_BR.test(phone)) {
      throw ApiError.badRequest('Telefone deve estar no formato +55XXXXXXXXXX');
    }

    // Email (opcional)
    if (email && !REGEX.EMAIL.test(email)) {
      throw ApiError.badRequest('Email deve ter um formato válido');
    }

    return {
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : null
    };
  }

  /**
   * Valida dados do agendamento
   */
  static validateAppointment(appointment) {
    const { service_id, slot_start_datetime, customer, notes } = appointment;

    if (!service_id) {
      throw ApiError.badRequest('ID do serviço é obrigatório');
    }

    if (!slot_start_datetime) {
      throw ApiError.badRequest('Data/hora do slot é obrigatória');
    }

    // Valida formato da data
    const slotDate = new Date(slot_start_datetime);
    if (isNaN(slotDate.getTime())) {
      throw ApiError.badRequest('Data/hora deve estar em formato ISO válido');
    }

    // Valida se não é no passado
    const now = new Date();
    if (slotDate <= now) {
      throw ApiError.badRequest('Data/hora deve ser no futuro');
    }

    // Valida se não é muito distante (máx 90 dias)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    if (slotDate > maxDate) {
      throw ApiError.badRequest('Data/hora não pode ser mais de 90 dias no futuro');
    }

    return {
      service_id: this.validateId(service_id, 'ID do serviço'),
      slot_start_datetime: slot_start_datetime.trim(),
      customer: this.validateCustomer(customer),
      notes: notes ? notes.trim().substring(0, 500) : null
    };
  }

  /**
   * Valida filtros de data
   */
  static validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw ApiError.badRequest('Datas de início e fim são obrigatórias');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ApiError.badRequest('Datas devem estar em formato válido');
    }

    if (start > end) {
      throw ApiError.badRequest('Data de início deve ser anterior à data de fim');
    }

    // Máximo 30 dias
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      throw ApiError.badRequest('Período máximo de 30 dias excedido');
    }

    return { startDate: startDate.trim(), endDate: endDate.trim() };
  }

  /**
   * Valida timezone
   */
  static validateTimezone(timezone) {
    if (timezone && !REGEX.TIMEZONE.test(timezone)) {
      throw ApiError.badRequest('Timezone deve ter formato válido (Ex: America/Sao_Paulo)');
    }
    return timezone || CONFIG.DEFAULT_TIMEZONE;
  }
}

/**
 * Validações de regras de negócio
 */
class BusinessValidation {
  /**
   * Valida se agendamento pode ser cancelado
   */
  static canCancelAppointment(appointment, currentTime = new Date()) {
    // Verifica status
    if (appointment.status === 'cancelled') {
      const error = new Error('Agendamento já foi cancelado');
      error.code = 'APPOINTMENT_CANNOT_CANCEL';
      error.details = 'Agendamento já está cancelado';
      throw error;
    }

    if (appointment.status === 'completed') {
      const error = new Error('Não é possível cancelar agendamento já realizado');
      error.code = 'APPOINTMENT_CANNOT_CANCEL';
      error.details = 'Agendamento já foi realizado';
      throw error;
    }

    // Verifica tempo mínimo (2 horas antes)
    const appointmentTime = new Date(appointment.start_at);
    const hoursUntilAppointment = (appointmentTime - currentTime) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2) {
      const error = new Error('Cancelamento deve ser feito com pelo menos 2 horas de antecedência');
      error.code = 'APPOINTMENT_CANNOT_CANCEL';
      error.details = `Faltam ${hoursUntilAppointment.toFixed(1)} horas para o agendamento`;
      throw error;
    }

    return true;
  }

  /**
   * Valida se slots estão disponíveis
   */
  static validateSlotAvailability(availableSlots, requiredSlots) {
    if (availableSlots.length < requiredSlots) {
      const error = new Error('Slots necessários não estão disponíveis');
      error.code = 'SLOT_NOT_AVAILABLE';
      error.details = {
        required_slots: requiredSlots,
        available_slots: availableSlots.length
      };
      throw error;
    }
  }

  /**
   * Valida idempotency key
   */
  static validateIdempotencyKey(key) {
    if (key && (typeof key !== 'string' || key.length < 10)) {
      throw ApiError.badRequest('Idempotency key deve ter pelo menos 10 caracteres');
    }
    return key;
  }
}

/**
 * Sanitização de dados
 */
class DataSanitization {
  /**
   * Sanitiza string
   */
  static sanitizeString(str, maxLength = null) {
    if (!str) return null;
    let sanitized = str.trim();
    if (maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  }

  /**
   * Sanitiza email
   */
  static sanitizeEmail(email) {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  /**
   * Sanitiza telefone
   */
  static sanitizePhone(phone) {
    if (!phone) return null;
    // Remove todos os caracteres não numéricos exceto +
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Sanitiza dados do cliente
   */
  static sanitizeCustomer(customer) {
    if (!customer) return null;

    return {
      name: this.sanitizeString(customer.name, 100),
      phone: this.sanitizePhone(customer.phone),
      email: this.sanitizeEmail(customer.email)
    };
  }
}

/**
 * Validações de segurança
 */
class SecurityValidation {
  /**
   * Valida tamanho de entrada para prevenir ataques
   */
  static validateInputSize(input, fieldName, maxSize = 1000) {
    if (input && input.length > maxSize) {
      throw ApiError.badRequest(`${fieldName} excede o tamanho máximo de ${maxSize} caracteres`);
    }
  }

  /**
   * Valida caracteres especiais
   */
  static validateNoSpecialChars(input, fieldName) {
    const specialChars = /[<>'"&]/;
    if (input && specialChars.test(input)) {
      throw ApiError.badRequest(`${fieldName} contém caracteres especiais não permitidos`);
    }
  }

  /**
   * Valida SQL injection patterns
   */
  static validateNoSQLInjection(input, fieldName) {
    const sqlPatterns = /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i;
    if (input && sqlPatterns.test(input)) {
      throw ApiError.badRequest(`${fieldName} contém padrões não permitidos`);
    }
  }
}

module.exports = {
  ParameterValidation,
  BusinessValidation,
  DataSanitization,
  SecurityValidation
};
