// Cliente HTTP centralizado
const ApiClient = (() => {
  const baseURL = 'http://localhost:3000';

  function getToken() {
    return localStorage.getItem('barbeiros-token');
  }

  async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const url = path.startsWith('http') ? path : `${baseURL}${path}`;
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    if (auth) {
      const token = getToken();
      if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { method, headers: finalHeaders, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
        try { localStorage.removeItem('barbeiros-token'); localStorage.removeItem('barbeiros-user'); } catch(_){}
        if (!location.pathname.includes('login')) location.href = '/frontend/pages/login';
      }
      throw new Error(data.message || `Erro ${res.status}`);
    }
    return data;
  }

  return {
    get: (p, o={}) => request(p, { ...o, method: 'GET' }),
    post: (p, b, o={}) => request(p, { ...o, method: 'POST', body: b }),
    put: (p, b, o={}) => request(p, { ...o, method: 'PUT', body: b }),
    patch: (p, b, o={}) => request(p, { ...o, method: 'PATCH', body: b }),
    delete: (p, o={}) => request(p, { ...o, method: 'DELETE' })
  };
})();

window.ApiClient = ApiClient;


