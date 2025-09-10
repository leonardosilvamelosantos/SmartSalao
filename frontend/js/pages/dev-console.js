// Dev Console - lógica de página
(function () {
  const token = localStorage.getItem('barbeiros-token');
  const userRaw = localStorage.getItem('barbeiros-user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const email = (user && (user.email || user?.mail)) || '';
  const isAdminRole = user && (user.role === 'system_admin' || user.permissions?.admin === true || user.permissions?.system === true);
  const isAdminEmail = email === 'admin@teste.com' || email === 'amin@teste.com';
  if (!token || (!isAdminRole && !isAdminEmail)) {
    alert('Faça login como admin');
    location.href = '/frontend/pages/login';
    return;
  }

  // Navegação simples por seções
  document.querySelectorAll('[data-section]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.section').forEach((s) => { if (s) s.style.display = 'none'; });
      document.querySelectorAll('[data-section]').forEach((b) => b.classList.remove('active'));
      const target = document.getElementById('section-' + btn.dataset.section);
      if (target) { target.style.display = ''; } else { console.warn('Seção não encontrada:', btn.dataset.section); }
      btn.classList.add('active');
    });
  });

  // Adaptador para ApiClient
  const api = (path, opts = {}) => {
    const { method = 'GET', body } = opts;
    if (method === 'POST') return ApiClient.post(path, body);
    if (method === 'PUT') return ApiClient.put(path, body);
    if (method === 'PATCH') return ApiClient.patch(path, body);
    if (method === 'DELETE') return ApiClient.delete(path);
    return ApiClient.get(path);
  };

  // Users
  async function loadUsers(q = '') {
    const data = await api('/api/admin/users' + (q ? ('?search=' + encodeURIComponent(q)) : ''));
    const tb = document.getElementById('usersBody');
    if (!tb) return;
    tb.innerHTML = '';
    (data.data || []).forEach((u) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.id_usuario}</td><td>${u.id_tenant ?? '-'}</td><td>${u.nome}</td><td>${u.email}</td><td>${u.tipo}</td><td>${u.ativo ? 'Sim' : 'Não'}</td>
                      <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" data-act="imp" data-id="${u.id_usuario}">Impersonar</button>
                        <button class="btn btn-sm btn-outline-primary" data-act="toggle" data-id="${u.id_usuario}">${u.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${u.id_usuario}">Excluir</button>
                      </td>`;
      tb.appendChild(tr);
    });
  }

  const btnSearchUsers = document.getElementById('btnSearchUsers');
  if (btnSearchUsers) btnSearchUsers.onclick = () => loadUsers(document.getElementById('userSearch')?.value || '');
  const usersBody = document.getElementById('usersBody');
  if (usersBody) usersBody.onclick = async (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.act;
    try {
      if (act === 'toggle') {
        const row = btn.closest('tr');
        const ativo = row.children[5].innerText.trim() === 'Sim' ? 0 : 1;
        await api('/api/admin/users/' + id, { method: 'PATCH', body: { ativo } });
        await loadUsers(document.getElementById('userSearch')?.value || '');
      } else if (act === 'del') {
        if (!confirm('Excluir usuário?')) return;
        await api('/api/admin/users/' + id, { method: 'DELETE' });
        await loadUsers(document.getElementById('userSearch')?.value || '');
      } else if (act === 'imp') {
        const r = await api('/api/admin/impersonate/' + id, { method: 'POST' });
        navigator.clipboard.writeText(r.data.token).catch(() => {});
        alert('Token de impersonação copiado. Dura 5 min.');
        const banner = document.getElementById('impersonateBanner'); if (banner) banner.style.display = '';
      }
    } catch (err) { alert(err.message); }
  };

  // Criar usuário (modal simples via prompt)
  const btnCreateUser = document.getElementById('btnCreateUser');
  if (btnCreateUser) btnCreateUser.onclick = () => {
    const nome = prompt('Nome completo do usuário:'); if (!nome) return;
    const email = prompt('Email do usuário:'); if (!email) return;
    const telefone = prompt('Telefone/WhatsApp (opcional):');
    const senha = prompt('Senha inicial (será pedida para troca no primeiro login):'); if (!senha) return;
    const tipo = confirm('Este usuário é ADMIN? OK=Sim / Cancel=Não') ? 'admin' : 'barbeiro';
    api('/api/admin/users', { method: 'POST', body: { nome, email, telefone, senha, tipo } })
      .then(() => { alert('Usuário criado com sucesso'); loadUsers(document.getElementById('userSearch')?.value || ''); })
      .catch((err) => alert(err.message));
  };

  // Sistema
  const btnClearCache = document.getElementById('btnClearCache');
  if (btnClearCache) btnClearCache.onclick = async () => {
    try { await api('/api/admin/cache/clear', { method: 'POST', body: {} }); alert('Cache limpo'); } catch (e) { alert(e.message); }
  };
  const btnHealth = document.getElementById('btnHealth');
  if (btnHealth) btnHealth.onclick = async () => {
    try { const h = await api('/api/db-health', { method: 'GET' }); const out = document.getElementById('systemOutput'); if (out) out.textContent = JSON.stringify(h, null, 2); } catch (e) { alert(e.message); }
  };

  // Init
  (async function init() {
    try { await loadUsers(); } catch (_) {}
  })();
})();


