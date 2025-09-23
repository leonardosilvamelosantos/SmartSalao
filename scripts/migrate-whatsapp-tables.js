/**
 * Script de Migração - Tabelas WhatsApp
 * Cria as tabelas necessárias para o sistema WhatsApp multi-tenant
 */

const path = require('path');
const pool = require('../src/config/database');

const whatsappTablesSQL = `
        -- Tabela para instâncias WhatsApp
        CREATE TABLE IF NOT EXISTS whatsapp_instances (
          id_instancia INTEGER PRIMARY KEY AUTOINCREMENT,
          id_tenant INTEGER NOT NULL,
          instance_id TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'disconnected',
          qr_code TEXT,
          pairing_code TEXT,
          phone_number TEXT,
          connection_method TEXT DEFAULT 'qr',
          last_activity DATETIME,
          connection_data TEXT, -- JSON com dados de conexão
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant)
        );

-- Tabela para logs de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id_log INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER NOT NULL,
  id_instancia INTEGER NOT NULL,
  direction TEXT NOT NULL, -- 'sent' ou 'received'
  from_number TEXT,
  to_number TEXT,
  message_content TEXT,
  message_type TEXT DEFAULT 'text',
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
  FOREIGN KEY (id_instancia) REFERENCES whatsapp_instances(id_instancia)
);

-- Tabela para sessões ativas
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id_sessao INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER NOT NULL,
  session_data TEXT, -- JSON com dados da sessão
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant)
);

-- Tabela para configurações de bot
CREATE TABLE IF NOT EXISTS whatsapp_bot_configs (
  id_config INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER NOT NULL,
  bot_enabled INTEGER DEFAULT 1,
  auto_reply INTEGER DEFAULT 1,
  welcome_message TEXT,
  business_hours TEXT, -- JSON com horários de funcionamento
  triggers TEXT, -- JSON com gatilhos personalizados
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant)
);

-- Tabela para templates de mensagem
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id_template INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tenant INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  template_type TEXT DEFAULT 'text', -- text, image, document
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON whatsapp_instances(id_tenant);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_id ON whatsapp_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_tenant ON whatsapp_message_logs(id_tenant);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON whatsapp_message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_message_logs_direction ON whatsapp_message_logs(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant ON whatsapp_sessions(id_tenant);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON whatsapp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_bot_configs_tenant ON whatsapp_bot_configs(id_tenant);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON whatsapp_message_templates(id_tenant);
CREATE INDEX IF NOT EXISTS idx_templates_active ON whatsapp_message_templates(is_active);
`;

async function migrateWhatsAppTables() {
  try {
    console.log('🚀 Iniciando migração das tabelas WhatsApp...\n');

    // Executar cada statement separadamente
    const statements = whatsappTablesSQL.split(';').filter(stmt => stmt.trim());

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`📝 Executando statement ${i + 1}/${statements.length}...`);
        await pool.query(statement);
      }
    }

    console.log('\n✅ Tabelas WhatsApp criadas com sucesso!');

    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const tables = [
      'whatsapp_instances',
      'whatsapp_message_logs', 
      'whatsapp_sessions',
      'whatsapp_bot_configs',
      'whatsapp_message_templates'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Tabela ${table}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`❌ Erro ao verificar tabela ${table}:`, error.message);
      }
    }

    // Inserir configurações padrão
    console.log('\n📋 Inserindo configurações padrão...');
    
    // Configuração padrão do bot
    const defaultBotConfig = `
      INSERT OR IGNORE INTO whatsapp_bot_configs 
      (id_tenant, bot_enabled, auto_reply, welcome_message, business_hours, triggers)
      VALUES (1, 1, 1, 'Olá! 👋 Bem-vindo ao nosso sistema de agendamentos!', 
              '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "08:00", "end": "14:00"}, "sunday": {"start": "09:00", "end": "13:00"}}',
              '{"!bot": "Olá! Sou o bot de agendamentos. Como posso ajudar?", "agendar": "Para agendar, digite: serviços", "horários": "Nossos horários: Seg-Sex 8h-18h, Sáb 8h-14h, Dom 9h-13h"}')
    `;

    await pool.query(defaultBotConfig);

    // Templates de mensagem padrão
    const defaultTemplates = [
      `INSERT OR IGNORE INTO whatsapp_message_templates 
       (id_tenant, template_name, template_content, template_type) 
       VALUES (1, 'welcome', 'Olá! 👋 Bem-vindo ao nosso sistema de agendamentos!', 'text')`,
      
      `INSERT OR IGNORE INTO whatsapp_message_templates 
       (id_tenant, template_name, template_content, template_type) 
       VALUES (1, 'booking_confirmation', '✅ Agendamento confirmado para {date} às {time}!', 'text')`,
      
      `INSERT OR IGNORE INTO whatsapp_message_templates 
       (id_tenant, template_name, template_content, template_type) 
       VALUES (1, 'booking_reminder', '⏰ Lembrete: Seu agendamento é amanhã às {time}!', 'text')`,
      
      `INSERT OR IGNORE INTO whatsapp_message_templates 
       (id_tenant, template_name, template_content, template_type) 
       VALUES (1, 'services_list', '📋 Nossos serviços disponíveis:\\n{services}', 'text')`
    ];

    for (const template of defaultTemplates) {
      await pool.query(template);
    }

    console.log('✅ Configurações padrão inseridas com sucesso!');

    // Estatísticas finais
    console.log('\n📊 Estatísticas da migração:');
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM whatsapp_instances) as instances,
        (SELECT COUNT(*) FROM whatsapp_message_logs) as message_logs,
        (SELECT COUNT(*) FROM whatsapp_sessions) as sessions,
        (SELECT COUNT(*) FROM whatsapp_bot_configs) as bot_configs,
        (SELECT COUNT(*) FROM whatsapp_message_templates) as templates
    `);

    const statsData = stats.rows[0];
    console.log(`📱 Instâncias: ${statsData.instances}`);
    console.log(`📝 Logs de mensagem: ${statsData.message_logs}`);
    console.log(`🔐 Sessões: ${statsData.sessions}`);
    console.log(`🤖 Configurações de bot: ${statsData.bot_configs}`);
    console.log(`📄 Templates: ${statsData.templates}`);

    console.log('\n🎉 Migração das tabelas WhatsApp concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateWhatsAppTables()
    .then(() => {
      console.log('\n🏁 Migração concluída');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal na migração:', error);
      process.exit(1);
    });
}

module.exports = migrateWhatsAppTables;
