// Dev Console - lógica de página
(function () {
  const token = localStorage.getItem('barbeiros-token');
  const userRaw = localStorage.getItem('barbeiros-user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const email = (user && (user.email || user?.mail)) || '';
  const isAdminRole = user && (user.role === 'system_admin' || user.role === 'admin' || user.tipo === 'admin' || user.permissions?.admin === true || user.permissions?.system === true);
  const isAdminEmail = email === 'admin@teste.com' || email === 'amin@teste.com';
  
  // Debug: mostrar informações do usuário
  console.log('🔍 Usuário no dev-console:', {
    user: user,
    email: email,
    isAdminRole: isAdminRole,
    isAdminEmail: isAdminEmail,
    role: user?.role,
    tipo: user?.tipo,
    permissions: user?.permissions
  });
  
  if (!token || (!isAdminRole && !isAdminEmail)) {
    alert('Faça login como admin. Role: ' + (user?.role || 'undefined') + ', Tipo: ' + (user?.tipo || 'undefined'));
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

  // Tenants with Users
  async function loadTenantsWithUsers(q = '') {
    const data = await api('/api/admin/tenants-with-users' + (q ? ('?search=' + encodeURIComponent(q)) : ''));
    const tb = document.getElementById('tenantsBody');
    if (!tb) return;
    tb.innerHTML = '';
    
    if (!data.data || data.data.length === 0) {
      tb.innerHTML = '<tr><td colspan="5" class="text-muted">Nenhum tenant encontrado</td></tr>';
      return;
    }
    
    data.data.forEach((tenant) => {
      const tr = document.createElement('tr');
      const statusBadge = tenant.tenant_status === 'ativo' ? 'badge bg-success' : 'badge bg-secondary';
      const statusText = tenant.tenant_status === 'ativo' ? 'Ativo' : 'Inativo';
      
      tr.innerHTML = `
        <td>${tenant.id_tenant}</td>
        <td>
          <div class="fw-bold">${tenant.tenant_nome}</div>
          <small class="text-muted">${tenant.tenant_email}</small>
        </td>
        <td>
          <span class="badge bg-primary">${tenant.plano || 'Básico'}</span>
          <br>
          <small class="text-muted">${tenant.tenant_telefone || 'N/A'}</small>
        </td>
        <td>
          <span class="${statusBadge}">${statusText}</span>
          <br>
          <small class="text-muted">${tenant.total_usuarios} usuários</small>
        </td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-info" data-act="view-users" data-tenant-id="${tenant.id_tenant}" data-tenant-name="${tenant.tenant_nome}">
            Ver Usuários (${tenant.total_usuarios})
          </button>
          <button class="btn btn-sm btn-outline-primary" data-act="edit-tenant" data-tenant-id="${tenant.id_tenant}">
            Editar
          </button>
        </td>
      `;
      tb.appendChild(tr);
    });
  }

  // Tenants search
  const btnSearchTenants = document.getElementById('btnSearchTenants');
  if (btnSearchTenants) btnSearchTenants.onclick = () => loadTenantsWithUsers(document.getElementById('tenantSearch')?.value || '');
  
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

  // Tenants table click handler
  const tenantsBody = document.getElementById('tenantsBody');
  if (tenantsBody) tenantsBody.onclick = async (e) => {
    const btn = e.target.closest('button'); 
    if (!btn) return;
    const act = btn.dataset.act;
    const tenantId = btn.dataset.tenantId;
    const tenantName = btn.dataset.tenantName;
    
    try {
      if (act === 'view-users') {
        // Mostrar usuários do tenant em um modal
        await showTenantUsers(tenantId, tenantName);
      } else if (act === 'edit-tenant') {
        // Implementar edição de tenant
        alert('Funcionalidade de edição de tenant em desenvolvimento');
      }
    } catch (err) { 
      alert('Erro: ' + err.message); 
    }
  };

  // Função para mostrar usuários de um tenant
  async function showTenantUsers(tenantId, tenantName) {
    try {
      const data = await api(`/api/admin/users?tenant=${tenantId}`);
      const users = data.data || [];
      
      let modalHtml = `
        <div class="modal fade" id="tenantUsersModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Usuários do Tenant: ${tenantName}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="table-responsive">
                  <table class="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Admin Level</th>
                        <th>Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
      `;
      
      if (users.length === 0) {
        modalHtml += '<tr><td colspan="7" class="text-muted">Nenhum usuário encontrado</td></tr>';
      } else {
        users.forEach(user => {
          const statusBadge = user.ativo ? 'badge bg-success' : 'badge bg-secondary';
          const statusText = user.ativo ? 'Ativo' : 'Inativo';
          const adminLevel = user.admin_level ? `<span class="badge bg-info">${user.admin_level}</span>` : '-';
          const createdDate = new Date(user.created_at).toLocaleDateString('pt-BR');
          
          modalHtml += `
            <tr>
              <td>${user.id_usuario}</td>
              <td>${user.nome}</td>
              <td>${user.email}</td>
              <td><span class="badge ${user.tipo === 'admin' ? 'bg-primary' : 'bg-secondary'}">${user.tipo}</span></td>
              <td><span class="${statusBadge}">${statusText}</span></td>
              <td>${adminLevel}</td>
              <td>${createdDate}</td>
            </tr>
          `;
        });
      }
      
      modalHtml += `
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Remover modal existente se houver
      const existingModal = document.getElementById('tenantUsersModal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Adicionar modal ao body
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Mostrar modal
      const modal = new bootstrap.Modal(document.getElementById('tenantUsersModal'));
      modal.show();
      
    } catch (error) {
      alert('Erro ao carregar usuários do tenant: ' + error.message);
    }
  }

  // Criar usuário (modal simples via prompt)
  const btnCreateUser = document.getElementById('btnCreateUser');
  if (btnCreateUser) btnCreateUser.onclick = () => {
    const nome = prompt('Nome completo do usuário:'); if (!nome) return;
    const email = prompt('Email do usuário:'); if (!email) return;
    const telefone = prompt('Telefone/WhatsApp (opcional):');
    const senha = prompt('Senha inicial (será pedida para troca no primeiro login):'); if (!senha) return;
    const tipo = confirm('Este usuário é ADMIN? OK=Sim / Cancel=Não') ? 'admin' : 'barbeiro';
    
    let admin_level = null;
    let create_tenant = false;
    
    // Se for admin, perguntar sobre o nível de admin
    if (tipo === 'admin') {
      const adminLevelChoice = prompt(
        'Nível de ADMIN:\n\n' +
        '1 = Admin Local (usa tenant existente)\n' +
        '2 = Admin Empresa (pode criar tenant - empresas grandes)\n\n' +
        'Digite 1 ou 2:'
      );
      
      if (adminLevelChoice === '1') {
        admin_level = 'local';
        create_tenant = false;
      } else if (adminLevelChoice === '2') {
        admin_level = 'empresa';
        create_tenant = confirm('Criar um novo TENANT para este admin de empresa?\n\nOK=Sim / Cancel=Não');
      } else {
        alert('Opção inválida. Usuário será criado como Admin Local.');
        admin_level = 'local';
        create_tenant = false;
      }
    }
    
    const requestBody = { nome, email, telefone, senha, tipo };
    if (admin_level) {
      requestBody.admin_level = admin_level;
    }
    if (create_tenant) {
      requestBody.create_tenant = true;
    }
    
    api('/api/admin/users', { method: 'POST', body: requestBody })
      .then((response) => { 
        let message = 'Usuário criado com sucesso!';
        if (create_tenant) {
          message += `\n\n✅ Novo tenant criado automaticamente\nTenant ID: ${response.data.id_tenant}`;
        } else if (admin_level === 'empresa') {
          message += '\n\nℹ️ Admin de empresa criado (sem tenant automático)';
        } else if (admin_level === 'local') {
          message += '\n\nℹ️ Admin local criado (usa tenant existente)';
        }
        alert(message); 
        loadUsers(document.getElementById('userSearch')?.value || ''); 
      })
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
    try { 
      await loadUsers(); 
      await loadTenantsWithUsers(); 
    } catch (_) {}
  })();
})();


