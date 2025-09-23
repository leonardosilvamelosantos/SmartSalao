const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Pular interfaces internas e não IPv4
            if (iface.family !== 'IPv4' || iface.internal !== false) {
                continue;
            }
            
            // Verificar se é uma rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
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
if (localIP) {
    console.log(`🌐 IP da rede local: ${localIP}`);
    console.log(`📱 Acesse do celular: http://${localIP}:3000/frontend`);
    console.log(`💻 Acesse do PC: http://localhost:3000/frontend`);
} else {
    console.log('❌ Não foi possível detectar o IP da rede local');
    console.log('💡 Verifique sua conexão de rede ou configure manualmente');
}
