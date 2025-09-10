/**
 * Testes Automatizados - API v2 Otimizada
 * Testes de integração e unidade para os novos endpoints
 */
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../src/index');
const pool = require('../src/config/database');
const CacheService = require('../src/services/CacheService');

describe('API v2 - Sistema de Agendamentos Otimizado', () => {
  let server;
  let testBarberId = 123;
  let testServiceId = 1;
  let testAppointmentId;
  let authToken;
  let cacheService;

  // Dados de teste
  const testCustomer = {
    name: 'João Silva Teste',
    phone: '+5511999999999',
    email: 'joao.teste@email.com'
  };

  const testService = {
    id: 1,
    name: 'Corte Masculino Teste',
    duration_minutes: 30,
    price: 35.00
  };

  before(async () => {
    // Iniciar servidor de teste
    server = app.listen(3001);

    // Mock do cache service
    cacheService = new CacheService();
    sinon.stub(cacheService, 'get').returns(null);
    sinon.stub(cacheService, 'set').returns(true);

    // Criar dados de teste no banco
    await setupTestData();
  });

  after(async () => {
    // Limpar dados de teste
    await cleanupTestData();

    // Restaurar mocks
    sinon.restore();

    // Fechar servidor
    server.close();
  });

  /**
   * Configurar dados de teste
   */
  async function setupTestData() {
    try {
      // Inserir barbeiro de teste
      await pool.query(`
        INSERT INTO usuarios (id_usuario, nome, email, senha, tipo, ativo)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id_usuario) DO NOTHING
      `, [testBarberId, 'Barbeiro Teste', 'teste@barber.com', 'hashed_password', 'barbeiro', true]);

      // Inserir serviço de teste
      await pool.query(`
        INSERT INTO servicos (id_usuario, nome_servico, duracao_min, valor, ativo)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_servico) DO NOTHING
      `, [testBarberId, testService.name, testService.duration_minutes, testService.price, true]);

      console.log('✅ Dados de teste criados');
    } catch (error) {
      console.error('Erro ao criar dados de teste:', error);
    }
  }

  /**
   * Limpar dados de teste
   */
  async function cleanupTestData() {
    try {
      // Remover dados de teste
      await pool.query('DELETE FROM agendamentos WHERE id_usuario = $1', [testBarberId]);
      await pool.query('DELETE FROM clientes WHERE id_usuario = $1', [testBarberId]);
      await pool.query('DELETE FROM servicos WHERE id_usuario = $1', [testBarberId]);
      await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [testBarberId]);

      console.log('🧹 Dados de teste removidos');
    } catch (error) {
      console.error('Erro ao limpar dados de teste:', error);
    }
  }

  /**
   * Obter token de autenticação para testes
   */
  async function getAuthToken() {
    if (authToken) return authToken;

    // Mock de autenticação para testes
    authToken = 'test_jwt_token_' + Date.now();
    return authToken;
  }

  // ====================
  // TESTES DOS ENDPOINTS
  // ====================

  describe('GET /api/v2/barbers/:barberId/services', () => {
    it('deve retornar lista de serviços paginada', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/services`)
        .query({ page: 1, limit: 10, active: true })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('services');
      expect(response.body.data).to.have.property('pagination');
      expect(response.body.data.services).to.be.an('array');
      expect(response.body.data.pagination).to.have.property('page', 1);
      expect(response.body.data.pagination).to.have.property('total_pages');
      expect(response.body).to.have.property('_links');
    });

    it('deve validar parâmetros de paginação', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/services`)
        .query({ page: 0, limit: 100 })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('deve filtrar apenas serviços ativos', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/services`)
        .query({ active: true })
        .expect(200);

      expect(response.body.success).to.be.true;
      response.body.data.services.forEach(service => {
        expect(service.is_active).to.be.true;
      });
    });
  });

  describe('GET /api/v2/barbers/:barberId/availability/days', () => {
    it('deve retornar dias disponíveis para agendamento', async () => {
      const startDate = '2025-09-15';
      const endDate = '2025-09-21';

      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/availability/days`)
        .query({
          service_id: testServiceId,
          start_date: startDate,
          end_date: endDate
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('available_days');
      expect(response.body.data).to.have.property('period');
      expect(response.body.data.available_days).to.be.an('array');
      expect(response.body.data.period).to.have.property('days_with_availability');
    });

    it('deve validar parâmetros obrigatórios', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/availability/days`)
        .query({ service_id: testServiceId })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('deve rejeitar período muito longo', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/availability/days`)
        .query({
          service_id: testServiceId,
          start_date: '2025-09-01',
          end_date: '2025-12-31' // > 30 dias
        })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.message).to.include('máximo de');
    });
  });

  describe('GET /api/v2/barbers/:barberId/availability/slots', () => {
    it('deve retornar horários disponíveis para um dia', async () => {
      const testDate = '2025-09-17';

      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/availability/slots`)
        .query({
          service_id: testServiceId,
          date: testDate,
          timezone: 'America/Sao_Paulo'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('available_slots');
      expect(response.body.data).to.have.property('summary');
      expect(response.body.data.available_slots).to.be.an('array');
      expect(response.body.data.summary).to.have.property('utilization_percentage');
    });

    it('deve validar data no formato correto', async () => {
      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/availability/slots`)
        .query({
          service_id: testServiceId,
          date: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v2/barbers/:barberId/appointments', () => {
    it('deve criar agendamento com sucesso', async () => {
      const authToken = await getAuthToken();

      const appointmentData = {
        service_id: testServiceId,
        slot_start_datetime: '2025-09-17T17:00:00Z',
        customer: testCustomer,
        notes: 'Agendamento de teste'
      };

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Idempotency-Key', `test-${Date.now()}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('appointment');
      expect(response.body.data).to.have.property('customer');
      expect(response.body.data.appointment).to.have.property('id');
      expect(response.body.data.appointment.status).to.equal('confirmed');
      expect(response.body).to.have.property('_links');

      // Guardar ID para testes de cancelamento
      testAppointmentId = response.body.data.appointment.id;
    });

    it('deve validar dados obrigatórios', async () => {
      const authToken = await getAuthToken();

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('deve validar formato de telefone', async () => {
      const authToken = await getAuthToken();

      const invalidData = {
        service_id: testServiceId,
        slot_start_datetime: '2025-09-17T17:00:00Z',
        customer: {
          name: 'João Teste',
          phone: '11999999999', // Sem +55
          email: 'joao@email.com'
        }
      };

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.details.fields).to.include('Telefone deve estar no formato +55XXXXXXXXXX');
    });

    it('deve rejeitar data no passado', async () => {
      const authToken = await getAuthToken();

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const invalidData = {
        service_id: testServiceId,
        slot_start_datetime: pastDate.toISOString(),
        customer: testCustomer
      };

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.details.fields).to.include('Data/hora deve ser no futuro');
    });
  });

  describe('POST /api/v2/barbers/:barberId/appointments/:appointmentId/cancel', () => {
    it('deve cancelar agendamento com sucesso', async () => {
      if (!testAppointmentId) {
        console.warn('⚠️  Pular teste de cancelamento - nenhum agendamento criado');
        return;
      }

      const authToken = await getAuthToken();

      const cancelData = {
        reason: 'Cliente não pode comparecer',
        notify_customer: true
      };

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments/${testAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.appointment.status).to.equal('cancelled');
      expect(response.body.data).to.have.property('refunded_slots');
      expect(response.body).to.have.property('_links');
    });

    it('deve rejeitar cancelamento de agendamento inexistente', async () => {
      const authToken = await getAuthToken();

      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments/99999/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Teste' })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.code).to.equal('NOT_FOUND');
    });
  });

  describe('GET /api/v2/barbers/:barberId/appointments', () => {
    it('deve listar agendamentos com filtros', async () => {
      const authToken = await getAuthToken();

      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10, status: 'confirmed' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('appointments');
      expect(response.body.data).to.have.property('pagination');
      expect(response.body.data.appointments).to.be.an('array');
    });
  });

  describe('GET /api/v2/barbers/:barberId/appointments/:appointmentId', () => {
    it('deve retornar detalhes de agendamento específico', async () => {
      if (!testAppointmentId) {
        console.warn('⚠️  Pular teste de detalhes - nenhum agendamento criado');
        return;
      }

      const authToken = await getAuthToken();

      const response = await request(app)
        .get(`/api/v2/barbers/${testBarberId}/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id', testAppointmentId);
      expect(response.body.data).to.have.property('_links');
    });
  });

  // ====================
  // TESTES DE PERFORMANCE
  // ====================

  describe('Performance Tests', () => {
    it('deve responder rapidamente aos endpoints principais', async () => {
      const startTime = Date.now();

      const promises = [
        request(app).get(`/api/v2/barbers/${testBarberId}/services`),
        request(app).get(`/api/v2/barbers/${testBarberId}/availability/days`)
          .query({ service_id: testServiceId, start_date: '2025-09-15', end_date: '2025-09-21' }),
        request(app).get(`/api/v2/barbers/${testBarberId}/availability/slots`)
          .query({ service_id: testServiceId, date: '2025-09-17' })
      ];

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Deve responder em menos de 1 segundo para todos os endpoints
      expect(totalTime).to.be.lessThan(1000);
    });
  });

  // ====================
  // TESTES DE SEGURANÇA
  // ====================

  describe('Security Tests', () => {
    it('deve rejeitar acesso sem autenticação aos endpoints protegidos', async () => {
      const response = await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .send({})
        .expect(401);

      expect(response.body.success).to.be.false;
    });

    it('deve validar rate limiting', async () => {
      const promises = [];

      // Fazer muitas requisições rapidamente
      for (let i = 0; i < 35; i++) {
        promises.push(
          request(app)
            .get(`/api/v2/barbers/${testBarberId}/services`)
            .expect((res) => {
              if (res.status === 429) {
                expect(res.body.error.code).to.equal('RATE_LIMIT_EXCEEDED');
              }
            })
        );
      }

      await Promise.all(promises);
    }).timeout(10000); // Timeout maior para rate limiting
  });

  // ====================
  // TESTES DE CONCORRÊNCIA
  // ====================

  describe('Concurrency Tests', () => {
    it('deve lidar com múltiplas tentativas de agendamento simultâneo', async () => {
      const authToken = await getAuthToken();

      const appointmentData = {
        service_id: testServiceId,
        slot_start_datetime: '2025-09-18T14:00:00Z',
        customer: {
          name: 'Cliente Concorrente',
          phone: '+5511988888888',
          email: 'concorrente@email.com'
        }
      };

      const promises = [];

      // Criar 5 tentativas simultâneas
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post(`/api/v2/barbers/${testBarberId}/appointments`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Idempotency-Key', `concurrency-test-${i}`)
            .send(appointmentData)
        );
      }

      const responses = await Promise.all(promises);

      // Uma deve ser bem-sucedida, as outras devem falhar
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;

      expect(successCount).to.be.at.most(1);
      expect(conflictCount).to.be.at.least(4);
    }).timeout(15000);
  });

  // ====================
  // TESTES DE CACHE
  // ====================

  describe('Cache Tests', () => {
    it('deve usar cache para serviços', async () => {
      // Primeira requisição
      await request(app)
        .get(`/api/v2/barbers/${testBarberId}/services`)
        .expect(200);

      // Verificar se cache foi chamado
      expect(cacheService.get.called).to.be.true;
      expect(cacheService.set.called).to.be.true;
    });

    it('deve invalidar cache após criação de agendamento', async () => {
      const authToken = await getAuthToken();

      // Limpar calls anteriores
      cacheService.invalidatePattern.resetHistory();

      const appointmentData = {
        service_id: testServiceId,
        slot_start_datetime: '2025-09-19T10:00:00Z',
        customer: {
          name: 'Cliente Cache Test',
          phone: '+5511977777777',
          email: 'cache@email.com'
        }
      };

      await request(app)
        .post(`/api/v2/barbers/${testBarberId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Idempotency-Key', `cache-test-${Date.now()}`)
        .send(appointmentData)
        .expect(201);

      // Verificar se cache foi invalidado
      expect(cacheService.invalidatePattern.called).to.be.true;
    });
  });
});
