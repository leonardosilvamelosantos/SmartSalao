#!/usr/bin/env node

/**
 * Script de Inicialização SQLite
 * Versão simplificada para desenvolvimento rápido
 */

const { pool } = require('../src/config/database-sqlite');
const fs = require('fs');
const path = require('path');

async function initSQLite() {
  try {
    console.log('🚀 Inicializando banco SQLite para desenvolvimento...');

    // 1. Verificar conexão
    console.log('📡 Verificando conexão com SQLite...');
    const test = await pool.query('SELECT datetime("now") as now');
    console.log('✅ Conectado ao SQLite com sucesso!');

    // 2. Criar tabelas básicas do sistema multi-tenant
    console.log('🏗️ Criando tabelas do sistema...');

    const tables = [
      // Tenants
      `CREATE TABLE IF NOT EXISTS tenants (
        id_tenant INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        telefone TEXT,
        documento TEXT,
        schema_name TEXT UNIQUE NOT NULL,
        plano TEXT DEFAULT 'basico',
        status TEXT DEFAULT 'ativo',
        limites TEXT DEFAULT '{"agendamentos_mes": 100, "servicos": 5, "usuarios": 2}',
        configuracoes TEXT DEFAULT '{"timezone": "America/Sao_Paulo"}',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_expiracao DATETIME,
        ultimo_acesso DATETIME
      )`,

      // Usuários por tenant
      `CREATE TABLE IF NOT EXISTS tenant_users (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tenant INTEGER NOT NULL,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        senha_hash TEXT NOT NULL,
        telefone TEXT,
        cargo TEXT DEFAULT 'funcionario',
        permissoes TEXT DEFAULT '{"admin": false, "agendamentos": true, "clientes": true, "servicos": true}',
        status TEXT DEFAULT 'ativo',
        ultimo_login DATETIME,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(id_tenant, email)
      )`,

      // Controle de uso
      `CREATE TABLE IF NOT EXISTS tenant_usage (
        id_usage INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tenant INTEGER NOT NULL,
        periodo DATE NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER DEFAULT 0,
        limite INTEGER DEFAULT 0,
        data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(id_tenant, periodo, tipo)
      )`,

      // Histórico de faturamento
      `CREATE TABLE IF NOT EXISTS tenant_billing (
        id_billing INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tenant INTEGER NOT NULL,
        periodo_inicio DATE NOT NULL,
        periodo_fim DATE NOT NULL,
        plano TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pendente',
        data_vencimento DATE NOT NULL,
        data_pagamento DATETIME,
        forma_pagamento TEXT,
        notas TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Logs de auditoria
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tenant INTEGER,
        id_usuario INTEGER,
        acao TEXT NOT NULL,
        tabela TEXT,
        registro_id INTEGER,
        dados_antigos TEXT,
        dados_novos TEXT,
        ip_address TEXT,
        user_agent TEXT,
        data_evento DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Executar criação das tabelas
    for (const tableSQL of tables) {
      await pool.query(tableSQL);
    }

    console.log('✅ Tabelas criadas com sucesso!');

    // 3. Verificar se tenant de teste existe
    console.log('🧪 Verificando tenant de teste...');
    const existing = await pool.query(
      'SELECT id_tenant FROM tenants WHERE email = ?',
      ['admin@teste.com']
    );

    if (existing.rows.length === 0) {
      console.log('⚠️ Tenant de teste não encontrado, criando...');

      // Criar tenant de teste
      await pool.query(`
        INSERT INTO tenants (nome, email, telefone, schema_name, plano, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'Sistema de Testes',
        'admin@teste.com',
        '+5511999999999',
        'tenant_teste',
        'premium',
        'ativo'
      ]);

      // Criar usuário admin
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      await pool.query(`
        INSERT INTO tenant_users (id_tenant, nome, email, senha_hash, cargo, permissoes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        1,
        'Administrador',
        'admin@teste.com',
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

      console.log('✅ Tenant de teste criado!');
    } else {
      console.log(`✅ Tenant de teste já existe (ID: ${existing.rows[0].id_tenant})`);
    }

    // 4. Criar tabelas do tenant de teste
    console.log('🏗️ Criando schema do tenant de teste...');

    const tenantTables = [
      // Usuários da barbearia
      `CREATE TABLE IF NOT EXISTS tenant_teste_usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT DEFAULT 'barbeiro',
        ativo INTEGER DEFAULT 1,
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Serviços
      `CREATE TABLE IF NOT EXISTS tenant_teste_servicos (
        id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        nome_servico TEXT NOT NULL,
        duracao_min INTEGER NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Clientes
      `CREATE TABLE IF NOT EXISTS tenant_teste_clientes (
        id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        nome TEXT NOT NULL,
        whatsapp TEXT UNIQUE,
        email TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Slots de horário
      `CREATE TABLE IF NOT EXISTS tenant_teste_slots (
        id_slot INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status TEXT DEFAULT 'free',
        id_agendamento INTEGER,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Agendamentos
      `CREATE TABLE IF NOT EXISTS tenant_teste_agendamentos (
        id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        id_servico INTEGER,
        id_cliente INTEGER,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status TEXT DEFAULT 'confirmed',
        valor_total DECIMAL(10,2),
        observacoes TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Executar criação das tabelas do tenant
    for (const tableSQL of tenantTables) {
      await pool.query(tableSQL);
    }

    console.log('✅ Schema do tenant criado com sucesso!');

    // 5. Popular dados de exemplo
    console.log('🎨 Populando dados de exemplo...');

    // Criar barbeiro de exemplo
    const barberCheck = await pool.query(
      'SELECT id_usuario FROM tenant_teste_usuarios WHERE tipo = ?',
      ['barbeiro']
    );

    if (barberCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const barberPassword = await bcrypt.hash('barber123', 12);

      await pool.query(`
        INSERT INTO tenant_teste_usuarios (nome, email, senha, tipo, ativo)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'João Barbeiro',
        'barbeiro@teste.com',
        barberPassword,
        'barbeiro',
        1
      ]);

      // Criar serviços de exemplo
      const services = [
        ['Corte Masculino', 30, 35.00],
        ['Corte Feminino', 60, 50.00],
        ['Barba', 20, 25.00],
        ['Sombrancelha', 15, 15.00]
      ];

      for (const [name, duration, price] of services) {
        await pool.query(`
          INSERT INTO tenant_teste_servicos (id_usuario, nome_servico, duracao_min, valor, ativo)
          VALUES (?, ?, ?, ?, ?)
        `, [1, name, duration, price, 1]);
      }

      console.log('✅ Dados de exemplo criados!');
    } else {
      console.log('✅ Dados de exemplo já existem');
    }

    // 6. Estatísticas finais
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM tenant_users) as total_users,
        (SELECT COUNT(*) FROM tenant_teste_usuarios) as tenant_users,
        (SELECT COUNT(*) FROM tenant_teste_servicos) as tenant_services
    `);

    console.log('');
    console.log('📊 Estatísticas do sistema:');
    console.log(`   - Tenants: ${stats.rows[0].total_tenants}`);
    console.log(`   - Usuários sistema: ${stats.rows[0].total_users}`);
    console.log(`   - Usuários tenant: ${stats.rows[0].tenant_users}`);
    console.log(`   - Serviços tenant: ${stats.rows[0].tenant_services}`);

    console.log('');
    console.log('🎉 Sistema SQLite inicializado com sucesso!');
    console.log('');
    console.log('📋 Credenciais para teste:');
    console.log('   Sistema Admin:');
    console.log('   📧 Email: admin@teste.com');
    console.log('   🔑 Senha: admin123');
    console.log('');
    console.log('   Barbeiro:');
    console.log('   📧 Email: barbeiro@teste.com');
    console.log('   🔑 Senha: barber123');
    console.log('');
    console.log('🚀 Execute: npm start');
    console.log('📱 Acesse: http://localhost:3000/admin/1');

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  initSQLite().catch(console.error);
}

module.exports = { initSQLite };
