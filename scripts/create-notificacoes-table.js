#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function createNotificacoesTable() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'agendamento',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🔧 Conectando ao PostgreSQL...');
    
    // Verificar se a tabela já existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notificacoes'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ Tabela notificacoes já existe');
      return;
    }

    console.log('🔧 Criando tabela notificacoes...');
    
    // Criar tabela notificacoes
    await pool.query(`
      CREATE TABLE notificacoes (
        id_notificacao SERIAL PRIMARY KEY,
        id_agendamento INTEGER,
        tipo VARCHAR(50) NOT NULL,
        enviada BOOLEAN DEFAULT false,
        message_id VARCHAR(255),
        enviada_em TIMESTAMPTZ,
        erro TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Criar índices
    await pool.query(`
      CREATE INDEX idx_notificacoes_agendamento ON notificacoes(id_agendamento);
    `);
    
    await pool.query(`
      CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);
    `);
    
    await pool.query(`
      CREATE INDEX idx_notificacoes_enviada ON notificacoes(enviada);
    `);

    console.log('✅ Tabela notificacoes criada com sucesso!');
    console.log('✅ Índices criados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela notificacoes:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createNotificacoesTable();


