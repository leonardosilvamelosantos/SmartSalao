// Gera um JWT válido para o último usuário criado
(async () => {
  // Forçar PostgreSQL
  process.env.DB_TYPE = process.env.DB_TYPE || 'postgresql';
  process.env.USE_POSTGRESQL = process.env.USE_POSTGRESQL || 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'agendamento';
  process.env.DB_USER = process.env.DB_USER || 'agendamento_user';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'agendamento_pass_2024';
  process.env.DB_SSL = process.env.DB_SSL || 'false';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'agendamento-platform-secret-key-2025';

  const pool = require('../src/config/database');
  const AuthService = require('../src/services/AuthService');
  const auth = new AuthService();

  try {
    const res = await pool.query('SELECT id_usuario, id_tenant, nome, email, tipo FROM usuarios ORDER BY id_usuario DESC LIMIT 1');
    if (!res.rows || res.rows.length === 0) {
      console.error('Nenhum usuário encontrado. Rode o pg-smoke-test antes.');
      process.exit(1);
    }
    const u = res.rows[0];
    const token = auth.generateToken({
      id_usuario: u.id_usuario,
      id_tenant: u.id_tenant || 1,
      email: u.email || `user${u.id_usuario}@example.com`,
      role: u.tipo || 'barbeiro',
      schema_name: null,
      plano: 'basico'
    });
    console.log(token);
    if (typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro ao gerar token:', e);
    process.exit(1);
  }
})();


