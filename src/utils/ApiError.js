/**
 * Utilitário para erros padronizados da API v2
 * Implementa códigos de erro consistentes e mensagens claras
 */
class ApiError {
  constructor(code, message, statusCode = 500, details = null) {
    this.success = false;
    this.error = {
      code,
      message,
      ...(details && { details })
    };
    this.timestamp = new Date().toISOString();
    this.statusCode = statusCode;
    this._links = {};
    this.suggestion = null;
  }

  /**
   * Erro de validação (400)
   */
  static badRequest(message = 'Dados inválidos', details = null) {
    return new ApiError('VALIDATION_ERROR', message, 400, details);
  }

  /**
   * Recurso não encontrado (404)
   */
  static notFound(message = 'Recurso não encontrado', details = null) {
    return new ApiError('NOT_FOUND', message, 404, details);
  }

  /**
   * Conflito (409) - ex: slot já ocupado
   */
  static conflict(message = 'Conflito de recursos', details = null) {
    return new ApiError('CONFLICT', message, 409, details);
  }

  /**
   * Não autorizado (401)
   */
  static unauthorized(message = 'Não autorizado', details = null) {
    return new ApiError('UNAUTHORIZED', message, 401, details);
  }

  /**
   * Proibido (403)
   */
  static forbidden(message = 'Acesso proibido', details = null) {
    return new ApiError('FORBIDDEN', message, 403, details);
  }

  /**
   * Rate limit excedido (429)
   */
  static rateLimit(message = 'Muitas requisições', details = null) {
    return new ApiError('RATE_LIMIT_EXCEEDED', message, 429, details);
  }

  /**
   * Erro interno (500)
   */
  static internal(message = 'Erro interno do servidor', details = null) {
    return new ApiError('INTERNAL_ERROR', message, 500, details);
  }

  /**
   * Serviço indisponível (503)
   */
  static serviceUnavailable(message = 'Serviço temporariamente indisponível', details = null) {
    return new ApiError('SERVICE_UNAVAILABLE', message, 503, details);
  }

  /**
   * Adiciona detalhes ao erro
   */
  withDetails(details) {
    this.error.details = { ...this.error.details, ...details };
    return this;
  }

  /**
   * Adiciona links HATEOAS
   */
  withLinks(links) {
    this._links = { ...this._links, ...links };
    return this;
  }

  /**
   * Adiciona sugestão de correção
   */
  withSuggestion(suggestion) {
    this.suggestion = suggestion;
    return this;
  }

  /**
   * Envia resposta HTTP
   */
  send(res) {
    const responseBody = {
      success: this.success,
      error: this.error,
      timestamp: this.timestamp,
      ...(Object.keys(this._links).length > 0 && { _links: this._links }),
      ...(this.suggestion && { suggestion: this.suggestion })
    };

    return res.status(this.statusCode).json(responseBody);
  }

  /**
   * Converte para Error padrão
   */
  toError() {
    const error = new Error(this.error.message);
    error.code = this.error.code;
    error.statusCode = this.statusCode;
    error.details = this.error.details;
    return error;
  }

  /**
   * Códigos de erro comuns
   */
  static get CODES() {
    return {
      // Validação
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
      INVALID_FORMAT: 'INVALID_FORMAT',

      // Autenticação/Autorização
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
      DATABASE_ERROR: 'DATABASE_ERROR',

      // WhatsApp
      WHATSAPP_ERROR: 'WHATSAPP_ERROR',
      WHATSAPP_UNAVAILABLE: 'WHATSAPP_UNAVAILABLE',
      MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED'
    };
  }
}

module.exports = { ApiError };
