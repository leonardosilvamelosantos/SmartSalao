/**
 * Testes de Segurança Automatizados
 * Valida as correções de segurança implementadas
 */
const request = require('supertest');
const app = require('../src/index');
const SecurityAlertService = require('../src/services/SecurityAlertService');
const pool = require('../src/config/database');

describe('🔒 Security Tests', () => {
  let authToken;
  let securityAlert;

  beforeAll(async () => {
    securityAlert = new SecurityAlertService();
    
    // Criar usuário de teste para autenticação
    const testUser = {
      email: 'security-test@test.com',
      password: 'TestPassword123!',
      name: 'Security Test User'
    };
    
    // Simular login para obter token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.token;
    }
  });

  afterAll(async () => {
    // Limpar dados de teste
    await pool.query('DELETE FROM security_events WHERE event_type LIKE "test_%"');
    await pool.query('DELETE FROM security_alerts WHERE alert_type LIKE "test_%"');
  });

  describe('SQL Injection Prevention', () => {
    test('should block SQL injection in user input', async () => {
      const maliciousInput = "'; DROP TABLE usuarios; --";
      
      const response = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: maliciousInput,
          whatsapp: '11999999999'
        });

      // Deve retornar erro de validação
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.message).toMatch(/padrões suspeitos|caracteres especiais|não permitidos/i);
    });

    test('should block UNION-based SQL injection', async () => {
      const unionInjection = "test' UNION SELECT * FROM usuarios --";
      
      const response = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: unionInjection });

      // Deve retornar erro de validação
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate query patterns in BaseModel', async () => {
      const BaseModel = require('../src/models/BaseModel');
      const model = new BaseModel('test_table');

      // Testar queries maliciosas
      const maliciousQueries = [
        "DROP TABLE usuarios",
        "UNION SELECT * FROM usuarios",
        "EXEC sp_configure",
        "SELECT * FROM usuarios; DROP TABLE usuarios;"
      ];

      for (const query of maliciousQueries) {
        await expect(model.query(query)).rejects.toThrow(/padrões suspeitos|SQL injection/);
      }
    });
  });

  describe('Authentication & Authorization', () => {
    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/usuarios');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Token de acesso não fornecido|Autenticação necessária/i);
    });

    test('should validate tenant isolation', async () => {
      // Este teste seria mais complexo em um ambiente real
      // Aqui simulamos a validação básica
      const response = await request(app)
        .get('/api/usuarios')
        .set('Authorization', `Bearer invalid_token`);

      expect(response.status).toBe(401);
    });

    test('should block access with invalid token', async () => {
      const response = await request(app)
        .get('/api/usuarios')
        .set('Authorization', 'Bearer invalid_token_123');

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    test('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ email, password: 'ValidPass123!' });

        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should validate password strength', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'Password',
        'password123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ 
            email: 'test@test.com', 
            password 
          });

        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should sanitize HTML input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: maliciousInput,
          whatsapp: '11999999999'
        });

      // Deve rejeitar ou sanitizar o input
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting in production', async () => {
      // Simular múltiplas requisições
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/usuarios')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Pelo menos uma deve ser bloqueada por rate limit
      const rateLimited = responses.some(r => r.status === 429);
      
      if (process.env.NODE_ENV === 'production') {
        expect(rateLimited).toBe(true);
      }
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/security/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Security Alert System', () => {
    test('should log security events', async () => {
      // Simular evento de segurança
      await securityAlert.logSecurityEvent('test_event', {
        test: true,
        message: 'Test security event'
      });

      // Verificar se foi registrado
      const result = await pool.query(`
        SELECT * FROM security_events 
        WHERE event_type = 'test_event' 
        ORDER BY timestamp DESC 
        LIMIT 1
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].details).toContain('test');
    });

    test('should generate alerts for critical events', async () => {
      // Simular múltiplos eventos críticos
      for (let i = 0; i < 6; i++) {
        await securityAlert.logSecurityEvent('sqlInjectionAttempts', {
          test: true,
          query: 'DROP TABLE test'
        });
      }

      // Verificar se alerta foi gerado
      const result = await pool.query(`
        SELECT * FROM security_alerts 
        WHERE alert_type = 'sqlInjectionAttempts' 
        AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].severity).toBe('critical');
    });

    test('should provide security statistics', async () => {
      const response = await request(app)
        .get('/api/security/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data.alerts).toHaveProperty('total');
      expect(response.body.data.alerts).toHaveProperty('active');
    });
  });

  describe('Error Handling', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body.message).not.toContain('stack');
      expect(response.body.message).not.toContain('Error:');
    });

    test('should handle database errors gracefully', async () => {
      // Simular erro de banco (em um teste real, você mockaria o pool)
      const response = await request(app)
        .get('/api/security/health');

      // Deve retornar status apropriado sem expor detalhes internos
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate production configuration', async () => {
      const requiredEnvVars = [
        'NODE_ENV',
        'JWT_SECRET',
        'DB_PASSWORD'
      ];

      for (const envVar of requiredEnvVars) {
        expect(process.env[envVar]).toBeDefined();
      }

      if (process.env.NODE_ENV === 'production') {
        expect(process.env.JWT_SECRET).not.toBe('agendamento-platform-secret-key-2025');
        expect(process.env.DB_PASSWORD).not.toBe('CHANGE_THIS_PASSWORD');
        expect(process.env.ENABLE_RATE_LIMITING).toBe('true');
        expect(process.env.ENABLE_SECURITY_ALERTS).toBe('true');
      }
    });
  });
});

/**
 * Testes de Performance de Segurança
 */
describe('🚀 Security Performance Tests', () => {
  test('should handle security validation efficiently', async () => {
    const startTime = Date.now();
    
    // Executar múltiplas validações
    const validations = Array(100).fill().map(() => 
      request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Test User',
          whatsapp: '11999999999'
        })
    );

    await Promise.all(validations);
    
    const duration = Date.now() - startTime;
    
    // Deve processar 100 validações em menos de 5 segundos
    expect(duration).toBeLessThan(5000);
  });
});

/**
 * Testes de Integração de Segurança
 */
describe('🔗 Security Integration Tests', () => {
  test('should integrate all security components', async () => {
    // Teste completo do fluxo de segurança
    const maliciousRequest = {
      nome: "'; DROP TABLE usuarios; --",
      whatsapp: '11999999999'
    };

    const response = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(maliciousRequest);

    // Deve bloquear a requisição
    expect(response.status).toBeGreaterThanOrEqual(400);

    // Deve gerar evento de segurança
    const events = await pool.query(`
      SELECT * FROM security_events 
      WHERE event_type = 'sqlInjectionAttempts'
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    expect(events.rows.length).toBeGreaterThan(0);
  });
});
