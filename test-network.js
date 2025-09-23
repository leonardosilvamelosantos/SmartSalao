const http = require('http');
const os = require('os');

// Função para obter IP local
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family !== 'IPv4' || iface.internal !== false) {
                continue;
            }
            
            const ip = iface.address;
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
                (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                return ip;
            }
        }
    }
    
    return null;
}

// Função para testar conectividade
function testConnection(host, port) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: host,
            port: port,
            path: '/health',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            resolve({ success: true, status: res.statusCode, host, port });
        });

        req.on('error', (err) => {
            resolve({ success: false, error: err.message, host, port });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Timeout', host, port });
        });

        req.end();
    });
}

async function testNetworkAccess() {
    console.log('🔍 Testando acesso à rede...\n');
    
    const localIP = getLocalIP();
    const port = process.env.PORT || 3000;
    
    console.log(`📊 Configuração:`);
    console.log(`   Porta: ${port}`);
    console.log(`   IP local detectado: ${localIP || 'Não encontrado'}\n`);
    
    // Testar localhost
    console.log('🧪 Testando localhost...');
    const localhostResult = await testConnection('localhost', port);
    if (localhostResult.success) {
        console.log(`   ✅ localhost:${port} - OK (Status: ${localhostResult.status})`);
    } else {
        console.log(`   ❌ localhost:${port} - FALHOU (${localhostResult.error})`);
    }
    
    // Testar 127.0.0.1
    console.log('🧪 Testando 127.0.0.1...');
    const loopbackResult = await testConnection('127.0.0.1', port);
    if (loopbackResult.success) {
        console.log(`   ✅ 127.0.0.1:${port} - OK (Status: ${loopbackResult.status})`);
    } else {
        console.log(`   ❌ 127.0.0.1:${port} - FALHOU (${loopbackResult.error})`);
    }
    
    // Testar IP local se disponível
    if (localIP) {
        console.log(`🧪 Testando IP local (${localIP})...`);
        const localResult = await testConnection(localIP, port);
        if (localResult.success) {
            console.log(`   ✅ ${localIP}:${port} - OK (Status: ${localResult.status})`);
        } else {
            console.log(`   ❌ ${localIP}:${port} - FALHOU (${localResult.error})`);
        }
    }
    
    console.log('\n📱 URLs para teste:');
    console.log(`   💻 Local: http://localhost:${port}/frontend`);
    console.log(`   🔄 Loopback: http://127.0.0.1:${port}/frontend`);
    if (localIP) {
        console.log(`   🌐 Rede: http://${localIP}:${port}/frontend`);
    }
    
    console.log('\n💡 Dicas:');
    console.log('   - Se localhost funcionar mas IP local não, verifique o firewall');
    console.log('   - Se nenhum funcionar, verifique se o servidor está rodando');
    console.log('   - Para acessar do celular, use o IP da rede local');
}

// Executar teste
testNetworkAccess().catch(console.error);
