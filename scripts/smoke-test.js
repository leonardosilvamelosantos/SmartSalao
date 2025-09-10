const http = require('http');

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const results = {};
  results.health = await request('/health');
  // Tentativa de /api/db-health não autenticado
  results.dbHealth = await request('/api/db-health');

  // Fluxo público de teste
  results.testPublic = await request('/api/test', 'POST', { ping: 'ok' });

  // Fluxo autenticado simples (requer token válido). Se existir no localStorage no browser, pule.
  // Para ambiente de script, vamos tentar um token de dev via AuthService se disponível.
  try {
    const loginRes = await request('/api/auth/login', 'POST', { email: 'admin@teste.com', password: 'admin123' });
    results.login = loginRes;
    let token;
    try { token = JSON.parse(loginRes.body).data?.token; } catch (_) {}
    if (token) {
      results.clientes = await request('/api/clientes', 'GET', null, token);
      results.servicos = await request('/api/servicos', 'GET', null, token);
      results.agendamentos = await request('/api/agendamentos', 'GET', null, token);
    }
  } catch (e) {
    results.loginError = e.message;
  }

  console.log('SMOKE RESULTS:\n', JSON.stringify(results, null, 2));
})();


