# 🗄️ Guia de Configuração de Banco de Dados

## 📋 Visão Geral

O sistema agora suporta **configuração híbrida** com detecção automática entre SQLite (desenvolvimento) e PostgreSQL (produção).

## 🔄 Detecção Automática

### **Como Funciona**

O sistema detecta automaticamente qual banco usar baseado nas variáveis de ambiente:

```javascript
const usePostgreSQL = process.env.NODE_ENV === 'production' || 
                     process.env.DB_TYPE === 'postgresql' || 
                     process.env.USE_POSTGRESQL === 'true';
```

### **Prioridade de Detecção**

1. **NODE_ENV=production** → PostgreSQL
2. **DB_TYPE=postgresql** → PostgreSQL  
3. **USE_POSTGRESQL=true** → PostgreSQL
4. **Qualquer outro caso** → SQLite

## 🗃️ SQLite (Desenvolvimento)

### **Características**
- ✅ Arquivo único (`data/agendamento_dev.db`)
- ✅ Sem dependências externas
- ✅ Ideal para desenvolvimento
- ❌ Não suporta schemas (multi-tenancy limitado)
- ❌ Performance limitada para muitos usuários

### **Como Usar**
```bash
# Modo automático (desenvolvimento)
NODE_ENV=development npm start

# Forçar SQLite
DB_TYPE=sqlite npm start

# Verificar configuração
npm run db:test-config
```

### **Estrutura de Arquivos**
```
data/
├── agendamento_dev.db          # Banco principal
├── agendamento_dev_backup_*.db # Backups automáticos
└── whatsapp-auth/             # Dados do WhatsApp
```

## 🐘 PostgreSQL (Produção)

### **Características**
- ✅ Suporte completo a schemas (multi-tenancy real)
- ✅ Performance superior
- ✅ Recursos avançados (JSONB, índices, etc.)
- ✅ Ideal para produção
- ❌ Requer configuração externa
- ❌ Mais complexo para desenvolvimento

### **Como Configurar**

#### **1. Iniciar PostgreSQL via Docker**
```bash
# Iniciar container PostgreSQL
npm run db:start-postgres

# Ou manualmente
docker-compose up -d db
```

#### **2. Configurar Banco**
```bash
# Executar setup do PostgreSQL
npm run db:setup-postgres
```

#### **3. Migrar Dados (Opcional)**
```bash
# Migrar dados do SQLite para PostgreSQL
npm run db:migrate-sqlite-to-postgres
```

#### **4. Ativar PostgreSQL**
```bash
# Modo produção (usa PostgreSQL automaticamente)
NODE_ENV=production npm start

# Ou forçar PostgreSQL
DB_TYPE=postgresql npm start
```

### **Configuração de Ambiente**
```bash
# .env.production
NODE_ENV=production
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agendamento
DB_USER=agendamento_user
DB_PASSWORD=your_strong_password
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=2
```

## 🔧 Scripts Disponíveis

### **Configuração**
```bash
# Testar configuração atual
npm run db:test-config

# Configurar PostgreSQL
npm run db:setup-postgres

# Iniciar PostgreSQL via Docker
npm run db:start-postgres
```

### **Migração**
```bash
# Migrar dados SQLite → PostgreSQL
npm run db:migrate-sqlite-to-postgres

# Executar migrações de schema
npm run migrate
```

### **Desenvolvimento**
```bash
# Modo desenvolvimento (SQLite)
npm run dev

# Modo produção (PostgreSQL)
npm run start:prod

# Demonstração da configuração híbrida
node scripts/demo-hybrid-database.js
```

## 📊 Comparação de Performance

| Aspecto | SQLite | PostgreSQL |
|---------|--------|------------|
| **Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Multi-tenancy** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Concorrência** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Recursos** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Produção** | ❌ | ✅ |

## 🚀 Fluxo de Desenvolvimento Recomendado

### **1. Desenvolvimento Local**
```bash
# Usar SQLite para desenvolvimento rápido
NODE_ENV=development npm run dev
```

### **2. Testes de Produção**
```bash
# Testar com PostgreSQL localmente
NODE_ENV=production npm start
```

### **3. Deploy em Produção**
```bash
# Configurar PostgreSQL
npm run db:start-postgres
npm run db:setup-postgres

# Migrar dados se necessário
npm run db:migrate-sqlite-to-postgres

# Iniciar aplicação
NODE_ENV=production npm start
```

## 🔍 Troubleshooting

### **SQLite não funciona**
```bash
# Verificar se arquivo existe
ls -la data/agendamento_dev.db

# Recriar banco
npm run migrate
```

### **PostgreSQL não conecta**
```bash
# Verificar se container está rodando
docker ps | grep postgres

# Verificar logs
docker logs agendamento-db

# Reiniciar container
docker-compose restart db
```

### **Migração falha**
```bash
# Verificar conexões
npm run db:test-config

# Verificar dados no SQLite
sqlite3 data/agendamento_dev.db ".tables"

# Verificar dados no PostgreSQL
psql -h localhost -U agendamento_user -d agendamento -c "\dt"
```

## 📈 Monitoramento

### **Verificar Status**
```bash
# Status geral
npm run db:test-config

# Logs de conexão
tail -f logs/database.log

# Métricas de performance
npm run security:check
```

### **Backup e Restore**
```bash
# Backup SQLite
cp data/agendamento_dev.db backups/backup_$(date +%Y%m%d_%H%M%S).db

# Backup PostgreSQL
pg_dump -h localhost -U agendamento_user agendamento > backup_postgres.sql

# Restore PostgreSQL
psql -h localhost -U agendamento_user agendamento < backup_postgres.sql
```

## 🎯 Próximos Passos

1. **Configurar PostgreSQL** para produção
2. **Migrar dados** do SQLite para PostgreSQL
3. **Configurar backup automático** do PostgreSQL
4. **Implementar monitoramento** de performance
5. **Configurar replicação** para alta disponibilidade

---

**Última Atualização**: $(date)
**Versão**: 1.0
**Responsável**: Equipe de Desenvolvimento
