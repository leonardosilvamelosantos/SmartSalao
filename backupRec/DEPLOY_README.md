# 🚀 Guia de Deploy - VPS Econômica

Este guia explica como fazer o deploy da aplicação de agendamentos em uma VPS básica usando Docker, mantendo os custos o mais baixo possível.

## 📋 Pré-requisitos

### VPS Mínima Recomendada
- **CPU**: 1 vCPU
- **RAM**: 1-2 GB
- **Disco**: 20-30 GB SSD
- **Sistema**: Ubuntu 20.04+ ou Debian 11+
- **Custo**: ~R$ 30-50/mês (Contabo, Hetzner, DigitalOcean)

### Software Necessário
- Docker 20.10+
- Docker Compose 2.0+
- Git

## 🛠️ Instalação da VPS

### 1. Atualizar sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Docker
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão
newgrp docker
```

### 3. Instalar Docker Compose
```bash
# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Verificar instalação
```bash
docker --version
docker-compose --version
```

## 🚀 Deploy da Aplicação

### 1. Clonar projeto
```bash
git clone https://github.com/SEU_USUARIO/agendamento-barbearias.git
cd agendamento-barbearias
```

### 2. Configurar ambiente
```bash
# Copiar arquivo de configuração
cp .env.production.example .env.production

# Editar configurações
nano .env.production
```

### 3. Executar deploy
```bash
# Dar permissão de execução aos scripts
chmod +x deploy.sh backup.sh monitor.sh

# Executar deploy
./deploy.sh
```

## 📊 Verificar Deploy

### Status dos serviços
```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Monitoramento
./monitor.sh
```

### Testes básicos
```bash
# Health check da API
curl http://localhost:3000/health

# Health check da Evolution API
curl http://localhost:8080
```

## 🔧 Configuração WhatsApp (Opcional)

### 1. Acessar Evolution API
```
URL: http://SEU_IP:8080
Usuário: admin
Senha: admin (padrão)
```

### 2. Criar instância
1. Ir em "Instâncias"
2. Criar nova instância
3. Escanear QR code no celular

### 3. Configurar webhook
```javascript
// No painel da Evolution, configurar:
// Webhook URL: http://app:3000/api/whatsapp/webhook
// Eventos: messages, contacts, chats
```

## 💰 Custos e Otimização

### Custos Atuais (Setup Inicial)
- **VPS**: R$ 35/mês
- **Domínio**: R$ 15/ano (opcional)
- **SSL**: Gratuito (Let's Encrypt)
- **Total mensal**: ~R$ 35

### Otimizações de Custo
```bash
# Parar serviços não utilizados
docker-compose stop evolution-api nginx

# Reiniciar apenas quando necessário
docker-compose up -d app db
```

## 📈 Escalabilidade

### Quando Crescer (10-50 Barbearias)
```bash
# Upgrade da VPS
- CPU: 2 vCPUs
- RAM: 4 GB
- Disco: 50 GB
- Custo: ~R$ 80/mês
```

### Quando Crescer Muito (50+ Barbearias)
```bash
# Separar serviços
- Banco em VPS dedicada
- Redis para cache
- Load balancer
- CDN para arquivos estáticos
- Custo: ~R$ 200-500/mês
```

## 🔄 Manutenção

### Backups Diários
```bash
# Configurar cron para backup diário
crontab -e

# Adicionar linha:
0 2 * * * cd /path/to/project && ./backup.sh
```

### Monitoramento
```bash
# Verificar status diariamente
./monitor.sh

# Reiniciar serviços se necessário
docker-compose restart
```

### Atualizações
```bash
# Atualizar aplicação
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Atualizar Evolution API
docker-compose pull evolution-api
docker-compose up -d evolution-api
```

## 🛠️ Troubleshooting

### Aplicação não inicia
```bash
# Ver logs detalhados
docker-compose logs app

# Verificar variáveis de ambiente
docker-compose exec app env

# Reiniciar aplicação
docker-compose restart app
```

### Banco não conecta
```bash
# Verificar se container está rodando
docker-compose ps

# Ver logs do banco
docker-compose logs db

# Reiniciar banco
docker-compose restart db
```

### Evolution API não funciona
```bash
# Ver logs
docker-compose logs evolution-api

# Reiniciar
docker-compose restart evolution-api

# Verificar configuração
docker-compose exec evolution-api cat /app/.env
```

## 🌐 Configuração de Domínio (Opcional)

### 1. Configurar domínio
```bash
# Instalar Nginx (se não estiver usando container)
sudo apt install nginx

# Configurar site
sudo nano /etc/nginx/sites-available/agendamento
```

### 2. Arquivo de configuração Nginx
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. SSL com Let's Encrypt
```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com
```

## 📞 Suporte e Monitoramento

### Métricas Importantes
- **Uptime da aplicação**: > 99%
- **Uptime do banco**: > 99.9%
- **Uso de CPU/RAM**: < 70%
- **Espaço em disco**: < 80%
- **Backups**: Diários

### Alertas
```bash
# Configurar alertas simples
# Quando CPU > 80%
# Quando disco > 90%
# Quando aplicação cai
```

---

## 🎯 Checklist de Produção

- [ ] VPS configurada e segura
- [ ] Docker e Docker Compose instalados
- [ ] Aplicação deployada e funcionando
- [ ] Banco de dados acessível
- [ ] Backups configurados
- [ ] Monitoramento ativo
- [ ] Domínio configurado (opcional)
- [ ] SSL configurado (opcional)
- [ ] Evolution API configurada (opcional)

**Custo total inicial: ~R$ 35/mês**
**Tempo de setup: ~2 horas**
**Capacidade inicial: 50-100 barbearias**

**🎉 Pronto para produção com orçamento mínimo!**
