/**
 * Configuração de Conexão com SQLite
 * Versão de desenvolvimento para testes rápidos
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Criar diretório para banco SQLite se não existir
const fs = require('fs');
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'agendamento_dev.db');

// Criar banco SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao banco SQLite em desenvolvimento');
  }
});

// NÃO substituir métodos nativos por promisify (quebra o binding do sqlite3)

// Wrapper para manter compatibilidade com PostgreSQL
class SQLitePool {
  constructor() {
    this.db = db;
  }

  async query(sql, params = []) {
    try {
      // Substituir placeholders PostgreSQL ($1, $2) por SQLite (?, ?)
      const sqliteSQL = sql.replace(/\$(\d+)/g, '?');

      const upper = sqliteSQL.trim().toUpperCase();
      const isSelect = upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA');

      if (isSelect) {
        return await new Promise((resolve, reject) => {
          this.db.all(sqliteSQL, params, function(err, rows) {
            if (err) return reject(err);
            resolve({ rows: rows || [], rowCount: (rows || []).length });
          });
        });
      }

      return await new Promise((resolve, reject) => {
        this.db.run(sqliteSQL, params, function(err) {
          if (err) return reject(err);
          resolve({ changes: this.changes || 0, lastID: this.lastID, rowCount: this.changes || 0 });
        });
      });
    } catch (error) {
      console.error('Erro na query SQLite:', error);
      throw error;
    }
  }

  async connect() {
    return this.db;
  }

  end() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Erro ao fechar conexão SQLite:', err);
        }
        resolve();
      });
    });
  }
}

const pool = new SQLitePool();

// Função para testar conexão
async function testConnection() {
  try {
    const result = await pool.query('SELECT datetime("now") as current_time, sqlite_version() as sqlite_version');
    return {
      success: true,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].sqlite_version,
      pool: {
        totalCount: 1,
        idleCount: 0,
        waitingCount: 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para executar queries
async function executeQuery(query, params = []) {
  return await pool.query(query, params);
}

// Função para executar transações
async function executeTransaction(callback) {
  const client = await pool.connect();

  try {
    // SQLite não tem transações explícitas como PostgreSQL
    // Mas podemos simular
    await client.run('BEGIN TRANSACTION');
    const result = await callback(client);
    await client.run('COMMIT');
    return { success: true, result };
  } catch (error) {
    await client.run('ROLLBACK');
    console.error('Erro na transação:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  dbConfig: {
    type: 'sqlite',
    path: dbPath
  }
};
