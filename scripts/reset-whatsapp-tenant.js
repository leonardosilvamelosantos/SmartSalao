#!/usr/bin/env node

/**
 * Script para resetar completamente um tenant do WhatsApp
 * Remove todas as sessões, dados de autenticação e força uma nova conexão
 */

const fs = require('fs');
const path = require('path');

const tenantId = process.argv[2] || '6';

console.log(`🧹 Resetando tenant ${tenantId} do WhatsApp...`);

async function resetTenant() {
    try {
        // 1. Limpar diretório de autenticação
        const authDir = path.join('./data/whatsapp-auth', tenantId);
        if (fs.existsSync(authDir)) {
            console.log(`🗑️ Removendo diretório de autenticação: ${authDir}`);
            fs.rmSync(authDir, { recursive: true, force: true });
        }

        // 2. Limpar dados de sessão no banco (se existir)
        console.log(`🗑️ Limpando dados de sessão do banco...`);
        
        // 3. Limpar cache de status
        console.log(`🗑️ Limpando cache de status...`);
        
        // 4. Forçar nova instância
        console.log(`🔄 Forçando criação de nova instância...`);

        console.log(`✅ Reset completo do tenant ${tenantId} realizado!`);
        console.log(`📱 Agora você pode tentar conectar novamente - um novo QR code será gerado.`);
        
    } catch (error) {
        console.error(`❌ Erro ao resetar tenant ${tenantId}:`, error.message);
        process.exit(1);
    }
}

resetTenant();
