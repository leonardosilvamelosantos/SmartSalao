const db = require('./src/config/database');

async function fixTables() {
  try {
    console.log('🔧 Corrigindo estrutura das tabelas...');
    
    // 1. Verificar e corrigir tabela servicos
    console.log('📊 Verificando tabela servicos...');
    const servicosColumns = await db.executeQuery("SELECT column_name FROM information_schema.columns WHERE table_name = 'servicos'");
    const servicosCols = servicosColumns.rows.map(c => c.column_name);
    
    if (!servicosCols.includes('nome_servico')) {
      console.log('🔧 Adicionando coluna nome_servico...');
      await db.executeQuery("ALTER TABLE servicos ADD COLUMN nome_servico VARCHAR(255)");
    }
    
    if (!servicosCols.includes('duracao_min')) {
      console.log('🔧 Adicionando coluna duracao_min...');
      await db.executeQuery("ALTER TABLE servicos ADD COLUMN duracao_min INTEGER DEFAULT 60");
    }
    
    // 2. Verificar e corrigir tabela clientes
    console.log('👥 Verificando tabela clientes...');
    const clientesColumns = await db.executeQuery("SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes'");
    const clientesCols = clientesColumns.rows.map(c => c.column_name);
    
    if (!clientesCols.includes('id_usuario')) {
      console.log('🔧 Adicionando coluna id_usuario...');
      await db.executeQuery("ALTER TABLE clientes ADD COLUMN id_usuario INTEGER DEFAULT 1");
    }
    
    // 3. Verificar e corrigir tabela agendamentos
    console.log('📅 Verificando tabela agendamentos...');
    const agendamentosColumns = await db.executeQuery("SELECT column_name FROM information_schema.columns WHERE table_name = 'agendamentos'");
    const agendamentosCols = agendamentosColumns.rows.map(c => c.column_name);
    
    if (!agendamentosCols.includes('start_at')) {
      console.log('🔧 Adicionando coluna start_at...');
      await db.executeQuery("ALTER TABLE agendamentos ADD COLUMN start_at TIMESTAMP");
    }
    
    if (!agendamentosCols.includes('end_at')) {
      console.log('🔧 Adicionando coluna end_at...');
      await db.executeQuery("ALTER TABLE agendamentos ADD COLUMN end_at TIMESTAMP");
    }
    
    // 4. Criar dados de exemplo
    console.log('📝 Criando dados de exemplo...');
    
    // Inserir serviço de exemplo
    const servicoExists = await db.executeQuery("SELECT COUNT(*) as count FROM servicos");
    if (servicoExists.rows[0].count == 0) {
      await db.executeQuery(`
        INSERT INTO servicos (nome, nome_servico, preco, duracao, duracao_min, ativo, id_tenant)
        VALUES ('Corte', 'Corte de Cabelo', 50.00, 60, 60, true, 1)
      `);
      console.log('✅ Serviço de exemplo criado');
    }
    
    // Inserir cliente de exemplo
    const clienteExists = await db.executeQuery("SELECT COUNT(*) as count FROM clientes");
    if (clienteExists.rows[0].count == 0) {
      await db.executeQuery(`
        INSERT INTO clientes (nome, email, telefone, ativo, id_usuario, id_tenant)
        VALUES ('Cliente Teste', 'cliente@teste.com', '11999999999', true, 1, 1)
      `);
      console.log('✅ Cliente de exemplo criado');
    }
    
    console.log('✅ Estrutura das tabelas corrigida!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

fixTables();
