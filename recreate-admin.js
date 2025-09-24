const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function recreateAdmin() {
  try {
    console.log('🔄 Recriando usuário admin...');
    
    // Deletar usuário existente
    await db.executeQuery("DELETE FROM usuarios WHERE email = 'admin@teste.com'");
    console.log('🗑️ Usuário admin removido');
    
    // Criar novo usuário
    const senha_hash = await bcrypt.hash('123456', 12);
    
    const result = await db.executeQuery(`
      INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo, id_tenant, timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_usuario, nome, email, tipo, ativo
    `, ['Admin Sistema', 'admin@teste.com', senha_hash, 'admin', true, 1, 'America/Sao_Paulo']);
    
    console.log('✅ Admin criado:', result.rows[0]);
    
    // Testar login
    console.log('🔍 Testando login...');
    const AuthService = require('./src/services/AuthService');
    const authService = new AuthService();
    const loginResult = await authService.authenticate('admin@teste.com', '123456');
    console.log('✅ Login bem-sucedido:', loginResult);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

recreateAdmin();
