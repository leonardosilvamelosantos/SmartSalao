# ========================
# Multi-stage Dockerfile otimizado para produção
# ========================

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Instalar dependências do sistema necessárias para build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    curl

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev dependencies para build)
RUN npm ci --only=production=false && npm cache clean --force

# Copiar código fonte
COPY . .

# Executar testes e linting (opcional, remover se não quiser)
# RUN npm run test 2>/dev/null || echo "Tests failed, but continuing build"

# Stage 2: Production stage
FROM node:18-alpine AS production

# Instalar apenas dependências de runtime
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Criar diretórios necessários
WORKDIR /app

# Copiar arquivos essenciais da build stage
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/config ./config
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Criar diretórios para dados persistentes
RUN mkdir -p uploads backups logs && \
    chown -R nextjs:nodejs uploads backups logs

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3000

# Health check mais robusto
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando otimizado para produção
CMD ["node", "--max-old-space-size=512", "src/index.js"]
