/**
 * Script de diagnóstico e correção para problemas de QR Code WhatsApp
 * Resolve problemas de firewall, rede e renderização do QR code
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WhatsAppDiagnoser {
    constructor() {
        this.issues = [];
        this.fixes = [];
    }

    /**
     * Executa diagnóstico completo
     */
    async runFullDiagnosis() {
        console.log('🔍 DIAGNÓSTICO COMPLETO DO WHATSAPP BOT\n');
        console.log('=' .repeat(50));

        await this.checkServerStatus();
        await this.checkNetworkConnectivity();
        await this.checkWhatsAppConnectivity();
        await this.checkQRCodeRendering();
        await this.checkFirewallSettings();
        await this.checkSessionFiles();

        this.displayResults();
        this.suggestFixes();
    }

    /**
     * Verifica se o servidor está rodando
     */
    async checkServerStatus() {
        console.log('📡 Verificando servidor...');
        try {
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                console.log('✅ Servidor está rodando');
            } else {
                this.issues.push('Servidor não está respondendo corretamente');
            }
        } catch (error) {
            this.issues.push('Servidor não está acessível');
            this.fixes.push('Execute: npm start');
        }
    }

    /**
     * Verifica conectividade de rede
     */
    async checkNetworkConnectivity() {
        console.log('🌐 Verificando conectividade de rede...');

        try {
            // Testa conexão com servidores do WhatsApp
            const whatsappHosts = [
                'web.whatsapp.com',
                'w1.web.whatsapp.com',
                'w2.web.whatsapp.com',
                'w3.web.whatsapp.com'
            ];

            for (const host of whatsappHosts) {
                try {
                    const response = await fetch(`https://${host}`, {
                        method: 'HEAD',
                        timeout: 5000
                    });
                    if (response.ok) {
                        console.log(`✅ Conexão com ${host}: OK`);
                        break;
                    }
                } catch (error) {
                    // Continua tentando outros hosts
                }
            }
        } catch (error) {
            this.issues.push('Problemas de conectividade com WhatsApp');
            this.fixes.push('Verifique sua conexão com a internet');
        }
    }

    /**
     * Verifica conectividade do WhatsApp no sistema
     */
    async checkWhatsAppConnectivity() {
        console.log('📱 Verificando conectividade WhatsApp...');

        try {
            const response = await fetch('http://localhost:3000/api/bot/tenants');
            const data = await response.json();

            if (data.success && data.data.tenants.length > 0) {
                console.log('✅ API do WhatsApp está funcionando');

                // Verifica status de um tenant
                const tenantResponse = await fetch('http://localhost:3000/api/bot/tenants/1/status');
                const tenantData = await tenantResponse.json();

                if (tenantData.success) {
                    console.log('✅ Tenant está configurado');
                }
            }
        } catch (error) {
            this.issues.push('API do WhatsApp não está funcionando');
        }
    }

    /**
     * Verifica renderização do QR Code
     */
    checkQRCodeRendering() {
        console.log('📊 Verificando renderização do QR Code...');

        // Verifica se estamos no Windows
        if (os.platform() === 'win32') {
            console.log('🪟 Windows detectado - possíveis problemas de renderização');

            // Verifica se temos uma sessão existente
            const sessionPath = path.join(__dirname, 'src', 'data', 'whatsapp-auth', '1');
            if (fs.existsSync(sessionPath)) {
                console.log('📁 Sessão WhatsApp encontrada');
            } else {
                console.log('📁 Nenhuma sessão WhatsApp encontrada');
                this.fixes.push('Limpe dados antigos: rm -rf src/data/whatsapp-auth');
            }
        }
    }

    /**
     * Verifica configurações de firewall
     */
    checkFirewallSettings() {
        console.log('🔥 Verificando configurações de firewall...');

        if (os.platform() === 'win32') {
            try {
                // Verifica status do firewall do Windows
                execSync('netsh advfirewall show allprofiles state', { stdio: 'pipe' });
                console.log('✅ Firewall do Windows acessível');
            } catch (error) {
                this.issues.push('Problemas com firewall do Windows');
                this.fixes.push('Execute como administrador ou configure exceções');
            }
        }
    }

    /**
     * Verifica arquivos de sessão
     */
    checkSessionFiles() {
        console.log('💾 Verificando arquivos de sessão...');

        const sessionDir = path.join(__dirname, 'src', 'data', 'whatsapp-auth');

        if (fs.existsSync(sessionDir)) {
            const sessions = fs.readdirSync(sessionDir);
            console.log(`📁 Encontradas ${sessions.length} sessões`);

            sessions.forEach(session => {
                const sessionPath = path.join(sessionDir, session);
                const stats = fs.statSync(sessionPath);
                console.log(`  - ${session}: ${stats.size} bytes`);
            });
        } else {
            console.log('📁 Nenhum diretório de sessão encontrado');
        }
    }

    /**
     * Exibe resultados do diagnóstico
     */
    displayResults() {
        console.log('\n📋 RESULTADOS DO DIAGNÓSTICO');
        console.log('=' .repeat(30));

        if (this.issues.length === 0) {
            console.log('✅ Nenhum problema detectado!');
        } else {
            console.log('⚠️ Problemas encontrados:');
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }
    }

    /**
     * Sugere correções
     */
    suggestFixes() {
        if (this.fixes.length > 0) {
            console.log('\n🔧 CORREÇÕES SUGERIDAS:');
            console.log('=' .repeat(25));
            this.fixes.forEach((fix, index) => {
                console.log(`  ${index + 1}. ${fix}`);
            });
        }

        console.log('\n🚀 SOLUÇÕES GERAIS:');
        console.log('=' .repeat(20));
        console.log('1. ✅ Execute o servidor: npm start');
        console.log('2. 🌐 Verifique sua conexão com a internet');
        console.log('3. 📱 Certifique-se de que não está usando WhatsApp Web em outro lugar');
        console.log('4. 🪟 No Windows, tente usar um terminal diferente (cmd, PowerShell, Git Bash)');
        console.log('5. 🔥 Desative temporariamente o firewall/antivírus');
        console.log('6. 🔄 Limpe sessões antigas: rm -rf src/data/whatsapp-auth');
        console.log('7. 📊 Use o script de teste: npm run test-send-simple');

        console.log('\n📖 PARA MAIS DETALHES, consulte: TEST_WHATSAPP_README.md');
    }

    /**
     * Limpa sessões antigas
     */
    cleanOldSessions() {
        console.log('🧹 Limpando sessões antigas...');

        const sessionDir = path.join(__dirname, 'src', 'data', 'whatsapp-auth');

        if (fs.existsSync(sessionDir)) {
            try {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log('✅ Sessões antigas removidas');
            } catch (error) {
                console.error('❌ Erro ao remover sessões:', error.message);
            }
        }
    }

    /**
     * Testa geração de QR Code
     */
    async testQRGeneration() {
        console.log('🧪 Testando geração de QR Code...');

        try {
            // Faz uma requisição de inicialização
            const initResponse = await fetch('http://localhost:3000/api/bot/tenants/1/initialize', {
                method: 'POST'
            });

            if (initResponse.ok) {
                console.log('✅ Inicialização do WhatsApp: OK');

                // Aguarda um pouco e tenta obter QR
                setTimeout(async () => {
                    try {
                        const qrResponse = await fetch('http://localhost:3000/api/bot/tenants/1/qr');
                        if (qrResponse.ok) {
                            const qrData = await qrResponse.json();
                            if (qrData.message && qrData.message.qr) {
                                console.log('✅ QR Code gerado com sucesso!');
                                console.log('📱 QR Code disponível para escaneamento');
                            } else {
                                console.log('⏳ QR Code ainda sendo gerado...');
                            }
                        }
                    } catch (error) {
                        console.log('❌ Erro ao obter QR Code');
                    }
                }, 3000);

            } else {
                console.log('❌ Falha na inicialização do WhatsApp');
            }
        } catch (error) {
            console.log('❌ Erro na conexão com o servidor');
        }
    }
}

// Função principal
async function main() {
    const diagnoser = new WhatsAppDiagnoser();

    const args = process.argv.slice(2);

    if (args.includes('--clean')) {
        diagnoser.cleanOldSessions();
    } else if (args.includes('--test-qr')) {
        await diagnoser.testQRGeneration();
    } else if (args.includes('--help')) {
        console.log('📖 Uso: node diagnose-whatsapp.js [opções]');
        console.log('');
        console.log('Opções:');
        console.log('  --clean     Limpa sessões antigas');
        console.log('  --test-qr   Testa geração de QR Code');
        console.log('  --help      Mostra esta ajuda');
        console.log('');
        console.log('Sem opções: executa diagnóstico completo');
    } else {
        await diagnoser.runFullDiagnosis();
    }
}

// Executa se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { WhatsAppDiagnoser };




