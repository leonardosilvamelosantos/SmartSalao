#!/usr/bin/env node

/**
 * Script para criar a tabela de configurações no SQLite
 */

const { pool } = require('../src/config/database-sqlite');

async function createConfiguracoesTable() {
  try {
    console.log('🔧 Criando tabela configuracoes...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS configuracoes (
        id_configuracao INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        nome_estabelecimento TEXT DEFAULT '',
        cnpj TEXT DEFAULT '',
        endereco TEXT DEFAULT '',
        cep TEXT DEFAULT '',
        cidade TEXT DEFAULT '',
        estado TEXT DEFAULT '',
        bairro TEXT DEFAULT '',
        telefone TEXT DEFAULT '',
        whatsapp TEXT DEFAULT '',
        email_contato TEXT DEFAULT '',
        horario_abertura TEXT DEFAULT '08:00',
        horario_fechamento TEXT DEFAULT '18:00',
        dias_funcionamento TEXT DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta"]',
        intervalo_agendamento INTEGER DEFAULT 30,
        notificar_agendamentos INTEGER DEFAULT 1,
        notificar_cancelamentos INTEGER DEFAULT 1,
        lembrete_cliente INTEGER DEFAULT 1,
        horas_lembrete INTEGER DEFAULT 24,
        metodo_pagamento_padrao TEXT DEFAULT 'dinheiro',
        aceitar_pix INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
      )
    `;

    await pool.query(createTableSQL);
    console.log('✅ Tabela configuracoes criada com sucesso!');

    // Criar índice para melhor performance
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_configuracoes_usuario 
      ON configuracoes(id_usuario)
    `;

    await pool.query(createIndexSQL);
    console.log('✅ Índice criado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela configuracoes:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createConfiguracoesTable()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = createConfiguracoesTable;
