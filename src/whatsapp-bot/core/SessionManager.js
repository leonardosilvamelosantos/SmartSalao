const path = require('path');
const db = require('../../config/database');
const pool = db.pool || db;

/**
 * Gerenciador de Sessões WhatsApp
 * Gerencia persistência de instâncias e mensagens no SQLite
 */
class SessionManager {
  constructor() {
    this.ensureTables();
  }

  /**
   * Garantir que as tabelas existem
   */
  async ensureTables() {
    try {
      const createTablesSQL = `
        -- Tabela para instâncias WhatsApp
        CREATE TABLE IF NOT EXISTS whatsapp_instances (
          id_instancia ${db.isSQLite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
          id_tenant INTEGER NOT NULL,
          instance_id TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'disconnected',
          qr_code TEXT,
          last_activity ${db.isSQLite ? 'DATETIME' : 'TIMESTAMPTZ'},
          connection_data TEXT,
          created_at ${db.isSQLite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'TIMESTAMPTZ DEFAULT NOW()'},
          updated_at ${db.isSQLite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'TIMESTAMPTZ DEFAULT NOW()'}
        );

        -- Tabela para logs de mensagens
        CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
          id_log ${db.isSQLite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
          id_tenant INTEGER NOT NULL,
          id_instancia INTEGER NOT NULL,
          direction TEXT NOT NULL, -- 'sent' ou 'received'
          from_number TEXT,
          to_number TEXT,
          message_content TEXT,
          message_type TEXT DEFAULT 'text',
          message_id TEXT,
          status TEXT DEFAULT 'sent',
          created_at ${db.isSQLite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'TIMESTAMPTZ DEFAULT NOW()'}
        );

        -- Tabela para sessões ativas
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
          id_sessao ${db.isSQLite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
          id_tenant INTEGER NOT NULL,
          session_data TEXT, -- JSON com dados da sessão
          expires_at ${db.isSQLite ? 'DATETIME' : 'TIMESTAMPTZ'},
          created_at ${db.isSQLite ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'TIMESTAMPTZ DEFAULT NOW()'}
        );

        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON whatsapp_instances(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
        CREATE INDEX IF NOT EXISTS idx_message_logs_tenant ON whatsapp_message_logs(id_tenant);
        CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON whatsapp_message_logs(created_at);
      `;

      // Executar cada statement separadamente
      const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      console.log('✅ Tabelas do WhatsApp criadas/verificadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar tabelas do WhatsApp:', error);
    }
  }

  /**
   * Salvar instância
   * @param {string} tenantId - ID do tenant
   * @param {Object} instanceData - Dados da instância
   * @returns {Promise<void>}
   */
  async saveInstance(tenantId, instanceData) {
    try {
      const sql = `
        ${db.isSQLite ? 'INSERT OR REPLACE' : 'INSERT INTO'} whatsapp_instances 
        (id_tenant, instance_id, status, last_activity, connection_data, updated_at)
        VALUES (?, ?, ?, ?, ?, ${db.isSQLite ? 'CURRENT_TIMESTAMP' : 'NOW()'})
        ${db.isSQLite ? '' : 'ON CONFLICT (instance_id) DO UPDATE SET status = EXCLUDED.status, last_activity = EXCLUDED.last_activity, connection_data = EXCLUDED.connection_data, updated_at = NOW()'}
      `;

      const connectionData = JSON.stringify({
        createdAt: instanceData.createdAt,
        lastActivity: instanceData.lastActivity,
        status: instanceData.status
      });

      await pool.query(sql, [
        tenantId,
        tenantId, // instance_id = tenantId
        instanceData.status || 'disconnected',
        instanceData.lastActivity || new Date(),
        connectionData
      ]);

      // console.log(`💾 Instância salva para tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Erro ao salvar instância para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Atualizar status da instância
   * @param {string} tenantId - ID do tenant
   * @param {string} status - Novo status
   * @returns {Promise<void>}
   */
  async updateInstanceStatus(tenantId, status) {
    try {
      const sql = `
        UPDATE whatsapp_instances 
        SET status = ?, last_activity = ${db.isSQLite ? 'CURRENT_TIMESTAMP' : 'NOW()'}, updated_at = ${db.isSQLite ? 'CURRENT_TIMESTAMP' : 'NOW()'}
        WHERE id_tenant = ? AND instance_id = ?
      `;

      await pool.query(sql, [status, tenantId, tenantId]);
      // console.log(`🔄 Status atualizado para tenant ${tenantId}: ${status}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar status para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Salvar QR Code
   * @param {string} tenantId - ID do tenant
   * @param {Object} qrData - Dados do QR Code
   * @returns {Promise<void>}
   */
  async saveQRCode(tenantId, qrData) {
    try {
      const sql = `
        UPDATE whatsapp_instances 
        SET qr_code = ?, updated_at = ${db.isSQLite ? 'CURRENT_TIMESTAMP' : 'NOW()'}
        WHERE id_tenant = ? AND instance_id = ?
      `;

      await pool.query(sql, [JSON.stringify(qrData), tenantId, tenantId]);
      // console.log(`📱 QR Code salvo para tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Erro ao salvar QR Code para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Salvar código de pareamento
   * @param {string} tenantId - ID do tenant
   * @param {Object} pairingData - Dados do código de pareamento
   * @returns {Promise<void>}
   */
  async savePairingCode(tenantId, pairingData) {
    try {
      const sql = `
        UPDATE whatsapp_instances 
        SET pairing_code = ?, updated_at = ${db.isSQLite ? 'CURRENT_TIMESTAMP' : 'NOW()'}
        WHERE id_tenant = ? AND instance_id = ?
      `;

      await pool.query(sql, [JSON.stringify(pairingData), tenantId, tenantId]);
      // console.log(`🔐 Código de pareamento salvo para tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Erro ao salvar código de pareamento para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Remover instância
   * @param {string} tenantId - ID do tenant
   * @returns {Promise<void>}
   */
  async removeInstance(tenantId) {
    try {
      const sql = `
        DELETE FROM whatsapp_instances 
        WHERE id_tenant = ? AND instance_id = ?
      `;

      await pool.query(sql, [tenantId, tenantId]);
      // console.log(`🗑️ Instância removida para tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Erro ao remover instância para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Log de mensagem
   * @param {string} tenantId - ID do tenant
   * @param {string} direction - Direção (sent/received)
   * @param {string} to - Destinatário
   * @param {string} content - Conteúdo da mensagem
   * @param {string} type - Tipo da mensagem
   * @param {string} messageId - ID da mensagem
   * @returns {Promise<void>}
   */
  async logMessage(tenantId, direction, to, content, type = 'text', messageId = null) {
    try {
      // Buscar ID da instância
      const instanceResult = await pool.query(
        'SELECT id_instancia FROM whatsapp_instances WHERE id_tenant = ? AND instance_id = ?',
        [tenantId, tenantId]
      );

      if (instanceResult.rows.length === 0) {
        // console.log(`⚠️ Instância não encontrada para tenant ${tenantId}`); // Otimizado - log removido
        return;
      }

      const idInstancia = instanceResult.rows[0].id_instancia;

      const sql = `
        INSERT INTO whatsapp_message_logs 
        (id_tenant, id_instancia, direction, to_number, message_content, message_type, message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(sql, [
        tenantId,
        idInstancia,
        direction,
        to,
        content,
        type,
        messageId
      ]);

      // console.log(`📝 Mensagem logada para tenant ${tenantId}: ${direction}`);
    } catch (error) {
      console.error(`❌ Erro ao logar mensagem para tenant ${tenantId}:`, error);
    }
  }

  /**
   * Obter instâncias de um tenant
   * @param {string} tenantId - ID do tenant
   * @returns {Promise<Array>} - Lista de instâncias
   */
  async getInstancesByTenant(tenantId) {
    try {
      const sql = `
        SELECT * FROM whatsapp_instances 
        WHERE id_tenant = ?
        ORDER BY updated_at DESC
      `;

      const result = await pool.query(sql, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error(`❌ Erro ao buscar instâncias para tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Obter todas as instâncias
   * @returns {Promise<Array>} - Lista de todas as instâncias
   */
  async getAllInstances() {
    try {
      const sql = `
        SELECT wi.*, t.nome as nome_tenant 
        FROM whatsapp_instances wi
        LEFT JOIN tenants t ON wi.id_tenant = t.id_tenant
        ORDER BY wi.updated_at DESC
      `;

      const result = await pool.query(sql);
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar todas as instâncias:', error);
      return [];
    }
  }

  /**
   * Obter logs de mensagens
   * @param {string} tenantId - ID do tenant (opcional)
   * @param {number} limit - Limite de registros
   * @returns {Promise<Array>} - Lista de logs
   */
  async getMessageLogs(tenantId = null, limit = 100) {
    try {
      let sql = `
        SELECT ml.*, wi.instance_id${db.isSQLite ? '' : ''}
        FROM whatsapp_message_logs ml
        LEFT JOIN whatsapp_instances wi ON ml.id_instancia = wi.id_instancia
      `;

      const params = [];

      if (tenantId) {
        sql += ' WHERE ml.id_tenant = ?';
        params.push(tenantId);
      }

      sql += ' ORDER BY ml.created_at DESC LIMIT ?';
      params.push(limit);

      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar logs de mensagens:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas
   * @param {string} tenantId - ID do tenant (opcional)
   * @returns {Promise<Object>} - Estatísticas
   */
  async getStats(tenantId = null) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_instances,
          COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_instances,
          COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnected_instances,
          COUNT(CASE WHEN qr_code IS NOT NULL THEN 1 END) as instances_with_qr
        FROM whatsapp_instances
      `;

      const params = [];

      if (tenantId) {
        sql += ' WHERE id_tenant = ?';
        params.push(tenantId);
      }

      const result = await pool.query(sql, params);
      const stats = result.rows[0];

      // Adicionar estatísticas de mensagens
      let messageSql = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent_messages,
          COUNT(CASE WHEN direction = 'received' THEN 1 END) as received_messages
        FROM whatsapp_message_logs
      `;

      if (tenantId) {
        messageSql += ' WHERE id_tenant = ?';
      }

      const messageResult = await pool.query(messageSql, tenantId ? [tenantId] : []);
      const messageStats = messageResult.rows[0];

      return {
        ...stats,
        ...messageStats
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return {
        total_instances: 0,
        connected_instances: 0,
        disconnected_instances: 0,
        instances_with_qr: 0,
        total_messages: 0,
        sent_messages: 0,
        received_messages: 0
      };
    }
  }

  /**
   * Limpar logs antigos
   * @param {number} days - Dias para manter
   * @returns {Promise<void>}
   */
  async cleanupOldLogs(days = 30) {
    try {
      const sql = `
        DELETE FROM whatsapp_message_logs 
        WHERE created_at < datetime('now', '-${days} days')
      `;

      const result = await pool.query(sql);
      console.log(`🧹 ${result.changes} logs antigos removidos`);
    } catch (error) {
      console.error('❌ Erro ao limpar logs antigos:', error);
    }
  }

  /**
   * Obter instância por ID
   * @param {string} tenantId - ID do tenant
   * @returns {Promise<Object|null>} - Dados da instância
   */
  async getInstanceById(tenantId) {
    try {
      const sql = `
        SELECT * FROM whatsapp_instances 
        WHERE id_tenant = ? AND instance_id = ?
      `;

      const result = await pool.query(sql, [tenantId, tenantId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error(`❌ Erro ao buscar instância ${tenantId}:`, error);
      return null;
    }
  }
}

module.exports = SessionManager;
