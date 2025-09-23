/**
 * Serviço de Provisionamento de Tenants
 * Criação automática de novos tenants com isolamento completo
 */
const pool = require('../config/database');
const AuthService = require('./AuthService');
const { CONFIG, STATUS } = require('../constants');
const crypto = require('crypto');

class TenantProvisioningService {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Provisionar novo tenant completo
   */
  async provisionTenant(tenantData) {
    try {
      console.log('🚀 Provisionando tenant (SQLite real)');

      const data = await this.validateTenantData(tenantData);

      // Criar tenant na tabela principal (esquema SQLite vigente)
      const schemaName = this.normalizeDomain(data.name);
      const limites = this.getPlanLimits(data.plan); // JSON string
      const configuracoes = this.getDefaultConfig(); // JSON string

      // Detectar tipo de banco e usar função de data apropriada
      const isPostgreSQL = process.env.NODE_ENV === 'production' || 
                          process.env.DB_TYPE === 'postgresql' || 
                          process.env.USE_POSTGRESQL === 'true' ||
                          process.env.USE_SQLITE === 'false';
      const nowFunction = isPostgreSQL ? 'NOW()' : "datetime('now')";
      
      const tenantResult = await pool.query(
        `INSERT INTO tenants (nome, email, telefone, documento, schema_name, plano, status, limites, configuracoes, data_criacao, data_atualizacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${nowFunction}, ${nowFunction})
         RETURNING id_tenant, nome, email, telefone, schema_name, plano, status, limites, configuracoes, data_criacao`,
        [data.name, data.email, data.phone, data.document || null, schemaName, data.plan, 'ativo', limites, configuracoes]
      );

      const tenant = tenantResult.rows[0];

      // Criar usuário admin básico vinculado ao tenant (tabela usuarios)
      try {
        await pool.query(
          `INSERT INTO usuarios (id_tenant, nome, whatsapp, timezone)
           VALUES ($1, $2, $3, $4)`,
          [tenant.id_tenant, data.name, (data.phone || '').replace('+', ''), CONFIG.DEFAULT_TIMEZONE]
        );
      } catch (e) {
        console.warn('⚠️ Falha ao criar usuário admin padrão para o tenant:', e.message);
      }

      console.log('✅ Tenant criado:', tenant.nome || tenant.schema_name || tenant.id_tenant);

      return {
        tenant: {
          id_tenant: tenant.id_tenant,
          nome: tenant.nome,
          email: tenant.email,
          telefone: tenant.telefone,
          schema_name: tenant.schema_name,
          plano: tenant.plano,
          status: tenant.status,
          limites: JSON.parse(tenant.limites || '{}'),
          configuracoes: JSON.parse(tenant.configuracoes || '{}'),
          data_criacao: tenant.data_criacao
        },
        credentials: {
          admin_contact: data.phone,
          note: 'Autenticação de admin por email/senha não habilitada no fluxo SQLite dev'
        }
      };

    } catch (error) {
      console.error('Erro no provisionamento:', error);
      throw error;
    }
  }

  /**
   * Validar dados do tenant
   */
  async validateTenantData(data) {
    const { name, email, phone, document, plan = 'basico' } = data;

    // Validações básicas
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email inválido');
    }

    if (!phone || !/^\+55\d{10,11}$/.test(phone)) {
      throw new Error('Telefone deve estar no formato +55XXXXXXXXXX');
    }

    // Verificar domínio (derivado do nome) único
    const dominio = this.normalizeDomain(name);
    const existing = await pool.query(
      'SELECT id_tenant FROM tenants WHERE schema_name = $1 LIMIT 1',
      [dominio]
    );
    if (existing.rows.length > 0) {
      throw new Error('Domínio já cadastrado');
    }

    // Validar plano
    const validPlans = ['basico', 'profissional', 'premium'];
    if (!validPlans.includes(plan)) {
      throw new Error('Plano inválido');
    }

    // Gerar senha temporária
    const tempPassword = this.generateTempPassword();

    return {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      document: document?.trim(),
      plan,
      tempPassword
    };
  }

  /**
   * Gerar nome único para schema
   */
  async generateUniqueSchemaName(baseName) {
    const baseSchema = `tenant_${baseName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 20)}`;

    let schemaName = baseSchema;
    let counter = 1;

    while (true) {
      const existing = await pool.query(
        'SELECT id_tenant FROM tenants WHERE schema_name = $1 LIMIT 1',
        [schemaName]
      );

      if (existing.rows.length === 0) {
        return schemaName;
      }

      schemaName = `${baseSchema}_${counter}`;
      counter++;

      if (counter > 100) {
        throw new Error('Não foi possível gerar nome único para schema');
      }
    }
  }

  normalizeDomain(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').substring(0, 30);
  }

  /**
   * Criar schema isolado para o tenant
   */
  async createTenantSchema(client, schemaName) {
    // Criar schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

    // Criar tabelas no schema do tenant
    const tables = [
      // Usuários do tenant
      `CREATE TABLE ${schemaName}.usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT DEFAULT 'barbeiro',
        ativo BOOLEAN DEFAULT true,
        timezone TEXT DEFAULT '${CONFIG.DEFAULT_TIMEZONE}',
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      // Serviços
      `CREATE TABLE ${schemaName}.servicos (
        id_servico SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES ${schemaName}.usuarios(id_usuario),
        nome_servico TEXT NOT NULL,
        duracao_min INTEGER NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      // Clientes
      `CREATE TABLE ${schemaName}.clientes (
        id_cliente SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES ${schemaName}.usuarios(id_usuario),
        nome TEXT NOT NULL,
        whatsapp VARCHAR(20) UNIQUE,
        email TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      // Slots de horário
      `CREATE TABLE ${schemaName}.slots (
        id_slot SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES ${schemaName}.usuarios(id_usuario),
        start_at TIMESTAMP NOT NULL,
        end_at TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'free',
        id_agendamento INTEGER,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      // Agendamentos
      `CREATE TABLE ${schemaName}.agendamentos (
        id_agendamento SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES ${schemaName}.usuarios(id_usuario),
        id_servico INTEGER REFERENCES ${schemaName}.servicos(id_servico),
        id_cliente INTEGER REFERENCES ${schemaName}.clientes(id_cliente),
        start_at TIMESTAMP NOT NULL,
        end_at TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'confirmed',
        valor_total DECIMAL(10,2),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )`,

      // Configurações específicas do tenant
      `CREATE TABLE ${schemaName}.configuracoes (
        id_config SERIAL PRIMARY KEY,
        chave VARCHAR(100) UNIQUE NOT NULL,
        valor JSONB,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )`
    ];

    // Executar criação das tabelas
    for (const tableSQL of tables) {
      await client.query(tableSQL);
    }

    // Criar índices para performance
    const indexes = [
      `CREATE INDEX idx_${schemaName}_usuarios_email ON ${schemaName}.usuarios(email)`,
      `CREATE INDEX idx_${schemaName}_servicos_usuario ON ${schemaName}.servicos(id_usuario)`,
      `CREATE INDEX idx_${schemaName}_clientes_usuario ON ${schemaName}.clientes(id_usuario)`,
      `CREATE INDEX idx_${schemaName}_slots_usuario_data ON ${schemaName}.slots(id_usuario, DATE(start_at))`,
      `CREATE INDEX idx_${schemaName}_slots_status ON ${schemaName}.slots(status) WHERE status = 'free'`,
      `CREATE INDEX idx_${schemaName}_agendamentos_usuario ON ${schemaName}.agendamentos(id_usuario)`,
      `CREATE INDEX idx_${schemaName}_agendamentos_data ON ${schemaName}.agendamentos(DATE(start_at))`
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }

    console.log(`✅ Schema ${schemaName} criado com sucesso`);
  }

  /**
   * Criar usuário admin do tenant
   */
  async createTenantAdmin(client, tenantId, tenantData) {
    const hashedPassword = await this.authService.hashPassword(tenantData.tempPassword);

    const userResult = await client.query(`
      INSERT INTO tenant_users (
        id_tenant, nome, email, senha_hash, cargo, permissoes, data_criacao
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id_usuario, email
    `, [
      tenantId,
      tenantData.name,
      tenantData.email,
      hashedPassword,
      'admin',
      JSON.stringify({
        admin: true,
        agendamentos: true,
        clientes: true,
        servicos: true,
        relatorios: true,
        configuracoes: true
      })
    ]);

    return userResult.rows[0];
  }

  /**
   * Popular dados iniciais no tenant
   */
  async populateInitialData(client, schemaName, tenantId, tenantData) {
    // Criar usuário barbeiro padrão no schema do tenant
    const barberResult = await client.query(`
      INSERT INTO ${schemaName}.usuarios (nome, email, senha, tipo, ativo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_usuario
    `, [
      tenantData.name,
      tenantData.email,
      await this.authService.hashPassword('barber123'),
      'barbeiro',
      true
    ]);

    const barberId = barberResult.rows[0].id_usuario;

    // Criar serviços padrão
    const defaultServices = [
      { name: 'Corte Masculino', duration: 30, price: 35.00 },
      { name: 'Corte Feminino', duration: 60, price: 50.00 },
      { name: 'Barba', duration: 20, price: 25.00 },
      { name: 'Sombrancelha', duration: 15, price: 15.00 }
    ];

    for (const service of defaultServices) {
      await client.query(`
        INSERT INTO ${schemaName}.servicos (id_usuario, nome_servico, duracao_min, valor, ativo)
        VALUES ($1, $2, $3, $4, $5)
      `, [barberId, service.name, service.duration, service.price, true]);
    }

    // Criar configurações padrão
    const defaultConfigs = [
      { key: 'business_hours', value: { monday: '09:00-18:00', tuesday: '09:00-18:00', wednesday: '09:00-18:00', thursday: '09:00-18:00', friday: '09:00-18:00', saturday: '08:00-17:00', sunday: null } },
      { key: 'appointment_settings', value: { default_duration: 30, buffer_time: 15, max_advance_booking_days: 60 } },
      { key: 'notification_settings', value: { email_confirmations: true, whatsapp_reminders: true, sms_notifications: false } }
    ];

    for (const config of defaultConfigs) {
      await client.query(`
        INSERT INTO ${schemaName}.configuracoes (chave, valor)
        VALUES ($1, $2)
      `, [config.key, JSON.stringify(config.value)]);
    }

    // Registrar uso inicial
    await client.query('SELECT update_tenant_usage($1, $2, $3)', [tenantId, 'usuarios', 1]);
    await client.query('SELECT update_tenant_usage($1, $2, $3)', [tenantId, 'servicos', defaultServices.length]);

    console.log(`✅ Dados iniciais populados para tenant ${tenantId}`);
  }

  /**
   * Obter limites do plano
   */
  getPlanLimits(planName) {
    const planLimits = {
      basico: {
        agendamentos_mes: 100,
        servicos: 5,
        usuarios: 2,
        armazenamento_mb: 100,
        api_requests_dia: 1000
      },
      profissional: {
        agendamentos_mes: 500,
        servicos: 20,
        usuarios: 5,
        armazenamento_mb: 500,
        api_requests_dia: 5000
      },
      premium: {
        agendamentos_mes: 2000,
        servicos: 100,
        usuarios: 20,
        armazenamento_mb: 2000,
        api_requests_dia: 20000
      }
    };

    return JSON.stringify(planLimits[planName] || planLimits.basico);
  }

  /**
   * Obter configurações padrão
   */
  getDefaultConfig() {
    return JSON.stringify({
      timezone: CONFIG.DEFAULT_TIMEZONE,
      moeda: 'BRL',
      idioma: 'pt-BR',
      notificacoes: {
        email: true,
        whatsapp: true,
        sms: false
      },
      business_hours: {
        monday: '09:00-18:00',
        tuesday: '09:00-18:00',
        wednesday: '09:00-18:00',
        thursday: '09:00-18:00',
        friday: '09:00-18:00',
        saturday: '08:00-17:00',
        sunday: null
      }
    });
  }

  /**
   * Gerar senha temporária
   */
  generateTempPassword() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Desprovisionar tenant (remover completamente)
   */
  async deprovisionTenant(tenantId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Buscar informações do tenant
      const tenantResult = await client.query(
        'SELECT schema_name FROM tenants WHERE id_tenant = $1 LIMIT 1',
        [tenantId]
      );

      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant não encontrado');
      }

      const schemaName = tenantResult.rows[0].schema_name;

      // Remover schema (se existir)
      if (schemaName && schemaName !== 'public') {
        await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      }

      // Remover tenant do banco principal
      await client.query('DELETE FROM tenants WHERE id_tenant = $1', [tenantId]);

      await client.query('COMMIT');

      console.log(`✅ Tenant ${tenantId} desprovisionado com sucesso`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro na desprovisionamento:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Atualizar plano do tenant
   */
  async updateTenantPlan(tenantId, newPlan) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validar plano
      const validPlans = ['basico', 'profissional', 'premium'];
      if (!validPlans.includes(newPlan)) {
        throw new Error('Plano inválido');
      }

      // Atualizar plano e limites
      await client.query(`
        UPDATE tenants
        SET plano = $1, limites = $2, data_atualizacao = NOW()
        WHERE id_tenant = $3
      `, [newPlan, this.getPlanLimits(newPlan), tenantId]);

      await client.query('COMMIT');

      console.log(`✅ Plano do tenant ${tenantId} atualizado para ${newPlan}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar plano:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Listar todos os tenants
   */
  async listTenants(filters = {}) {
    try {
      const rows = await pool.query('SELECT id_tenant, nome, email, telefone, schema_name, plano, status, limites, configuracoes, data_criacao FROM tenants ORDER BY id_tenant DESC');
      return rows.rows.map(r => ({
        id_tenant: r.id_tenant,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        schema_name: r.schema_name,
        plano: r.plano,
        status: r.status,
        limites: r.limites ? JSON.parse(r.limites) : null,
        configuracoes: r.configuracoes ? JSON.parse(r.configuracoes) : null,
        data_criacao: r.data_criacao
      }));
    } catch (error) {
      console.error('Erro ao listar tenants:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas gerais da plataforma (simplificado para SQLite)
   */
  async getPlatformStats() {
    try {
      const t = await pool.query('SELECT COUNT(*) as c FROM tenants');
      const u = await pool.query('SELECT COUNT(*) as c FROM usuarios');
      const d = await pool.query('SELECT plano FROM tenants');
      const dist = { basico: 0, profissional: 0, premium: 0 };
      d.rows.forEach(r => { dist[r.plano] = (dist[r.plano]||0)+1; });
      return {
        total_tenants: parseInt(t.rows[0].c||0),
        total_users: parseInt(u.rows[0].c||0),
        plan_distribution: dist
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

module.exports = TenantProvisioningService;
