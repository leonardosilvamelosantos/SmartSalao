#!/usr/bin/env node

/**
 * Migra somente a tabela 'usuarios' do SQLite -> PostgreSQL
 * Mantém apenas colunas compatíveis com o schema atual do PG
 * Usa configuração centralizada do PostgreSQL
 */

const sqlite3 = require('sqlite3').verbose();
const pool = require('../src/config/postgresql');
const path = require('path');

async function run() {
  const sqlitePath = path.join(__dirname, '../data/agendamento_dev.db');
  const db = new sqlite3.Database(sqlitePath);

  const all = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

  try {
    console.log('🔄 Migrando usuários (SQLite -> PostgreSQL)...');

    const rows = await all(`SELECT 
      id_usuario,
      nome,
      email,
      senha_hash,
      COALESCE(tipo, 'barbeiro') AS tipo,
      COALESCE(ativo, 1) AS ativo,
      COALESCE(id_tenant, 1) AS id_tenant,
      COALESCE(timezone, 'America/Sao_Paulo') AS timezone
    FROM usuarios`);

    console.log(`📋 Encontrados ${rows.length} usuários no SQLite`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const u of rows) {
      try {
        // Tenta atualizar se já existe pelo email, senão insere
        const upsert = await pool.query(`
          INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo, id_tenant, timezone)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email)
          DO UPDATE SET nome = EXCLUDED.nome,
                        senha_hash = COALESCE(EXCLUDED.senha_hash, usuarios.senha_hash),
                        tipo = EXCLUDED.tipo,
                        ativo = EXCLUDED.ativo,
                        id_tenant = EXCLUDED.id_tenant,
                        timezone = EXCLUDED.timezone,
                        updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          u.nome || 'Usuário',
          u.email,
          u.senha_hash || null,
          u.tipo || 'barbeiro',
          (u.ativo === 1 || u.ativo === true),
          u.id_tenant || 1,
          u.timezone || 'America/Sao_Paulo'
        ]);

        if (upsert.rows[0] && upsert.rows[0].inserted) inserted++; else updated++;
      } catch (e) {
        skipped++;
        console.warn(`⚠️  Usuário pulado (${u.email}): ${e.message}`);
      }
    }

    console.log(`✅ Migração de usuários concluída: inseridos=${inserted}, atualizados=${updated}, pulados=${skipped}`);

  } catch (err) {
    console.error('❌ Erro na migração de usuários:', err.message);
    process.exit(1);
  } finally {
    db.close();
    await pool.end();
  }
}

run();


