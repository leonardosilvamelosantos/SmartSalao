# 🔒 Guia de Segurança para Produção

## 📋 Visão Geral

Este documento descreve as medidas de segurança implementadas no sistema de agendamento multi-tenant e fornece diretrizes para manter a segurança em produção.

## 🛡️ Medidas de Segurança Implementadas

### 1. **Isolamento Multi-Tenant**
- ✅ **Schemas Separados**: Cada tenant possui seu próprio schema no PostgreSQL
- ✅ **Validação de Contexto**: Middleware verifica se usuário pertence ao tenant
- ✅ **Isolamento de Dados**: Queries sempre incluem filtro por `tenant_id`
- ✅ **Validação de Permissões**: Sistema robusto de permissões por tenant

### 2. **Prevenção de SQL Injection**
- ✅ **Prepared Statements**: Todas as queries usam prepared statements
- ✅ **Validação de Query**: BaseModel valida padrões suspeitos em queries
- ✅ **Sanitização de Input**: Validação robusta de entrada do usuário
- ✅ **Detecção Automática**: Sistema detecta e registra tentativas de SQL injection

### 3. **Autenticação e Autorização**
- ✅ **JWT Tokens**: Autenticação baseada em JWT com expiração
- ✅ **Validação de Token**: Verificação rigorosa de tokens
- ✅ **Controle de Acesso**: Middleware de permissões por recurso
- ✅ **Isolamento de Tenant**: Usuários só acessam dados do próprio tenant

### 4. **Rate Limiting e Proteção DDoS**
- ✅ **Rate Limiting por Tenant**: Limite de requisições por tenant
- ✅ **Rate Limiting por IP**: Proteção contra ataques de força bruta
- ✅ **Configuração por Ambiente**: Rate limiting ativo em produção
- ✅ **Logs de Monitoramento**: Registro de tentativas de abuso

### 5. **Validação de Entrada**
- ✅ **Validação Robusta**: Validação de tipos, tamanhos e formatos
- ✅ **Prevenção XSS**: Sanitização de HTML e caracteres especiais
- ✅ **Validação de Email**: Regex robusto para validação de email
- ✅ **Validação de Senha**: Critérios de força de senha

### 6. **Sistema de Alertas de Segurança**
- ✅ **Detecção Automática**: Monitoramento de eventos suspeitos
- ✅ **Alertas por Severidade**: Classificação de alertas (critical, high, medium, low)
- ✅ **Notificações Externas**: Email, Slack e Discord
- ✅ **Dashboard de Monitoramento**: Interface para visualizar alertas

### 7. **Logs e Auditoria**
- ✅ **Logs de Auditoria**: Registro de todas as ações importantes
- ✅ **Logs de Segurança**: Eventos de segurança detalhados
- ✅ **Rastreamento de IP**: Registro de IPs e User-Agents
- ✅ **Retenção de Logs**: Política de retenção configurável

## 🚀 Configuração para Produção

### 1. **Variáveis de Ambiente Obrigatórias**

```bash
# Ambiente
NODE_ENV=production

# Banco de Dados
DB_TYPE=postgresql
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=agendamento_prod
DB_USER=agendamento_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# Segurança
JWT_SECRET=YOUR_STRONG_JWT_SECRET_HERE
BCRYPT_ROUNDS=12
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_ALERTS=true

# Notificações de Segurança
SECURITY_ALERTS_EMAIL=admin@yourcompany.com
SECURITY_ALERTS_SLACK_WEBHOOK=https://hooks.slack.com/...
SECURITY_ALERTS_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...

# SMTP (para emails de segurança)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=security@yourcompany.com
```

### 2. **Configuração do Banco PostgreSQL**

```sql
-- Criar usuário específico para a aplicação
CREATE USER agendamento_user WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Criar banco de dados
CREATE DATABASE agendamento_prod OWNER agendamento_user;

-- Conceder permissões mínimas necessárias
GRANT CONNECT ON DATABASE agendamento_prod TO agendamento_user;
GRANT USAGE ON SCHEMA public TO agendamento_user;
GRANT CREATE ON SCHEMA public TO agendamento_user;
```

### 3. **Configuração de Firewall**

```bash
# Permitir apenas portas necessárias
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 5432  # PostgreSQL (apenas se necessário)

# Bloquear acesso direto ao banco de dados
ufw deny 5432 from any
```

### 4. **Configuração de SSL/TLS**

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Configurações de segurança SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

## 🔍 Monitoramento e Alertas

### 1. **Endpoints de Monitoramento**

```bash
# Health check de segurança
GET /api/security/health

# Estatísticas de segurança
GET /api/security/stats

# Listar alertas ativos
GET /api/security/alerts

# Eventos de segurança
GET /api/security/events
```

### 2. **Comandos de Monitoramento**

```bash
# Verificar status de segurança
npm run security:check

# Listar alertas ativos
npm run security:alerts

# Executar testes de segurança
npm run security:test

# Verificar logs de segurança
tail -f logs/security.log
```

### 3. **Configuração de Alertas**

O sistema gera alertas automáticos para:

- **Critical**: Tentativas de SQL injection, acesso não autorizado
- **High**: Múltiplas tentativas de login falhadas
- **Medium**: Rate limit excedido
- **Low**: Eventos suspeitos gerais

## 🧪 Testes de Segurança

### 1. **Executar Testes Automatizados**

```bash
# Executar todos os testes de segurança
npm run security:test

# Executar testes específicos
npx jest tests/security.test.js

# Verificar dependências vulneráveis
npm audit
npm audit fix
```

### 2. **Testes Manuais Recomendados**

1. **Teste de SQL Injection**
   ```bash
   curl -X POST http://localhost:3000/api/clientes \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"nome": "'; DROP TABLE usuarios; --", "whatsapp": "11999999999"}'
   ```

2. **Teste de Rate Limiting**
   ```bash
   for i in {1..20}; do
     curl -X GET http://localhost:3000/api/usuarios \
       -H "Authorization: Bearer YOUR_TOKEN"
   done
   ```

3. **Teste de Validação de Entrada**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -d '{"email": "invalid-email", "password": "123"}'
   ```

## 📊 Métricas de Segurança

### 1. **KPIs de Segurança**

- **Tempo de Resposta**: < 200ms para validações de segurança
- **Taxa de Falsos Positivos**: < 5% nos alertas de segurança
- **Cobertura de Testes**: > 90% para funções de segurança
- **Tempo de Detecção**: < 1 minuto para ataques críticos

### 2. **Métricas de Monitoramento**

- Número de tentativas de SQL injection bloqueadas
- Número de tentativas de acesso não autorizado
- Número de requisições bloqueadas por rate limiting
- Tempo de resposta dos endpoints de segurança

## 🚨 Procedimentos de Emergência

### 1. **Em Caso de Ataque Detectado**

1. **Imediato (0-5 minutos)**
   - Verificar alertas críticos no dashboard
   - Bloquear IPs suspeitos no firewall
   - Ativar modo de manutenção se necessário

2. **Curto Prazo (5-30 minutos)**
   - Analisar logs de segurança
   - Identificar vetor de ataque
   - Aplicar correções temporárias

3. **Médio Prazo (30 minutos - 2 horas)**
   - Implementar correções permanentes
   - Atualizar regras de segurança
   - Notificar stakeholders

### 2. **Contatos de Emergência**

- **Admin Principal**: admin@yourcompany.com
- **DevOps**: devops@yourcompany.com
- **Segurança**: security@yourcompany.com
- **Suporte 24/7**: +55 11 99999-9999

## 🔄 Manutenção de Segurança

### 1. **Rotinas Diárias**

- [ ] Verificar alertas de segurança
- [ ] Analisar logs de acesso
- [ ] Verificar métricas de performance
- [ ] Validar backups de segurança

### 2. **Rotinas Semanais**

- [ ] Executar testes de segurança
- [ ] Revisar logs de auditoria
- [ ] Atualizar regras de rate limiting
- [ ] Verificar dependências vulneráveis

### 3. **Rotinas Mensais**

- [ ] Auditoria completa de segurança
- [ ] Revisão de permissões de usuários
- [ ] Teste de recuperação de desastres
- [ ] Atualização de documentação

## 📚 Recursos Adicionais

### 1. **Documentação Técnica**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

### 2. **Ferramentas Recomendadas**

- **Nmap**: Scanner de rede
- **OWASP ZAP**: Scanner de vulnerabilidades
- **Burp Suite**: Teste de penetração
- **Nessus**: Scanner de vulnerabilidades

### 3. **Treinamento**

- Curso de segurança em aplicações web
- Treinamento em resposta a incidentes
- Simulações de ataque (red team exercises)

## ✅ Checklist de Deploy Seguro

### Antes do Deploy

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Senhas e chaves alteradas dos valores padrão
- [ ] Testes de segurança executados e passando
- [ ] Configuração de SSL/TLS validada
- [ ] Firewall configurado corretamente
- [ ] Backup do banco de dados realizado
- [ ] Plano de rollback preparado

### Após o Deploy

- [ ] Health check de segurança passando
- [ ] Alertas de segurança configurados
- [ ] Monitoramento ativo
- [ ] Logs sendo gerados corretamente
- [ ] Performance dentro dos parâmetros esperados
- [ ] Equipe notificada sobre o deploy

---

**Última Atualização**: $(date)
**Versão**: 1.0
**Responsável**: Equipe de Segurança
