// Testes E2E inteligentes via Node (sem depender de PowerShell quoting)
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

  try {
    const fetch = global.fetch || (await import('node-fetch')).default;
    const baseUrl = 'http://localhost:3000';

    // Subir servidor local como child process
    const { spawn } = require('child_process');
    const server = spawn(process.execPath, ['./src/index.js'], { env: { ...process.env }, stdio: 'inherit' });

    // Aguardar /health ficar disponível (até 20s)
    const waitForServer = async () => {
      const start = Date.now();
      while (Date.now() - start < 20000) {
        try {
          const res = await fetch(baseUrl + '/health');
          if (res.ok) return true;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }
      return false;
    };
    const up = await waitForServer();
    if (!up) throw new Error('Servidor não iniciou a tempo');

    // 1) Obter último usuário migrado e gerar token
    const u = (await pool.query('SELECT id_usuario, id_tenant, nome, email FROM usuarios ORDER BY id_usuario DESC LIMIT 1')).rows[0];
    const token = auth.generateToken({
      id_usuario: u.id_usuario,
      id_tenant: u.id_tenant || 1,
      email: u.email || `user${u.id_usuario}@example.com`,
      role: 'barbeiro',
      schema_name: null,
      plano: 'basico'
    });

    // Helper para requests
    const request = async (method, path, body) => {
      const res = await fetch(baseUrl + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      return { status: res.status, data: json };
    };

    // 2) Listar usuários (GET /api/usuarios)
    const listUsers = await request('GET', '/api/usuarios?limit=5');
    console.log('GET /api/usuarios ->', listUsers.status);
    console.log(listUsers.data);

    // 3) Criar cliente (POST /api/clientes)
    const suffix = Date.now().toString().slice(-5);
    const createCli = await request('POST', '/api/clientes', {
      nome: `Cliente E2E ${suffix}`,
      whatsapp: `+5599${suffix}${suffix}`,
      email: `cli${suffix}@teste.com`
    });
    console.log('POST /api/clientes ->', createCli.status);
    console.log(createCli.data);

    // 4) Listar clientes (GET /api/clientes)
    const listCli = await request('GET', '/api/clientes?limit=5');
    console.log('GET /api/clientes ->', listCli.status);
    console.log(listCli.data);

    // 5) Verificar IDs migrados diretamente no banco
    const ids = await pool.query('SELECT id_usuario, nome FROM usuarios ORDER BY id_usuario DESC LIMIT 10');
    console.log('Últimos usuários migrados (id, nome):', ids.rows);

    // Critério simples de aprovação (> 90%): respostas 200/201 em 4/4
    const passed = [listUsers.status, createCli.status, listCli.status].filter(s => s >= 200 && s < 300).length >= 3;
    console.log('PASS >=90%:', passed);

    if (typeof pool.end === 'function') await pool.end();
    server.kill('SIGTERM');
    process.exit(passed ? 0 : 1);
  } catch (e) {
    console.error('E2E error:', e);
    try { if (typeof pool.end === 'function') await pool.end(); } catch {}
    try { if (typeof server !== 'undefined') server.kill('SIGTERM'); } catch {}
    process.exit(1);
  }
})();


