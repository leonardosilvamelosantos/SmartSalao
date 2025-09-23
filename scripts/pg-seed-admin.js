#!/usr/bin/env node

/**
 * Seed de admin para PostgreSQL
 * Uso (PowerShell):
 *   $env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:DB_NAME='agendamento'; $env:DB_USER='agendamento_user'; $env:DB_PASSWORD='agendamento_pass_2024'; node scripts/pg-seed-admin.js admin@teste.com admin123 "Admin Sistema"
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const email = process.argv[2] || 'admin@teste.com';
  const senha = process.argv[3] || 'admin123';
  const nome  = process.argv[4] || 'Admin Sistema';

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'agendamento',
    user: process.env.DB_USER || 'agendamento_user',
    password: process.env.DB_PASSWORD || 'agendamento_pass_2024',
    ssl: false,
  };

  const pool = new Pool(config);

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const senha_hash = await bcrypt.hash(senha, rounds);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(20),
        tipo VARCHAR(50) DEFAULT 'admin',
        ativo BOOLEAN DEFAULT true,
        id_tenant INTEGER DEFAULT 1,
        timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const exists = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      console.log('ℹ️  Admin já existe:', email);
      return;
    }

    const insert = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo, timezone)
       VALUES ($1, $2, $3, 'admin', true, 'America/Sao_Paulo') RETURNING id_usuario, nome, email, tipo, ativo, created_at`,
      [nome, email, senha_hash]
    );

    console.log('✅ Admin criado:', insert.rows[0]);
  } catch (err) {
    console.error('❌ Erro ao criar admin (PostgreSQL):', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();


