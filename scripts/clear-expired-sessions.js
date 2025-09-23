const fs = require('fs');
const path = require('path');

async function clearExpiredSessions() {
    console.log('🧹 Limpando sessões expiradas...');

    try {
        // Limpar diretório de autenticação
        const authDir = './data/whatsapp-auth';
        if (fs.existsSync(authDir)) {
            console.log('🗑️ Removendo diretório de autenticação...');
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('✅ Diretório de autenticação removido');
        }

        // Limpar banco de dados
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('./data/database.sqlite');

        console.log('🗑️ Limpando tabelas do WhatsApp...');
        
        // Limpar tabelas do WhatsApp
        const tables = [
            'whatsapp_instances',
            'whatsapp_message_logs', 
            'whatsapp_sessions',
            'whatsapp_bot_configs',
            'whatsapp_message_templates'
        ];

        for (const table of tables) {
            try {
                await new Promise((resolve, reject) => {
                    db.run(`DELETE FROM ${table}`, (err) => {
                        if (err) {
                            console.log(`⚠️ Tabela ${table} não existe ou erro: ${err.message}`);
                        } else {
                            console.log(`✅ Tabela ${table} limpa`);
                        }
                        resolve();
                    });
                });
            } catch (error) {
                console.log(`⚠️ Erro ao limpar tabela ${table}: ${error.message}`);
            }
        }

        db.close();
        console.log('✅ Banco de dados limpo');

        console.log('✅ Limpeza concluída! Agora você pode testar com uma nova instância.');
        
    } catch (error) {
        console.error('❌ Erro na limpeza:', error.message);
    } finally {
        process.exit(0);
    }
}

clearExpiredSessions();
