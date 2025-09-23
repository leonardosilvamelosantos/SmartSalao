const pool = require('../src/config/database');

(async () => {
  try {
    console.log('🧪 Criando cliente de teste...');
    
    // Inserir cliente de teste
    await pool.query(`
      INSERT INTO clientes (id_usuario, nome, whatsapp, email) 
      VALUES (14, 'Cliente Teste', '11999999999', 'teste@email.com')
    `);
    
    console.log('✅ Cliente de teste criado com sucesso');
    
    // Verificar se foi criado
    const result = await pool.query('SELECT COUNT(*) as total FROM clientes WHERE id_usuario = 14');
    console.log(`📊 Total de clientes do usuário 14: ${result.rows[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar cliente de teste:', error);
    process.exit(1);
  }
})();
