/**
 * Gera QR Code WhatsApp em formato HTML para melhor visualização
 * Resolve problemas de renderização no terminal Windows
 */

const fs = require('fs');
const path = require('path');

class QRCodeHTMLGenerator {
    constructor() {
        this.htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR Code - Agendamento</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        .logo {
            width: 80px;
            height: 80px;
            background: #25D366;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }

        .qr-container {
            background: white;
            border-radius: 15px;
            padding: 20px;
            display: inline-block;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            margin: 20px 0;
        }

        .qr-code {
            width: 256px;
            height: 256px;
            display: block;
            margin: 0 auto;
        }

        .instructions {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }

        .instructions h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 18px;
        }

        .instructions ol {
            color: #555;
            padding-left: 20px;
        }

        .instructions li {
            margin-bottom: 8px;
            line-height: 1.5;
        }

        .status {
            margin: 20px 0;
            padding: 15px;
            border-radius: 10px;
            font-weight: bold;
        }

        .status.loading {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .status.ready {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .refresh-btn {
            background: #25D366;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
        }

        .refresh-btn:hover {
            background: #128C7E;
            transform: translateY(-2px);
        }

        .footer {
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }

        @media (max-width: 600px) {
            .container {
                margin: 20px;
                padding: 30px 20px;
            }

            .qr-code {
                width: 200px;
                height: 200px;
            }

            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱</div>
        <h1>WhatsApp Bot</h1>
        <p class="subtitle">Agendamento Automático</p>

        <div id="status" class="status loading">
            🔄 Gerando QR Code...
        </div>

        <div id="qr-container" class="qr-container" style="display: none;">
            <img id="qr-code" class="qr-code" alt="QR Code WhatsApp" />
        </div>

        <div class="instructions">
            <h3>📋 Como conectar:</h3>
            <ol>
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque no menu (⋮) no canto superior direito</li>
                <li>Selecione "Aparelhos conectados"</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>Escaneie o QR Code acima</li>
            </ol>
        </div>

        <button class="refresh-btn" onclick="refreshQR()">🔄 Atualizar QR Code</button>

        <div class="footer">
            <p>Sistema de Agendamento | WhatsApp Bot</p>
        </div>
    </div>

    <script>
        let qrInterval;

        async function loadQRCode() {
            try {
                const statusDiv = document.getElementById('status');
                const qrContainer = document.getElementById('qr-container');
                const qrImage = document.getElementById('qr-code');

                statusDiv.className = 'status loading';
                statusDiv.textContent = '🔄 Gerando QR Code...';
                qrContainer.style.display = 'none';

                // Tenta obter QR code
                const response = await fetch('/api/bot/tenants/1/qr');
                const data = await response.json();

                if (data.success && data.message && data.message.qr) {
                    // QR Code disponível
                    const qrData = data.message.qr;
                    qrImage.src = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(qrData)}\`;

                    qrContainer.style.display = 'block';
                    statusDiv.className = 'status ready';
                    statusDiv.textContent = '✅ QR Code gerado! Escaneie com o WhatsApp';

                    console.log('🎉 QR Code carregado com sucesso!');
                } else {
                    // QR ainda sendo gerado
                    statusDiv.className = 'status loading';
                    statusDiv.textContent = '⏳ QR Code ainda sendo gerado... Tentando novamente em 3 segundos';
                    qrContainer.style.display = 'none';

                    setTimeout(loadQRCode, 3000);
                }
            } catch (error) {
                console.error('Erro ao carregar QR Code:', error);
                const statusDiv = document.getElementById('status');
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ Erro ao gerar QR Code. Verifique se o servidor está rodando.';

                // Tenta novamente em 5 segundos
                setTimeout(loadQRCode, 5000);
            }
        }

        function refreshQR() {
            console.log('🔄 Atualizando QR Code...');
            loadQRCode();
        }

        // Carrega QR code quando a página carrega
        window.addEventListener('load', () => {
            console.log('🚀 Página carregada, iniciando carregamento do QR Code...');
            loadQRCode();
        });

        // Atualiza QR code a cada 30 segundos
        setInterval(() => {
            if (document.getElementById('qr-container').style.display !== 'none') {
                console.log('🔄 Atualização automática do QR Code...');
                loadQRCode();
            }
        }, 30000);
    </script>
</body>
</html>`;
    }

    /**
     * Gera arquivo HTML com QR Code
     */
    generateHTML(qrData = null) {
        const filePath = path.join(__dirname, 'whatsapp-qr.html');
        let htmlContent = this.htmlTemplate;

        if (qrData) {
            // Substitui o script para usar QR data direto
            htmlContent = htmlContent.replace(
                'loadQRCode()',
                `() => {
                    const qrImage = document.getElementById('qr-code');
                    const statusDiv = document.getElementById('status');
                    const qrContainer = document.getElementById('qr-container');

                    qrImage.src = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent('${qrData}')}\`;
                    qrContainer.style.display = 'block';
                    statusDiv.className = 'status ready';
                    statusDiv.textContent = '✅ QR Code pronto! Escaneie com o WhatsApp';
                }`
            );
        }

        fs.writeFileSync(filePath, htmlContent, 'utf8');
        return filePath;
    }

    /**
     * Abre o arquivo HTML no navegador padrão
     */
    openInBrowser(filePath) {
        const { exec } = require('child_process');
        const os = require('os');

        let command;
        if (os.platform() === 'win32') {
            command = `start "" "${filePath}"`;
        } else if (os.platform() === 'darwin') {
            command = `open "${filePath}"`;
        } else {
            command = `xdg-open "${filePath}"`;
        }

        exec(command, (error) => {
            if (error) {
                console.error('Erro ao abrir navegador:', error);
            } else {
                console.log('✅ Arquivo HTML aberto no navegador!');
            }
        });
    }

    /**
     * Gera e abre QR Code HTML
     */
    async generateAndOpen(qrData = null) {
        try {
            console.log('🎨 Gerando arquivo HTML do QR Code...');

            const filePath = this.generateHTML(qrData);

            console.log(`📁 Arquivo gerado: ${filePath}`);
            console.log('🌐 Abrindo no navegador...');

            this.openInBrowser(filePath);

            console.log('\n📋 Instruções:');
            console.log('1. O arquivo HTML foi aberto no seu navegador');
            console.log('2. Escaneie o QR Code com o WhatsApp no celular');
            console.log('3. Aguarde a confirmação de conexão');
            console.log('\n💡 Dica: Se o QR Code não aparecer, clique em "Atualizar QR Code"');

            return filePath;
        } catch (error) {
            console.error('❌ Erro ao gerar QR Code HTML:', error);
            throw error;
        }
    }
}

// Função principal
async function main() {
    const generator = new QRCodeHTMLGenerator();

    console.log('🚀 GERADOR DE QR CODE WHATSAPP HTML');
    console.log('=====================================\n');

    const args = process.argv.slice(2);

    if (args.includes('--help')) {
        console.log('📖 Uso: node generate-qr-html.js [opções]');
        console.log('');
        console.log('Opções:');
        console.log('  --open-only    Apenas abre o arquivo existente');
        console.log('  --help         Mostra esta ajuda');
        console.log('');
        console.log('Sem opções: gera novo arquivo e abre no navegador');
        return;
    }

    if (args.includes('--open-only')) {
        const filePath = path.join(__dirname, 'whatsapp-qr.html');
        if (fs.existsSync(filePath)) {
            console.log('📁 Abrindo arquivo existente...');
            generator.openInBrowser(filePath);
        } else {
            console.log('❌ Arquivo não encontrado. Execute sem --open-only primeiro.');
        }
    } else {
        await generator.generateAndOpen();
    }
}

// Executa se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { QRCodeHTMLGenerator };




