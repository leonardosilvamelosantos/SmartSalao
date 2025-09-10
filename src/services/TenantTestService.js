/**
 * Serviço de Testes para Tenants
 * Criação automática de tenants de teste com dados realistas
 */
const TenantProvisioningService = require('./TenantProvisioningService');
const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class TenantTestService {
  constructor() {
    this.provisioningService = new TenantProvisioningService();
    this.testDataDir = path.join(__dirname, '../../test-data');
  }

  /**
   * Criar tenant de teste com dados completos
   */
  async createTestTenant(options = {}) {
    const {
      name = 'Barbearia Teste',
      plan = 'premium',
      withSampleData = true,
      customConfig = {}
    } = options;

    try {
      console.log(`🚀 Criando tenant de teste: ${name}`);

      // Gerar dados únicos
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);

      const tenantData = {
        name: `${name} ${randomId}`,
        email: `teste${timestamp}@barberapp.com`,
        phone: '+5511987654321',
        document: `12345678000${Math.floor(Math.random() * 100)}`.substring(0, 11),
        plan,
        ...customConfig
      };

      // Provisionar tenant
      const result = await this.provisioningService.provisionTenant(tenantData);

      console.log(`✅ Tenant criado: ${result.tenant.id} (${result.tenant.schema})`);

      if (withSampleData) {
        await this.populateSampleData(result.tenant);
      }

      return {
        ...result,
        test_credentials: {
          admin_email: tenantData.email,
          admin_password: tenantData.tempPassword || 'admin123',
          barber_email: tenantData.email,
          barber_password: 'barber123'
        }
      };

    } catch (error) {
      console.error('Erro ao criar tenant de teste:', error);
      throw error;
    }
  }

  /**
   * Criar múltiplos tenants de teste
   */
  async createMultipleTestTenants(count = 5, options = {}) {
    const results = [];

    console.log(`🚀 Criando ${count} tenants de teste...`);

    for (let i = 1; i <= count; i++) {
      try {
        const tenantOptions = {
          ...options,
          name: `Barbearia ${i}`,
          plan: this.getRandomPlan()
        };

        const result = await this.createTestTenant(tenantOptions);
        results.push(result);

        console.log(`✅ Tenant ${i}/${count} criado: ${result.tenant.name}`);

        // Pequena pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro ao criar tenant ${i}:`, error.message);
      }
    }

    console.log(`🎉 ${results.length} tenants de teste criados com sucesso!`);

    return results;
  }

  /**
   * Popular dados de exemplo no tenant
   */
  async populateSampleData(tenant) {
    const client = await pool.connect();

    try {
      const schema = tenant.schema;

      // Buscar usuário barbeiro
      const barberResult = await client.query(`
        SELECT id_usuario FROM ${schema}.usuarios WHERE tipo = 'barbeiro' LIMIT 1
      `);

      if (barberResult.rows.length === 0) {
        console.log(`⚠️  Nenhum barbeiro encontrado no schema ${schema}`);
        return;
      }

      const barberId = barberResult.rows[0].id_usuario;

      // Criar clientes de exemplo
      const sampleClients = [
        { name: 'João Silva', phone: '+5511987654321', email: 'joao@email.com' },
        { name: 'Maria Santos', phone: '+5511976543210', email: 'maria@email.com' },
        { name: 'Pedro Oliveira', phone: '+5511965432109', email: 'pedro@email.com' },
        { name: 'Ana Costa', phone: '+5511954321098', email: 'ana@email.com' },
        { name: 'Lucas Pereira', phone: '+5511943210987', email: 'lucas@email.com' }
      ];

      for (const clientData of sampleClients) {
        await client.query(`
          INSERT INTO ${schema}.clientes (id_usuario, nome, whatsapp, email)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (whatsapp) DO NOTHING
        `, [barberId, clientData.name, clientData.phone, clientData.email]);
      }

      // Criar mais serviços
      const additionalServices = [
        { name: 'Corte + Barba', duration: 45, price: 55.00 },
        { name: 'Coloração', duration: 90, price: 80.00 },
        { name: 'Hidratação', duration: 40, price: 40.00 },
        { name: 'Penteado', duration: 30, price: 45.00 },
        { name: 'Limpeza de Pele', duration: 25, price: 35.00 }
      ];

      for (const service of additionalServices) {
        await client.query(`
          INSERT INTO ${schema}.servicos (id_usuario, nome_servico, duracao_min, valor, ativo)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [barberId, service.name, service.duration, service.price, true]);
      }

      // Criar slots para os próximos 30 dias
      await this.createSampleSlots(client, schema, barberId);

      // Criar alguns agendamentos de exemplo
      await this.createSampleAppointments(client, schema, barberId);

      console.log(`✅ Dados de exemplo populados no tenant ${tenant.name}`);

    } catch (error) {
      console.error('Erro ao popular dados de exemplo:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Criar slots de exemplo
   */
  async createSampleSlots(client, schema, barberId) {
    const slots = [];
    const now = new Date();

    // Criar slots para os próximos 30 dias
    for (let day = 0; day < 30; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);

      // Pular domingos
      if (date.getDay() === 0) continue;

      // Horários de funcionamento
      const startHour = date.getDay() === 6 ? 8 : 9; // Sábado começa mais cedo
      const endHour = date.getDay() === 6 ? 17 : 18;  // Sábado termina mais cedo

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = new Date(date);
          startTime.setHours(hour, minute, 0, 0);

          const endTime = new Date(startTime);
          endTime.setMinutes(startTime.getMinutes() + 30);

          slots.push({
            start_at: startTime.toISOString(),
            end_at: endTime.toISOString()
          });

          // Limitar para não sobrecarregar
          if (slots.length >= 1000) break;
        }
        if (slots.length >= 1000) break;
      }
      if (slots.length >= 1000) break;
    }

    // Inserir slots em lotes
    const batchSize = 100;
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      const values = batch.map(slot =>
        `(${barberId}, '${slot.start_at}', '${slot.end_at}', 'free')`
      ).join(', ');

      await client.query(`
        INSERT INTO ${schema}.slots (id_usuario, start_at, end_at, status)
        VALUES ${values}
      `);
    }

    console.log(`✅ ${slots.length} slots criados para o tenant`);
  }

  /**
   * Criar agendamentos de exemplo
   */
  async createSampleAppointments(client, schema, barberId) {
    // Buscar clientes e serviços criados
    const clientsResult = await client.query(`SELECT id_cliente FROM ${schema}.clientes LIMIT 5`);
    const servicesResult = await client.query(`SELECT id_servico FROM ${schema}.servicos LIMIT 5`);

    if (clientsResult.rows.length === 0 || servicesResult.rows.length === 0) {
      return;
    }

    const clients = clientsResult.rows;
    const services = servicesResult.rows;

    // Criar alguns agendamentos futuros
    const appointments = [];
    const now = new Date();

    for (let i = 0; i < Math.min(10, clients.length * services.length); i++) {
      const futureDate = new Date(now);
      futureDate.setDate(now.getDate() + Math.floor(Math.random() * 14) + 1); // Próximos 14 dias

      if (futureDate.getDay() === 0) continue; // Pular domingos

      const hour = 9 + Math.floor(Math.random() * 8); // 9h às 17h
      futureDate.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0);

      const client = clients[Math.floor(Math.random() * clients.length)];
      const service = services[Math.floor(Math.random() * services.length)];

      appointments.push({
        client_id: client.id_cliente,
        service_id: service.id_servico,
        start_at: futureDate.toISOString(),
        status: Math.random() > 0.3 ? 'confirmed' : 'pending'
      });
    }

    // Inserir agendamentos
    for (const appointment of appointments) {
      try {
        // Verificar se existe slot disponível
        const slotCheck = await client.query(`
          SELECT id_slot FROM ${schema}.slots
          WHERE id_usuario = $1
            AND start_at = $2
            AND status = 'free'
          LIMIT 1
        `, [barberId, appointment.start_at]);

        if (slotCheck.rows.length > 0) {
          const slotId = slotCheck.rows[0].id_slot;

          // Inserir agendamento
          const appointmentResult = await client.query(`
            INSERT INTO ${schema}.agendamentos (
              id_usuario, id_servico, id_cliente, start_at, end_at, status, criado_em
            ) VALUES ($1, $2, $3, $4, $4::timestamptz + INTERVAL '30 minutes', $5, NOW())
            RETURNING id_agendamento
          `, [
            barberId,
            appointment.service_id,
            appointment.client_id,
            appointment.start_at,
            appointment.status
          ]);

          // Reservar slot
          await client.query(`
            UPDATE ${schema}.slots
            SET status = 'booked', id_agendamento = $1
            WHERE id_slot = $2
          `, [appointmentResult.rows[0].id_agendamento, slotId]);
        }
      } catch (error) {
        console.warn('Erro ao criar agendamento de exemplo:', error.message);
      }
    }

    console.log(`✅ ${appointments.length} agendamentos de exemplo criados`);
  }

  /**
   * Selecionar plano aleatório para testes
   */
  getRandomPlan() {
    const plans = ['basico', 'profissional', 'premium'];
    return plans[Math.floor(Math.random() * plans.length)];
  }

  /**
   * Limpar todos os tenants de teste
   */
  async cleanupTestTenants() {
    try {
      console.log('🧹 Limpando tenants de teste...');

      // Buscar tenants de teste
      const testTenants = await pool.query(`
        SELECT id_tenant, schema_name
        FROM tenants
        WHERE email LIKE '%@barberapp.com'
          OR nome LIKE '%Teste%'
          OR nome LIKE '%teste%'
      `);

      console.log(`Encontrados ${testTenants.rows.length} tenants de teste`);

      for (const tenant of testTenants.rows) {
        try {
          await this.provisioningService.deprovisionTenant(tenant.id_tenant);
          console.log(`✅ Tenant ${tenant.id_tenant} removido`);
        } catch (error) {
          console.error(`❌ Erro ao remover tenant ${tenant.id_tenant}:`, error.message);
        }
      }

      console.log('🧹 Limpeza concluída!');

    } catch (error) {
      console.error('Erro na limpeza:', error);
      throw error;
    }
  }

  /**
   * Exportar dados de um tenant para backup
   */
  async exportTenantData(tenantId) {
    try {
      // Buscar informações do tenant
      const tenantResult = await pool.query(`
        SELECT * FROM tenants WHERE id_tenant = $1
      `, [tenantId]);

      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant não encontrado');
      }

      const tenant = tenantResult.rows[0];
      const exportData = {
        tenant: tenant,
        export_date: new Date().toISOString(),
        data: {}
      };

      // Exportar dados de cada tabela
      const tables = ['usuarios', 'servicos', 'clientes', 'slots', 'agendamentos'];
      const client = await pool.connect();

      try {
        for (const table of tables) {
          const result = await client.query(`SELECT * FROM ${tenant.schema_name}.${table}`);
          exportData.data[table] = result.rows;
        }
      } finally {
        client.release();
      }

      // Salvar arquivo de export
      const filename = `tenant_${tenantId}_backup_${Date.now()}.json`;
      const filepath = path.join(this.testDataDir, filename);

      await fs.mkdir(this.testDataDir, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

      console.log(`✅ Dados do tenant ${tenantId} exportados para ${filename}`);

      return { filename, filepath, data: exportData };

    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }

  /**
   * Importar dados de backup para um tenant
   */
  async importTenantData(filepath) {
    try {
      const fileContent = await fs.readFile(filepath, 'utf8');
      const importData = JSON.parse(fileContent);

      // Recriar tenant
      const result = await this.provisioningService.provisionTenant({
        name: importData.tenant.nome,
        email: importData.tenant.email,
        phone: importData.tenant.telefone,
        plan: importData.tenant.plano
      });

      // Importar dados
      const client = await pool.connect();
      const schema = result.tenant.schema;

      try {
        await client.query('BEGIN');

        // Importar dados de cada tabela
        for (const [table, rows] of Object.entries(importData.data)) {
          if (rows.length === 0) continue;

          for (const row of rows) {
            // Preparar query de inserção
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

            try {
              await client.query(
                `INSERT INTO ${schema}.${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                values
              );
            } catch (error) {
              console.warn(`Erro ao importar linha da tabela ${table}:`, error.message);
            }
          }
        }

        await client.query('COMMIT');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      console.log(`✅ Dados importados para tenant ${result.tenant.id}`);

      return result;

    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw error;
    }
  }

  /**
   * Executar testes de carga
   */
  async runLoadTest(options = {}) {
    const {
      concurrentTenants = 10,
      operationsPerTenant = 50,
      durationMinutes = 5
    } = options;

    console.log(`🚀 Iniciando teste de carga: ${concurrentTenants} tenants, ${operationsPerTenant} operações cada`);

    const results = {
      start_time: new Date(),
      tenants_created: 0,
      operations_completed: 0,
      errors: 0,
      end_time: null
    };

    // Criar tenants simultaneamente
    const tenantPromises = [];
    for (let i = 0; i < concurrentTenants; i++) {
      tenantPromises.push(
        this.createTestTenant({
          name: `LoadTest ${i}`,
          withSampleData: false
        }).catch(error => {
          results.errors++;
          console.error(`Erro ao criar tenant ${i}:`, error.message);
          return null;
        })
      );
    }

    const tenants = await Promise.all(tenantPromises);
    results.tenants_created = tenants.filter(t => t !== null).length;

    console.log(`✅ ${results.tenants_created} tenants criados para teste`);

    // Executar operações em cada tenant
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);

    while (Date.now() < endTime) {
      const operationPromises = tenants
        .filter(tenant => tenant !== null)
        .map(async (tenant) => {
          try {
            // Simular operações aleatórias
            const operations = [
              () => this.simulateApiCall(tenant),
              () => this.simulateDatabaseQuery(tenant),
              () => this.simulateCacheOperation(tenant)
            ];

            const randomOperation = operations[Math.floor(Math.random() * operations.length)];
            await randomOperation();

            results.operations_completed++;
          } catch (error) {
            results.errors++;
          }
        });

      await Promise.all(operationPromises);

      // Pequena pausa para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    results.end_time = new Date();

    console.log(`📊 Teste de carga concluído:`);
    console.log(`   - Tenants criados: ${results.tenants_created}`);
    console.log(`   - Operações realizadas: ${results.operations_completed}`);
    console.log(`   - Erros: ${results.errors}`);
    console.log(`   - Duração: ${durationMinutes} minutos`);

    return results;
  }

  /**
   * Simular chamada de API
   */
  async simulateApiCall(tenant) {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  /**
   * Simular query de banco
   */
  async simulateDatabaseQuery(tenant) {
    const client = await pool.connect();
    try {
      await client.query(`SELECT COUNT(*) FROM ${tenant.tenant.schema}.usuarios`);
    } finally {
      client.release();
    }
  }

  /**
   * Simular operação de cache
   */
  async simulateCacheOperation(tenant) {
    // Simular operação de cache
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
  }

  /**
   * Obter relatório de uso dos tenants de teste
   */
  async getTestTenantsReport() {
    try {
      const report = {
        generated_at: new Date().toISOString(),
        test_tenants: [],
        usage_stats: {},
        recommendations: []
      };

      // Buscar tenants de teste
      const tenants = await pool.query(`
        SELECT t.*, COUNT(tu.id_usuario) as users_count
        FROM tenants t
        LEFT JOIN tenant_users tu ON t.id_tenant = tu.id_tenant
        WHERE t.email LIKE '%@barberapp.com'
           OR t.nome LIKE '%Teste%'
           OR t.nome LIKE '%teste%'
        GROUP BY t.id_tenant
        ORDER BY t.data_criacao DESC
      `);

      report.test_tenants = tenants.rows;

      // Estatísticas de uso
      const usageStats = await pool.query(`
        SELECT
          tipo,
          SUM(quantidade) as total_used,
          AVG(quantidade) as avg_per_tenant,
          MAX(quantidade) as max_per_tenant
        FROM tenant_usage tu
        JOIN tenants t ON tu.id_tenant = t.id_tenant
        WHERE t.email LIKE '%@barberapp.com'
          AND tu.periodo = date_trunc('month', CURRENT_DATE)
        GROUP BY tipo
      `);

      report.usage_stats = usageStats.rows;

      // Recomendações
      if (report.test_tenants.length > 10) {
        report.recommendations.push('Considere limpar tenants de teste antigos');
      }

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }
}

module.exports = TenantTestService;
