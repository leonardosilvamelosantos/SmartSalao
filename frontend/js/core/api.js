// Cliente HTTP centralizado
const ApiClient = (() => {
  // Detectar URL base automaticamente
  function getBaseURL() {
    // Se estiver rodando em localhost, usar localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    
    // Se estiver rodando em IP da rede local, usar o mesmo IP
    if (window.location.hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/)) {
      return `http://${window.location.hostname}:3000`;
    }
    
    // Fallback para localhost
    return 'http://localhost:3000';
  }
  
  const baseURL = getBaseURL();
  // console.log('🌐 API Base URL:', baseURL); // Otimizado - log removido

  function getToken() {
    return localStorage.getItem('barbeiros-token');
  }

  async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const url = path.startsWith('http') ? path : `${baseURL}${path}`;
    const finalHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Pragma': 'no-cache', ...headers };
    if (auth) {
      const token = getToken();
      if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // console.log(`🌐 [API] ${method} ${url}`); // Otimizado - log removido
    // console.log(`📱 [API] Headers:`, finalHeaders); // Otimizado - log removido
    // if (body) console.log(`📦 [API] Body:`, body); // Otimizado - log removido
    
    try {
      const res = await fetch(url, { method, headers: finalHeaders, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
      let data = {};
      try { data = await res.json(); } catch (_) {}
      
      // console.log(`📊 [API] Response: ${res.status} ${res.statusText}`); // Otimizado - log removido
      // console.log(`📄 [API] Data:`, data); // Otimizado - log removido
      
      if (!res.ok) {
        if (res.status === 401) {
          // Verificar se a requisição tinha token antes de forçar logout
          const authHeader = headers['Authorization'] || headers['authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('🔒 ApiClient: 401 sem token, não forçando logout');
            throw new Error(data.message || `Erro ${res.status}`);
          }
          
          // Usar notificação toast em vez de alert
          if (window.toastSystem) {
            window.toastSystem.error('Sessão expirada. Faça login novamente.');
          } else {
            window.notificationManager?.showWarning('Sessão expirada. Faça login novamente.');
          }
          try { localStorage.removeItem('barbeiros-token'); localStorage.removeItem('barbeiros-user'); } catch(_){}
          if (!location.pathname.includes('login')) location.href = '/frontend/pages/login';
        }
        throw new Error(data.message || `Erro ${res.status}`);
      }
      return data;
    } catch (error) {
      console.error(`❌ [API] Erro na requisição:`, error);
      
      // Mostrar notificação de erro se disponível
      if (window.toastSystem && error.message) {
        window.toastSystem.error(error.message);
      }
      
      throw error;
    }
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
// Compat: expor helper global "api(path, method='GET', body)"
// Ex.: api('/api/admin/users'), api('/api/admin/cache/clear','POST')
window.api = function(path, method = 'GET', body = null) {
  const m = (typeof method === 'string' ? method : 'GET').toUpperCase();
  switch (m) {
    case 'GET':
      return ApiClient.get(path);
    case 'POST':
      return ApiClient.post(path, body || {});
    case 'PUT':
      return ApiClient.put(path, body || {});
    case 'PATCH':
      return ApiClient.patch(path, body || {});
    case 'DELETE':
      return ApiClient.delete(path);
    default:
      return ApiClient.get(path);
  }
};

