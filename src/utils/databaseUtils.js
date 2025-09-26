/**
 * Utilitários de Banco de Dados - PostgreSQL Exclusivo
 * Principios: DRY, Single Responsibility, Abstraction
 */
const pool = require('../config/postgresql');
const { DB_CONFIG } = require('../constants');

/**
 * Classe para gerenciamento de transações
 * Elimina duplicação de BEGIN/COMMIT/ROLLBACK
 */
class TransactionManager {
  constructor() {
    this.client = null;
  }

  /**
   * Inicia uma nova transação
   */
  async begin() {
    this.client = await pool.connect();
    await this.client.query('BEGIN');
    return this.client;
  }

  /**
   * Aplica lock pessimista por barbeiro
   */
  async acquireBarberLock(barberId) {
    // PostgreSQL: usar advisory lock para garantir exclusividade
    await this.client.query('SELECT pg_advisory_xact_lock($1)', [barberId]);
    console.log(`🔒 Lock adquirido para barbeiro ${barberId}`);
  }

  /**
   * Commite a transação
   */
  async commit() {
    if (this.client) {
      await this.client.query('COMMIT');
    }
  }

  /**
   * Faz rollback da transação
   */
  async rollback() {
    if (this.client) {
      await this.client.query('ROLLBACK');
    }
  }

  /**
   * Libera a conexão
   */
  release() {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Executa uma função dentro de uma transação
   */
  async executeInTransaction(operation, barberId = null) {
    try {
      await this.begin();

      if (barberId) {
        await this.acquireBarberLock(barberId);
      }

      const result = await operation(this.client);
      await this.commit();

      return result;

    } catch (error) {
      await this.rollback();
      throw error;
    } finally {
      this.release();
    }
  }

  /**
   * Executa múltiplas operações em uma transação
   */
  async executeMultipleInTransaction(operations, barberId = null) {
    return this.executeInTransaction(async (client) => {
      const results = [];

      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }

      return results;
    }, barberId);
  }
}

/**
 * Classe para queries comuns de validação
 * Elimina duplicação de queries de verificação
 */
class ValidationQueries {
  /**
   * Verifica se serviço existe e está ativo
   */
  static async validateService(barberId, serviceId) {
    const query = `
      SELECT id_servico, nome_servico, duracao_min, valor, ativo
      FROM servicos
      WHERE id_usuario = $1 AND id_servico = $2 AND ativo = true
    `;

    const result = await pool.query(query, [barberId, serviceId]);

    if (result.rows.length === 0) {
      const error = new Error('Serviço não encontrado ou inativo');
      error.code = 'SERVICE_NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  /**
   * Verifica se cliente existe ou cria novo
   */
  static async getOrCreateCustomer(barberId, customerData) {
    const { name, phone, email } = customerData;

    // Tenta encontrar cliente existente
    const existingQuery = `
      SELECT id_cliente, nome, whatsapp, email
      FROM clientes
      WHERE id_usuario = $1 AND whatsapp = $2
    `;

    let result = await pool.query(existingQuery, [barberId, phone]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Cria novo cliente
    const createQuery = `
      INSERT INTO clientes (id_usuario, nome, whatsapp, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id_cliente, nome, whatsapp
    `;

    result = await pool.query(createQuery, [barberId, name, phone]);
    return result.rows[0];
  }

  /**
   * Verifica se agendamento existe
   */
  static async validateAppointment(barberId, appointmentId) {
    const query = `
      SELECT a.*, s.nome_servico, s.duracao_min, c.nome as cliente_nome
      FROM agendamentos a
      JOIN servicos s ON a.id_servico = s.id_servico
      JOIN clientes c ON a.id_cliente = c.id_cliente
      WHERE a.id_agendamento = $1 AND a.id_usuario = $2
    `;

    const result = await pool.query(query, [appointmentId, barberId]);

    if (result.rows.length === 0) {
      const error = new Error('Agendamento não encontrado');
      error.code = 'APPOINTMENT_NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  /**
   * Verifica disponibilidade de slots
   */
  static async checkSlotAvailability(client, barberId, startTime, endTime) {
    const query = `
      SELECT id_slot, start_at, end_at, status
      FROM slots
      WHERE id_usuario = $1
        AND start_at >= $2
        AND end_at <= $3
        AND status = 'free'
      FOR UPDATE
    `;

    const result = await client.query(query, [barberId, startTime, endTime]);
    return result.rows;
  }
}

/**
 * Classe para operações comuns de slots
 * Elimina duplicação de operações com slots
 */
class SlotOperations {
  /**
   * Reserva slots para um agendamento
   */
  static async reserveSlots(client, slotIds, appointmentId) {
    const query = `
      UPDATE slots
      SET status = 'booked', id_agendamento = $2
      WHERE id_slot = ANY($1)
    `;

    const result = await client.query(query, [slotIds, appointmentId]);
    return result.rowCount;
  }

  /**
   * Libera slots de um agendamento
   */
  static async releaseSlots(client, appointmentId) {
    const query = `
      UPDATE slots
      SET status = 'free', id_agendamento = NULL
      WHERE id_agendamento = $1
    `;

    const result = await client.query(query, [appointmentId]);
    return result.rowCount;
  }

  /**
   * Calcula slots necessários para um serviço
   */
  static calculateRequiredSlots(serviceDuration) {
    // Assumindo slots de 15 minutos
    const SLOT_DURATION = 15;
    return Math.ceil(serviceDuration / SLOT_DURATION);
  }

  /**
   * Valida se há slots suficientes disponíveis
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
}

/**
 * Utilitários para paginação
 * Elimina duplicação de lógica de paginação
 */
class PaginationUtils {
  /**
   * Valida e normaliza parâmetros de paginação
   */
  static normalizePagination(page = 1, limit = 20) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(
      DB_CONFIG.MAX_PAGE_SIZE,
      Math.max(1, parseInt(limit) || DB_CONFIG.DEFAULT_PAGE_SIZE)
    );

    return { page: pageNum, limit: limitNum };
  }

  /**
   * Calcula metadados de paginação
   */
  static calculateMetadata(total, page, limit) {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    };
  }

  /**
   * Gera links HATEOAS para paginação
   */
  static generatePaginationLinks(baseUrl, { page, limit, total_pages }, filters = {}) {
    const links = {
      self: this.buildUrl(baseUrl, { page, limit, ...filters })
    };

    if (page > 1) {
      links.prev = this.buildUrl(baseUrl, { page: page - 1, limit, ...filters });
    }

    if (page < total_pages) {
      links.next = this.buildUrl(baseUrl, { page: page + 1, limit, ...filters });
    }

    return links;
  }

  /**
   * Constrói URL com parâmetros
   */
  static buildUrl(baseUrl, params) {
    const url = new URL(baseUrl, 'http://localhost');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });
    return url.pathname + url.search;
  }
}

/**
 * Utilitários para cache
 * Elimina duplicação de operações de cache
 */
class CacheUtils {
  /**
   * Gera chave de cache padronizada
   */
  static generateKey(prefix, ...params) {
    return `${prefix}:${params.join(':')}`;
  }

  /**
   * Invalida padrões de cache
   */
  static async invalidateCachePatterns(cacheService, patterns) {
    const promises = patterns.map(pattern =>
      cacheService.invalidatePattern(pattern)
    );
    await Promise.all(promises);
  }

  /**
   * Invalida cache relacionado a agendamentos
   */
  static async invalidateAppointmentCache(cacheService, barberId, serviceId = null, date = null) {
    const patterns = [
      `services:${barberId}:*`,
      `availability_days:${barberId}:${serviceId || '*'}:*`,
      `availability_slots:${barberId}:${serviceId || '*'}:${date || '*'}:*`,
      `dashboard:${barberId}:*`
    ];

    await this.invalidateCachePatterns(cacheService, patterns);
  }
}

module.exports = {
  TransactionManager,
  ValidationQueries,
  SlotOperations,
  PaginationUtils,
  CacheUtils
};
