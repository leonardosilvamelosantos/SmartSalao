module.exports = {
  apps: [{
    name: 'agendamento-app',
    script: 'src/index.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=256'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=512',
      UV_THREADPOOL_SIZE: 4
    },
    // Configurações de monitoramento
    max_memory_restart: '500M',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Health check
    health_check: {
      enabled: true,
      url: 'http://localhost:3000/health',
      interval: 30000,
      timeout: 10000,
      retries: 3
    },
    // Auto restart
    autorestart: true,
    watch: process.env.NODE_ENV === 'development' ? ['src'] : false,
    ignore_watch: [
      'node_modules',
      'logs',
      'backups',
      'uploads',
      '*.log'
    ],
    // Environment variables
    env_file: '.env',
    // Cluster mode
    node_args: process.env.NODE_ENV === 'production' ?
      '--max-old-space-size=512 --optimize-for-size' :
      '--max-old-space-size=256'
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/your-repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
