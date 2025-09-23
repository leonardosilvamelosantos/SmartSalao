const { spawn } = require('child_process');
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

// Detectar IP da rede local
const localIP = getLocalIP();

console.log('🚀 Iniciando servidor de desenvolvimento...');
console.log('');

if (localIP) {
    console.log(`🌐 IP da rede local detectado: ${localIP}`);
    console.log(`📱 Acesse do celular: http://${localIP}:3000/frontend`);
    console.log(`💻 Acesse do PC: http://localhost:3000/frontend`);
    console.log('');
} else {
    console.log('⚠️  Não foi possível detectar o IP da rede local');
    console.log('💡 Verifique sua conexão de rede');
    console.log('');
}

// Configurar variáveis de ambiente
process.env.NODE_ENV = 'development';
process.env.HOST = '0.0.0.0';
process.env.PORT = '3000';

// Iniciar o servidor
const server = spawn('node', ['src/index.js'], {
    stdio: 'inherit',
    env: process.env
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err);
});

server.on('close', (code) => {
    console.log(`\n🛑 Servidor encerrado com código: ${code}`);
});

// Capturar Ctrl+C para encerrar graciosamente
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    server.kill('SIGINT');
    process.exit(0);
});
