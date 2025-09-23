const http = require('http');

// Obter IP da rede local
const os = require('os');

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

const localIP = getLocalIP();

if (!localIP) {
    console.log('❌ Não foi possível detectar o IP da rede local');
    process.exit(1);
}

console.log(`🌐 Testando acesso via IP: ${localIP}`);

// Testar health check
const options = {
    hostname: localIP,
    port: 3000,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`✅ Health check: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const health = JSON.parse(data);
            console.log('📊 Status do servidor:', health);
            console.log(`🌐 Servidor acessível via: http://${localIP}:3000`);
            console.log(`📱 Para acessar do celular: http://${localIP}:3000/frontend`);
        } catch (error) {
            console.log('⚠️ Resposta não é JSON válido:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erro ao conectar:', error.message);
    console.log('💡 Verifique se o servidor está rodando com: npm run dev:network');
});

req.on('timeout', () => {
    console.error('⏰ Timeout na conexão');
    req.destroy();
});

req.end();
