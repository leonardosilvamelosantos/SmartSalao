/**
 * Utilitário para respostas padronizadas da API v2
 * Implementa convenções REST consistentes
 */
class ApiResponse {
  constructor(success, data = null, message = '', timestamp = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = timestamp || new Date().toISOString();
    this._links = {};
  }

  /**
   * Resposta de sucesso
   */
  static success(data, message = '') {
    return new ApiResponse(true, data, message);
  }

  /**
   * Resposta de criação (201)
   */
  static created(data, message = 'Recurso criado com sucesso') {
    const response = new ApiResponse(true, data, message);
    response.statusCode = 201;
    return response;
  }

  /**
   * Resposta sem conteúdo (204)
   */
  static noContent(message = 'Operação realizada com sucesso') {
    const response = new ApiResponse(true, null, message);
    response.statusCode = 204;
    return response;
  }

  /**
   * Adiciona links HATEOAS
   */
  withLinks(links) {
    this._links = { ...this._links, ...links };
    return this;
  }

  /**
   * Adiciona metadados extras
   */
  withMeta(meta) {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  /**
   * Adiciona paginação
   */
  withPagination(pagination) {
    this.pagination = pagination;
    return this;
  }

  /**
   * Envia resposta HTTP
   */
  send(res) {
    const statusCode = this.statusCode || (this.success ? 200 : 500);

    const responseBody = {
      success: this.success,
      ...(this.data !== null && { data: this.data }),
      ...(this.message && { message: this.message }),
      ...(Object.keys(this._links).length > 0 && { _links: this._links }),
      ...(this.meta && { meta: this.meta }),
      ...(this.pagination && { pagination: this.pagination }),
      timestamp: this.timestamp
    };

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Converte para objeto simples
   */
  toObject() {
    const obj = {
      success: this.success,
      timestamp: this.timestamp
    };

    if (this.data !== null) obj.data = this.data;
    if (this.message) obj.message = this.message;
    if (Object.keys(this._links).length > 0) obj._links = this._links;
    if (this.meta) obj.meta = this.meta;
    if (this.pagination) obj.pagination = this.pagination;

    return obj;
  }
}

module.exports = { ApiResponse };
