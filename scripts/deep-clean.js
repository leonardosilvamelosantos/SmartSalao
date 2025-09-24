/*
 * Limpeza profunda do projeto (arquivos de teste, demos e caches)
 * Não remove arquivos de banco; o reset do banco é feito separadamente
 */
const fs = require('fs');
const path = require('path');

function removePath(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      console.log(`🧹 Removido: ${targetPath}`);
    }
  } catch (err) {
    console.warn(`⚠️  Falha ao remover ${targetPath}: ${err.message}`);
  }
}

function removeChildren(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const full = path.join(dirPath, entry);
      removePath(full);
    }
    console.log(`🧹 Limpeza de conteúdo dentro: ${dirPath}`);
  } catch (err) {
    console.warn(`⚠️  Falha ao limpar ${dirPath}: ${err.message}`);
  }
}

(function enhance() {
  // Utilidades adicionais
  function walk(dir, onFile) {
    try {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of list) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, onFile);
        } else {
          onFile(full);
        }
      }
    } catch (_) {}
  }

  function removeByPattern(baseDir, regex) {
    try {
      walk(baseDir, (filePath) => {
        if (regex.test(filePath)) {
          removePath(filePath);
        }
      });
    } catch (err) {
      console.warn(`⚠️  Falha ao varrer ${baseDir}: ${err.message}`);
    }
  }

  module.exports = {
    removeByPattern
  };
})();

(function main() {
  console.log('🚀 Iniciando limpeza profunda do código...');

  const root = path.resolve(__dirname, '..');

  // Pastas inteiras a remover (somente conteúdo de desenvolvimento/teste)
  const dirsToRemove = [
    path.join(root, 'tests'),
    path.join(root, 'backups')
  ];

  // Remover conteúdos temporários/caches do WhatsApp
  const whatsappAuthDir = path.join(root, 'data', 'whatsapp-auth');
  const whatsappAuthDirSrc = path.join(root, 'src', 'data', 'whatsapp-auth');

  // Arquivos individuais a remover (testes e demos)
  const filesToRemove = [
    // Testes na raiz
    'test-api.js',
    'test-auth.js',
    'test-login.js',
    'test-network-access.js',
    'test-network.js',
    'test-postgresql.js',
    'test-tenants.js',
    'security-test-report.json',
    'temp_line.txt',
    // Demos no frontend
    path.join('frontend', 'test-animated-cards.html'),
    path.join('frontend', 'demo-animated-cards.html'),
    path.join('frontend', 'ANIMATED-CARDS-README.md'),
    // Scripts de diagnóstico e utilitários temporários
    'check-agendamentos.js',
    'check-db.js',
    'check-tables.js',
    'check-tenants-pg.js',
    'check-user.js',
    'debug-db.js',
    'diagnose-whatsapp.js',
    'generate-qr-html.js',
    'get-local-ip.js',
    'recreate-clientes-table.js',
    // Bancos duplicados/legados
    'database.sqlite',
    path.join('data', 'database.sqlite'),
    path.join('data', 'agendamento_dev_backup_20250922_162541.db'),
    // Documentação e relatórios de desenvolvimento
    'ARCHITECTURE.mmd',
    'CORRECAO_ERROS_APLICACAO.md',
    'CORRECAO_WHATSAPP_QR_CODE.md',
    'DATABASE_CONFIG_GUIDE.md',
    'MIGRATION_LOG.md',
    'OTIMIZACAO_CONCLUIDA.md',
    'OTIMIZACAO_FRONTEND_LOGS_CONCLUIDA.md',
    'OTIMIZACAO_LOGS_CONCLUIDA.md',
    'OTIMIZACAO_TENTATIVAS_WHATSAPP.md',
    'OTIMIZACAO_WHATSAPP_LOGS_CONCLUIDA.md',
    'PERFORMANCE_OPTIMIZATION.md',
    'PROJECT_STATUS.md',
    'RELATORIO_DIAGNOSTICO_SEGURANCA.md',
    'SECURITY_CHECKLIST.md',
    'SECURITY_GUIDE.md',
    'TENANT_CLEANUP_SUMMARY.md',
    'THEMATIC_THEMES_GUIDE.md',
    'THEME_ENHANCEMENTS.md',
    'WHATSAPP_CONFIG_EXAMPLE.md',
    'WHATSAPP_ENV_EXAMPLE.md',
    'WHATSAPP_ERRORS_FIX.md',
    'WHATSAPP_SETUP_GUIDE.md',
    'README-SETUP.md'
  ].map(p => path.join(root, p));

  // Executar remoções de diretórios
  for (const d of dirsToRemove) {
    removePath(d);
  }

  // Limpar conteúdo de autenticação do WhatsApp (preserva a pasta base)
  removeChildren(whatsappAuthDir);
  removeChildren(whatsappAuthDirSrc);

  // Executar remoções de arquivos
  for (const f of filesToRemove) {
    removePath(f);
  }

  // Remover backups e arquivos temporários dentro de src
  try {
    const { removeByPattern } = module.exports;
    // Remover arquivos *.backup*, *.bak
    removeByPattern(path.join(root, 'src'), /\.backup(\.|$)|\.bak$/i);
    // Remover artefatos com extensão numérica grande (snapshots/temporários)
    removeByPattern(path.join(root, 'src'), /\.[0-9]{10,}$/);
  } catch (_) {}

  console.log('✅ Limpeza profunda concluída.');
})();


