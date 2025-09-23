// E2E: Serviços, Agendamentos e Admin (com Postgres)
(async () => {
  process.env.DB_TYPE = 'postgresql';
  process.env.USE_POSTGRESQL = 'true';
  process.env.NODE_ENV = 'production';
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
  const fetch = global.fetch || (await import('node-fetch')).default;
  const baseUrl = 'http://localhost:3000';

  // Start servidor
  const { spawn } = require('child_process');
  const server = spawn(process.execPath, ['./src/index.js'], { env: { ...process.env }, stdio: 'inherit' });

  const waitFor = async (path) => {
    const start = Date.now();
    while (Date.now() - start < 20000) {
      try { const r = await fetch(baseUrl + path); if (r.ok) return true; } catch {}
      await new Promise(r => setTimeout(r, 400));
    }
    return false;
  };

  try {
    if (!(await waitFor('/health'))) throw new Error('Servidor não iniciou');

    // Obter usuário e token de barbeiro
    const u = (await pool.query('SELECT id_usuario, id_tenant, nome, email FROM usuarios ORDER BY id_usuario DESC LIMIT 1')).rows[0];
    const barberToken = auth.generateToken({ id_usuario: u.id_usuario, id_tenant: u.id_tenant || 1, email: u.email, role: 'barbeiro', schema_name: null, plano: 'basico' });

    const req = async (method, path, body, token) => {
      const res = await fetch(baseUrl + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
      return { status: res.status, data: json };
    };

    // Criar serviço (barbeiro)
    const newService = await req('POST', '/api/servicos', { nome_servico: 'Corte E2E', duracao_min: 30, valor: 49.9, descricao: 'Teste E2E' }, barberToken);
    console.log('POST /api/servicos ->', newService.status);

    // Listar serviços
    const listServices = await req('GET', '/api/servicos?limit=5', null, barberToken);
    console.log('GET /api/servicos ->', listServices.status);

    // Criar agendamento (precisa de cliente e serviço)
    const cliente = (await pool.query('SELECT id_cliente FROM clientes ORDER BY id_cliente DESC LIMIT 1')).rows[0];
    const servico = (await pool.query('SELECT id_servico, duracao_min FROM servicos ORDER BY id_servico DESC LIMIT 1')).rows[0];
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const newAppt = await req('POST', '/api/agendamentos', { id_cliente: cliente?.id_cliente, id_servico: servico?.id_servico, start_at: startAt, status: 'confirmed' }, barberToken);
    console.log('POST /api/agendamentos ->', newAppt.status);

    // Listar agendamentos
    const listAppt = await req('GET', '/api/agendamentos', null, barberToken);
    console.log('GET /api/agendamentos ->', listAppt.status);

    // Gerar token admin (system_admin)
    const adminToken = auth.generateToken({ id_usuario: u.id_usuario, id_tenant: 1, email: u.email, role: 'system_admin', schema_name: null, plano: 'basico' });

    // Admin: listar usuários
    const adminUsers = await req('GET', '/api/admin/users?limit=5', null, adminToken);
    console.log('GET /api/admin/users ->', adminUsers.status);

    const okCount = [newService.status, listServices.status, newAppt.status, listAppt.status, adminUsers.status].filter(s => s >= 200 && s < 300).length;
    console.log('SERV/APPT/ADMIN pass %:', Math.round((okCount / 5) * 100));

    if (typeof pool.end === 'function') await pool.end();
    server.kill('SIGTERM');
    process.exit(okCount >= 4 ? 0 : 1);
  } catch (e) {
    console.error('E2E SA error:', e);
    try { if (typeof pool.end === 'function') await pool.end(); } catch {}
    try { server.kill('SIGTERM'); } catch {}
    process.exit(1);
  }
})();


