#!/usr/bin/env node

/**
 * Script de Migração SQLite para PostgreSQL
 * Migra todos os dados do SQLite para PostgreSQL mantendo integridade
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class SQLiteToPostgreSQLMigrator {
  constructor() {
    // Configuração SQLite
    this.sqlitePath = path.join(__dirname, '../data/agendamento_dev.db');
    
    // Configuração PostgreSQL
    this.pgConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'agendamento',
      user: process.env.DB_USER || 'agendamento_user',
      password: process.env.DB_PASSWORD || 'agendamento_pass_2024',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };
    
    this.sqliteDb = null;
    this.pgPool = null;
    this.migrationStats = {
      tables: 0,
      records: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async run() {
    console.log('🔄 Iniciando migração SQLite → PostgreSQL...\n');
    
    this.migrationStats.startTime = new Date();
    
    try {
      await this.connectDatabases();
      await this.validateData();
      await this.migrateTables();
      await this.verifyMigration();
      
      this.migrationStats.endTime = new Date();
      this.printStats();
      
      console.log('\n✅ Migração concluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro na migração:', error.message);
      process.exit(1);
    } finally {
      await this.closeConnections();
    }
  }

  async connectDatabases() {
    console.log('🔌 Conectando aos bancos de dados...');
    
    // Conectar SQLite
    if (!fs.existsSync(this.sqlitePath)) {
      throw new Error(`Arquivo SQLite não encontrado: ${this.sqlitePath}`);
    }
    
    this.sqliteDb = new sqlite3.Database(this.sqlitePath);
    console.log('✅ SQLite conectado');
    
    // Conectar PostgreSQL
    this.pgPool = new Pool(this.pgConfig);
    const client = await this.pgPool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('✅ PostgreSQL conectado');
    } finally {
      client.release();
    }
  }

  async validateData() {
    console.log('🔍 Validando dados no SQLite...');
    
    const tables = await this.getSQLiteTables();
    console.log(`📋 Encontradas ${tables.length} tabelas: ${tables.join(', ')}`);
    
    for (const table of tables) {
      const count = await this.getSQLiteTableCount(table);
      console.log(`  - ${table}: ${count} registros`);
    }
  }

  async migrateTables() {
    console.log('\n📦 Migrando tabelas...');
    
    const tables = await this.getSQLiteTables();
    
    for (const table of tables) {
      try {
        await this.migrateTable(table);
        this.migrationStats.tables++;
      } catch (error) {
        console.error(`❌ Erro ao migrar tabela ${table}:`, error.message);
        this.migrationStats.errors++;
      }
    }
  }

  async migrateTable(tableName) {
    console.log(`🔄 Migrando tabela: ${tableName}`);
    
    // Obter estrutura da tabela
    const columns = await this.getSQLiteTableColumns(tableName);
    const data = await this.getSQLiteTableData(tableName);
    
    if (data.length === 0) {
      console.log(`  ⚠️ Tabela ${tableName} está vazia, pulando...`);
      return;
    }
    
    // Preparar query de INSERT para PostgreSQL
    const columnNames = columns.map(col => col.name).join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    // Migrar dados em lotes
    const batchSize = 100;
    const client = await this.pgPool.connect();
    
    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const row of batch) {
          const values = columns.map(col => {
            let value = row[col.name];
            
            // Converter tipos específicos
            if (col.type === 'BOOLEAN' && typeof value === 'number') {
              value = value === 1;
            } else if (col.type === 'JSONB' && typeof value === 'string') {
              try {
                value = JSON.parse(value);
              } catch (e) {
                value = value;
              }
            } else if (col.type.includes('TIMESTAMP') && value) {
              // Converter timestamp do SQLite para PostgreSQL
              value = new Date(value).toISOString();
            }
            
            return value;
          });
          
          try {
            await client.query(insertQuery, values);
            this.migrationStats.records++;
          } catch (error) {
            if (!error.message.includes('duplicate key')) {
              console.warn(`⚠️ Erro ao inserir registro na tabela ${tableName}:`, error.message);
            }
          }
        }
      }
      
      console.log(`  ✅ ${tableName}: ${data.length} registros migrados`);
      
    } finally {
      client.release();
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Verificando migração...');
    
    const client = await this.pgPool.connect();
    
    try {
      const tables = await this.getSQLiteTables();
      
      for (const table of tables) {
        const sqliteCount = await this.getSQLiteTableCount(table);
        const pgCount = await this.getPostgreSQLTableCount(table, client);
        
        if (sqliteCount === pgCount) {
          console.log(`✅ ${table}: ${pgCount} registros (OK)`);
        } else {
          console.log(`⚠️ ${table}: SQLite=${sqliteCount}, PostgreSQL=${pgCount} (DIFERENÇA)`);
        }
      }
      
    } finally {
      client.release();
    }
  }

  async getSQLiteTables() {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });
  }

  async getSQLiteTableColumns(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) reject(err);
        else {
          const columns = rows.map(row => ({
            name: row.name,
            type: this.mapSQLiteTypeToPostgreSQL(row.type),
            notnull: row.notnull === 1,
            pk: row.pk === 1
          }));
          resolve(columns);
        }
      });
    });
  }

  async getSQLiteTableData(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getSQLiteTableCount(tableName) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  async getPostgreSQLTableCount(tableName, client) {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  mapSQLiteTypeToPostgreSQL(sqliteType) {
    const typeMap = {
      'INTEGER': 'INTEGER',
      'TEXT': 'TEXT',
      'VARCHAR': 'VARCHAR',
      'REAL': 'DECIMAL',
      'NUMERIC': 'DECIMAL',
      'BLOB': 'BYTEA',
      'DATETIME': 'TIMESTAMPTZ',
      'DATE': 'DATE',
      'TIME': 'TIME'
    };
    
    const upperType = sqliteType.toUpperCase();
    return typeMap[upperType] || 'TEXT';
  }

  printStats() {
    const duration = this.migrationStats.endTime - this.migrationStats.startTime;
    
    console.log('\n📊 Estatísticas da Migração:');
    console.log(`- Tabelas migradas: ${this.migrationStats.tables}`);
    console.log(`- Registros migrados: ${this.migrationStats.records}`);
    console.log(`- Erros: ${this.migrationStats.errors}`);
    console.log(`- Duração: ${Math.round(duration / 1000)}s`);
  }

  async closeConnections() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.pgPool) {
      await this.pgPool.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const migrator = new SQLiteToPostgreSQLMigrator();
  migrator.run();
}

module.exports = SQLiteToPostgreSQLMigrator;
