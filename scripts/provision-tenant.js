#!/usr/bin/env node

/**
 * Script de Provisionamento de Tenants
 * Uso: node scripts/provision-tenant.js [opções]
 */

const TenantProvisioningService = require('../src/services/TenantProvisioningService');
const TenantTestService = require('../src/services/TenantTestService');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const provisioningService = new TenantProvisioningService();
  const testService = new TenantTestService();

  try {
    switch (command) {
      case 'create':
        await handleCreateTenant(args.slice(1));
        break;

      case 'test':
        await handleCreateTestTenant(args.slice(1));
        break;

      case 'multiple':
        await handleCreateMultipleTenants(args.slice(1));
        break;

      case 'list':
        await handleListTenants(args.slice(1));
        break;

      case 'delete':
        await handleDeleteTenant(args.slice(1));
        break;

      case 'cleanup':
        await handleCleanupTestTenants();
        break;

      case 'export':
        await handleExportTenant(args.slice(1));
        break;

      case 'import':
        await handleImportTenant(args.slice(1));
        break;

      case 'load-test':
        await handleLoadTest(args.slice(1));
        break;

      case 'report':
        await handleReport();
        break;

      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

async function handleCreateTenant(args) {
  const options = parseArgs(args);

  console.log('🚀 Provisionando novo tenant...');

  const tenantData = {
    name: options.name || await promptInput('Nome da barbearia: '),
    email: options.email || await promptInput('Email: '),
    phone: options.phone || await promptInput('Telefone: '),
    plan: options.plan || 'basico'
  };

  const result = await provisioningService.provisionTenant(tenantData);

  console.log('✅ Tenant criado com sucesso!');
  console.log(`📋 ID: ${result.tenant.id}`);
  console.log(`🏢 Nome: ${result.tenant.name}`);
  console.log(`📧 Email: ${result.tenant.email}`);
  console.log(`🔐 Schema: ${result.tenant.schema}`);
  console.log(`💰 Plano: ${result.tenant.plan}`);
  console.log(`👤 Admin Email: ${result.admin.email}`);
  console.log(`🔑 Senha Temporária: ${result.admin.temp_password}`);
  console.log('');
  console.log('⚠️ IMPORTANTE: Altere a senha temporária no primeiro login!');
}

async function handleCreateTestTenant(args) {
  const options = parseArgs(args);

  console.log('🧪 Criando tenant de teste...');

  const result = await testService.createTestTenant({
    name: options.name || 'Barbearia Teste',
    plan: options.plan || 'premium',
    withSampleData: !options.empty
  });

  console.log('✅ Tenant de teste criado!');
  console.log(`📋 ID: ${result.tenant.id}`);
  console.log(`🏢 Nome: ${result.tenant.name}`);
  console.log(`📧 Email Admin: ${result.test_credentials.admin_email}`);
  console.log(`🔑 Senha Admin: ${result.test_credentials.admin_password}`);
  console.log(`📧 Email Barbeiro: ${result.test_credentials.barber_email}`);
  console.log(`🔑 Senha Barbeiro: ${result.test_credentials.barber_password}`);
}

async function handleCreateMultipleTenants(args) {
  const options = parseArgs(args);
  const count = parseInt(options.count) || 5;

  console.log(`🚀 Criando ${count} tenants de teste...`);

  const results = await testService.createMultipleTestTenants(count, {
    plan: options.plan,
    withSampleData: !options.empty
  });

  console.log(`✅ ${results.length} tenants criados com sucesso!`);

  if (results.length > 0) {
    console.log('');
    console.log('📋 Lista de tenants criados:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.tenant.name} (${result.tenant.email})`);
    });
  }
}

async function handleListTenants(args) {
  const options = parseArgs(args);

  console.log('📋 Listando tenants...');

  const tenants = await provisioningService.listTenants({
    status: options.status,
    plan: options.plan,
    search: options.search,
    page: parseInt(options.page) || 1,
    limit: parseInt(options.limit) || 20
  });

  console.log(`📊 Encontrados ${tenants.length} tenants:`);
  console.log('');

  tenants.forEach(tenant => {
    console.log(`📋 ID: ${tenant.id_tenant}`);
    console.log(`🏢 Nome: ${tenant.nome}`);
    console.log(`📧 Email: ${tenant.email}`);
    console.log(`💰 Plano: ${tenant.plano}`);
    console.log(`📊 Status: ${tenant.status}`);
    console.log(`👥 Usuários: ${tenant.users_count}`);
    console.log(`📅 Criado: ${new Date(tenant.data_criacao).toLocaleDateString('pt-BR')}`);
    console.log('─'.repeat(50));
  });
}

async function handleDeleteTenant(args) {
  const options = parseArgs(args);
  const tenantId = options.id;

  if (!tenantId) {
    console.error('❌ ID do tenant é obrigatório. Use --id <tenant_id>');
    process.exit(1);
  }

  console.log(`🗑️ Removendo tenant ${tenantId}...`);

  // Confirmar ação perigosa
  if (!options.force) {
    const confirm = await promptInput('Esta ação é irreversível. Digite "CONFIRMAR" para prosseguir: ');
    if (confirm !== 'CONFIRMAR') {
      console.log('❌ Operação cancelada.');
      return;
    }
  }

  await provisioningService.deprovisionTenant(tenantId);
  console.log('✅ Tenant removido com sucesso!');
}

async function handleCleanupTestTenants() {
  console.log('🧹 Limpando tenants de teste...');

  const confirm = await promptInput('Isso removerá TODOS os tenants de teste. Digite "LIMPAR" para confirmar: ');
  if (confirm !== 'LIMPAR') {
    console.log('❌ Operação cancelada.');
    return;
  }

  await testService.cleanupTestTenants();
  console.log('✅ Limpeza concluída!');
}

async function handleExportTenant(args) {
  const options = parseArgs(args);
  const tenantId = options.id;

  if (!tenantId) {
    console.error('❌ ID do tenant é obrigatório. Use --id <tenant_id>');
    process.exit(1);
  }

  console.log(`📤 Exportando dados do tenant ${tenantId}...`);

  const result = await testService.exportTenantData(tenantId);

  console.log('✅ Dados exportados com sucesso!');
  console.log(`📁 Arquivo: ${result.filename}`);
  console.log(`📍 Local: ${result.filepath}`);
}

async function handleImportTenant(args) {
  const options = parseArgs(args);
  const filepath = options.file;

  if (!filepath) {
    console.error('❌ Caminho do arquivo é obrigatório. Use --file <filepath>');
    process.exit(1);
  }

  console.log(`📥 Importando dados de ${filepath}...`);

  const result = await testService.importTenantData(filepath);

  console.log('✅ Dados importados com sucesso!');
  console.log(`📋 Novo Tenant ID: ${result.tenant.id}`);
  console.log(`🏢 Nome: ${result.tenant.name}`);
}

async function handleLoadTest(args) {
  const options = parseArgs(args);

  console.log('🚀 Iniciando teste de carga...');

  const results = await testService.runLoadTest({
    concurrentTenants: parseInt(options.tenants) || 10,
    operationsPerTenant: parseInt(options.operations) || 50,
    durationMinutes: parseInt(options.duration) || 5
  });

  console.log('📊 Resultados do teste de carga:');
  console.log(`   - Tenants criados: ${results.tenants_created}`);
  console.log(`   - Operações realizadas: ${results.operations_completed}`);
  console.log(`   - Erros: ${results.errors}`);
  console.log(`   - Duração: ${Math.round((results.end_time - new Date(results.start_time)) / 1000 / 60)} minutos`);
}

async function handleReport() {
  console.log('📊 Gerando relatório de tenants de teste...');

  const report = await testService.getTestTenantsReport();

  console.log(`📅 Relatório gerado em: ${new Date(report.generated_at).toLocaleString('pt-BR')}`);
  console.log(`📋 Tenants de teste: ${report.test_tenants.length}`);

  if (report.test_tenants.length > 0) {
    console.log('');
    console.log('🏢 Lista de tenants:');
    report.test_tenants.forEach(tenant => {
      console.log(`   - ${tenant.nome} (${tenant.email}) - ${tenant.plano}`);
    });
  }

  if (report.usage_stats.length > 0) {
    console.log('');
    console.log('📊 Estatísticas de uso:');
    report.usage_stats.forEach(stat => {
      console.log(`   - ${stat.tipo}: ${stat.total_used} total, ${stat.avg_per_tenant} média por tenant`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('');
    console.log('💡 Recomendações:');
    report.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }
}

function parseArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      if (value !== true) i++;
    }
  }

  return options;
}

async function promptInput(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function showHelp() {
  console.log(`
🎯 Sistema de Provisionamento de Tenants

📋 COMANDOS DISPONÍVEIS:

🏗️  PROVISIONAMENTO:
  create                    Criar novo tenant
    --name <nome>          Nome da barbearia
    --email <email>        Email do admin
    --phone <telefone>     Telefone
    --plan <plano>         basico|profissional|premium

🧪 TESTES:
  test                     Criar tenant de teste
    --name <nome>         Nome personalizado
    --plan <plano>        Plano específico
    --empty               Sem dados de exemplo

  multiple                 Criar múltiplos tenants
    --count <numero>      Quantidade (padrão: 5)
    --plan <plano>        Plano para todos
    --empty               Sem dados de exemplo

📊 GERENCIAMENTO:
  list                     Listar tenants
    --status <status>     ativo|inativo|suspenso
    --plan <plano>        Filtrar por plano
    --search <termo>      Buscar por nome/email
    --page <pagina>       Página
    --limit <limite>      Itens por página

🗑️  LIMPEZA:
  delete                   Remover tenant
    --id <tenant_id>      ID do tenant
    --force               Sem confirmação

  cleanup                  Limpar tenants de teste
    (Remove todos os tenants @barberapp.com)

📤 BACKUP:
  export                   Exportar dados
    --id <tenant_id>      ID do tenant

  import                   Importar dados
    --file <filepath>     Caminho do arquivo

🚀 PERFORMANCE:
  load-test                Teste de carga
    --tenants <numero>    Tenants simultâneos
    --operations <num>    Operações por tenant
    --duration <min>      Duração em minutos

📈 RELATÓRIOS:
  report                   Relatório de testes

📝 EXEMPLOS:

# Criar tenant simples
node scripts/provision-tenant.js create --name "Barbearia do João" --email joao@barber.com --plan profissional

# Criar 10 tenants de teste
node scripts/provision-tenant.js multiple --count 10 --plan premium

# Listar tenants ativos
node scripts/provision-tenant.js list --status ativo --limit 10

# Limpar tenants de teste
node scripts/provision-tenant.js cleanup

# Teste de carga
node scripts/provision-tenant.js load-test --tenants 20 --duration 10

Para mais informações, consulte a documentação em docs/multi-tenant.md
  `);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
