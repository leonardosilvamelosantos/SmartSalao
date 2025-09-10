/**
 * Inicialização do banco SQLite
 */
const path = require('path');
const pool = require(path.join(__dirname, '../config/database'));

async function initSQLite() {
  try {
    console.log('🚀 Inicializando banco SQLite...');

    // Criar tabelas básicas
    const createTables = `
      -- Usuários
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        whatsapp TEXT,
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Serviços
      CREATE TABLE IF NOT EXISTS servicos (
        id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        nome_servico TEXT NOT NULL,
        duracao_min INTEGER NOT NULL,
        valor REAL NOT NULL,
        descricao TEXT,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Clientes
      CREATE TABLE IF NOT EXISTS clientes (
        id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        nome TEXT,
        whatsapp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Agendamentos
      CREATE TABLE IF NOT EXISTS agendamentos (
        id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        id_cliente INTEGER,
        id_servico INTEGER,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status TEXT DEFAULT 'confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Executar cada statement separadamente
    const statements = createTables.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement.trim());
      }
    }

    // Inserir dados de teste
    console.log('📝 Inserindo dados de teste...');

    // Verificar se já existe usuário de teste
    const existingUser = await pool.query('SELECT id_usuario FROM usuarios WHERE whatsapp = ?', ['55999999999']);
    if (existingUser.rows.length === 0) {
      await pool.query(
        'INSERT INTO usuarios (nome, whatsapp) VALUES (?, ?)',
        ['João Barbeiro', '55999999999']
      );
      console.log('✅ Usuário de teste criado');
    }

    console.log('✅ Banco SQLite inicializado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao inicializar SQLite:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initSQLite()
    .then(() => {
      console.log('🎉 Inicialização concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na inicialização:', error);
      process.exit(1);
    });
}

module.exports = initSQLite;
