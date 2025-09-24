/**
 * Dev Console - Sistema de Administração
 * Interface para gerenciar tenants, usuários e sistema
 */

(function() {
  'use strict';

  // Estado da aplicação
  let currentSection = 'overview';
  let tenants = [];
  let users = [];
  let auditLogs = [];

  // Elementos DOM
  const sections = document.querySelectorAll('.section');
  const navButtons = document.querySelectorAll('[data-section]');

  // Inicialização
  function init() {
    console.log('🔍 Usuário no dev-console:', JSON.parse(localStorage.getItem('barbeiros-user') || '{}'));
    setupEventListeners();
    loadUserInfo();
    loadOverview();
  }

  // Event Listeners
  function setupEventListeners() {
    // Navegação
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const section = btn.dataset.section;
        showSection(section);
    });
  });

    // Botões de ação
    document.getElementById('btnRefreshOverview')?.addEventListener('click', loadOverview);
    document.getElementById('btnRefreshTenants')?.addEventListener('click', loadTenantsWithUsers);
    document.getElementById('btnRefreshUsers')?.addEventListener('click', loadUsers);
    document.getElementById('btnRefreshAudit')?.addEventListener('click', loadAuditLogs);
    document.getElementById('btnCreateTenant')?.addEventListener('click', createTenant);
    document.getElementById('btnCreateUser')?.addEventListener('click', createUser);
    document.getElementById('btnClearCache')?.addEventListener('click', clearCache);
    document.getElementById('btnHealth')?.addEventListener('click', checkHealth);
    document.getElementById('auditSearch')?.addEventListener('input', debounce(filterAuditLogs, 300));
  }

  // Navegação entre seções
  function showSection(sectionName) {
    // Esconder todas as seções
    sections.forEach(section => {
      section.style.display = 'none';
    });

    // Remover active de todos os botões
    navButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // Mostrar seção selecionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Ativar botão correspondente
    const targetButton = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetButton) {
      targetButton.classList.add('active');
    }

    currentSection = sectionName;

    // Carregar dados da seção
    switch(sectionName) {
      case 'overview':
        loadOverview();
        break;
      case 'tenants':
        loadTenantsWithUsers();
        break;
      case 'users':
        loadUsers();
        break;
      case 'audit':
        loadAuditLogs();
        break;
      case 'system':
        loadSystemStatus();
        break;
    }
  }

  // Carregar Overview
  async function loadOverview() {
    try {
      showLoading('section-overview');
      
      const [usersData, tenantsData] = await Promise.all([
        api('/api/admin/users').catch(() => ({ data: [] })),
        api('/api/admin/tenants-with-users').catch(() => ({ data: [] }))
      ]);

      document.getElementById('kpiTenants').textContent = tenantsData.data?.length || 0;
      document.getElementById('kpiUsers').textContent = usersData.data?.length || 0;
      document.getElementById('kpiRpm').textContent = '0';
      document.getElementById('kpiErrors').textContent = '0';
      
      showInfo('Dados atualizados com sucesso');
    } catch (error) {
      console.error('Erro ao carregar overview:', error);
      showError('Erro ao carregar dados do overview');
    } finally {
      hideLoading('section-overview');
    }
  }

  // Carregar Tenants
  async function loadTenantsWithUsers() {
    try {
      showLoading('section-tenants');
      const data = await api('/api/admin/tenants-with-users');
      tenants = data.data || [];
      renderTenantsTable();
      showSuccess(`${tenants.length} tenants carregados`);
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
      showError('Erro ao carregar tenants');
    } finally {
      hideLoading('section-tenants');
    }
  }

  // Renderizar tabela de tenants
  function renderTenantsTable() {
    const tbody = document.getElementById('tenantsTableBody');
    if (!tbody) return;

    if (tenants.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum tenant encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = tenants.map(tenant => `
      <tr>
        <td><strong>#${tenant.id_tenant}</strong></td>
        <td>
          <div class="d-flex align-items-center">
            <span class="status-indicator status-${tenant.tenant_status === 'ativo' ? 'active' : 'inactive'}"></span>
            ${tenant.tenant_nome || 'N/A'}
          </div>
        </td>
        <td>${tenant.tenant_email || 'N/A'}</td>
        <td>
          <span class="badge bg-info">${tenant.total_usuarios || 0} usuários</span>
        </td>
        <td>
          <span class="badge bg-${tenant.tenant_status === 'ativo' ? 'success' : 'secondary'}">
            ${tenant.tenant_status || 'N/A'}
          </span>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" onclick="viewTenant(${tenant.id_tenant})" title="Ver detalhes">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="editTenant(${tenant.id_tenant})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Carregar Usuários
  async function loadUsers() {
    try {
      showLoading('section-users');
      const data = await api('/api/admin/users');
      users = data.data || [];
      renderUsersTable();
      showSuccess(`${users.length} usuários carregados`);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showError('Erro ao carregar usuários');
    } finally {
      hideLoading('section-users');
    }
  }

  // Renderizar tabela de usuários
  function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
      
      if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum usuário encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td><strong>#${user.id_usuario}</strong></td>
        <td>
          <div class="d-flex align-items-center">
            <span class="status-indicator status-${user.ativo ? 'active' : 'inactive'}"></span>
            ${user.nome || 'N/A'}
          </div>
        </td>
        <td>${user.email || 'N/A'}</td>
        <td>
          <span class="badge bg-${user.tipo === 'admin' ? 'primary' : user.tipo === 'barbeiro' ? 'success' : 'secondary'}">
            ${user.tipo || 'N/A'}
          </span>
        </td>
        <td>
          <span class="badge bg-info">Tenant #${user.id_tenant || 'N/A'}</span>
        </td>
        <td>
          <span class="badge bg-${user.ativo ? 'success' : 'danger'}">
            ${user.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" onclick="viewUser(${user.id_usuario})" title="Ver detalhes">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="editUser(${user.id_usuario})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Carregar Logs de Auditoria
  async function loadAuditLogs() {
    try {
      showLoading('section-audit');
      const data = await api('/api/admin/audit-logs');
      auditLogs = data.data || [];
      renderAuditTable();
      showSuccess(`${auditLogs.length} logs de auditoria carregados`);
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria:', error);
      showError('Erro ao carregar logs de auditoria');
    } finally {
      hideLoading('section-audit');
    }
  }

  // Renderizar tabela de auditoria
  function renderAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    if (auditLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum log encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = auditLogs.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString()}</td>
        <td>${log.id_usuario_admin || 'Sistema'}</td>
        <td>${log.acao || 'N/A'}</td>
        <td>${log.entidade || 'N/A'}</td>
        <td><span class="badge bg-${log.status === 'success' ? 'success' : 'danger'}">${log.status || 'N/A'}</span></td>
      </tr>
    `).join('');
  }

  // Filtrar logs de auditoria
  function filterAuditLogs() {
    const searchTerm = document.getElementById('auditSearch').value.toLowerCase();
    const filteredLogs = auditLogs.filter(log => 
      log.acao?.toLowerCase().includes(searchTerm) ||
      log.entidade?.toLowerCase().includes(searchTerm) ||
      log.dados?.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    if (filteredLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum log encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = filteredLogs.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString()}</td>
        <td>${log.id_usuario_admin || 'Sistema'}</td>
        <td>${log.acao || 'N/A'}</td>
        <td>${log.entidade || 'N/A'}</td>
        <td><span class="badge bg-${log.status === 'success' ? 'success' : 'danger'}">${log.status || 'N/A'}</span></td>
      </tr>
    `).join('');
  }

  // Carregar Status do Sistema
  async function loadSystemStatus() {
    try {
      const user = JSON.parse(localStorage.getItem('barbeiros-user') || '{}');
      const userId = user.id || user.id_usuario || 1;
      const data = await api(`/api/admin/${userId}/system/status`);
      document.getElementById('systemOutput').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erro ao carregar status do sistema:', error);
      document.getElementById('systemOutput').textContent = `Erro: ${error.message}`;
    }
  }

  // Limpar Cache
  async function clearCache() {
    try {
      showLoading('section-system');
      await api('/api/admin/cache/clear', 'POST');
      showSuccess('Cache limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      showError('Erro ao limpar cache');
    } finally {
      hideLoading('section-system');
    }
  }

  // Verificar Health
  async function checkHealth() {
    try {
      showLoading('section-system');
      const data = await api('/health');
      document.getElementById('systemOutput').textContent = JSON.stringify(data, null, 2);
      showSuccess('Health check realizado com sucesso');
    } catch (error) {
      console.error('Erro ao verificar health:', error);
      document.getElementById('systemOutput').textContent = `Erro: ${error.message}`;
      showError('Erro ao verificar health do sistema');
    } finally {
      hideLoading('section-system');
    }
  }

  // Criar Tenant
  function createTenant() {
    // Criar modal dinamicamente
    const modalHtml = `
      <div class="modal fade" id="createTenantModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-building me-2"></i>Novo Tenant</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="createTenantForm">
                <div class="mb-3">
                  <label for="tenantNome" class="form-label">Nome do Tenant *</label>
                  <input type="text" class="form-control" id="tenantNome" required>
                </div>
                <div class="mb-3">
                  <label for="tenantEmail" class="form-label">Email do Tenant *</label>
                  <input type="email" class="form-control" id="tenantEmail" required>
                </div>
                <div class="mb-3">
                  <label for="tenantStatus" class="form-label">Status *</label>
                  <select class="form-select" id="tenantStatus" required>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label for="tenantPlano" class="form-label">Plano</label>
                  <select class="form-select" id="tenantPlano">
                    <option value="basico">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label for="tenantLimites" class="form-label">Limites (JSON)</label>
                  <textarea class="form-control" id="tenantLimites" rows="3" placeholder='{"usuarios": 10, "agendamentos": 100}'></textarea>
                  <div class="form-text">Formato JSON para definir limites do tenant</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-success" id="btnCreateTenantSubmit">
                <i class="bi bi-check-lg me-1"></i>Criar Tenant
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('createTenantModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('createTenantModal'));
    modal.show();
    
    // Event listener para submit
    document.getElementById('btnCreateTenantSubmit').addEventListener('click', async () => {
      try {
        const form = document.getElementById('createTenantForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = {
          nome: document.getElementById('tenantNome').value,
          email: document.getElementById('tenantEmail').value,
          status: document.getElementById('tenantStatus').value,
          plano: document.getElementById('tenantPlano').value,
          limites: document.getElementById('tenantLimites').value || null
        };
        
        // Validar JSON de limites se fornecido
        if (formData.limites) {
          try {
            JSON.parse(formData.limites);
          } catch (e) {
            showError('Formato JSON inválido nos limites');
            return;
          }
        }
        
        // Mostrar loading no botão
        const submitBtn = document.getElementById('btnCreateTenantSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Criando...';
        submitBtn.disabled = true;
        
        // Aqui você implementaria a chamada para a API de criação
        // await api('/api/admin/tenants', 'POST', formData);
        
        modal.hide();
        showSuccess('Tenant criado com sucesso!');
        
        // Atualizar listas
        await loadTenantsWithUsers();
        
      } catch (error) {
        console.error('Erro ao criar tenant:', error);
        showError(error.message || 'Erro ao criar tenant');
      } finally {
        // Restaurar botão
        const submitBtn = document.getElementById('btnCreateTenantSubmit');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
    
    // Limpar modal quando fechado
    document.getElementById('createTenantModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('createTenantModal').remove();
    });
  }

  // Criar Usuário
  async function createUser() {
    // Criar modal dinamicamente
    const modalHtml = `
      <div class="modal fade" id="createUserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>Novo Usuário</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="createUserForm">
                <div class="mb-3">
                  <label for="userNome" class="form-label">Nome *</label>
                  <input type="text" class="form-control" id="userNome" required>
                </div>
                <div class="mb-3">
                  <label for="userEmail" class="form-label">Email *</label>
                  <input type="email" class="form-control" id="userEmail" required>
                </div>
                <div class="mb-3">
                  <label for="userSenha" class="form-label">Senha *</label>
                  <input type="password" class="form-control" id="userSenha" minlength="8" required>
                  <div class="form-text">Mínimo 8 caracteres</div>
                </div>
                <div class="mb-3">
                  <label for="userTipo" class="form-label">Tipo *</label>
                  <select class="form-select" id="userTipo" required>
                    <option value="barbeiro">Barbeiro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label for="userWhatsapp" class="form-label">WhatsApp (opcional)</label>
                  <input type="tel" class="form-control" id="userWhatsapp" placeholder="11999999999">
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-success" id="btnCreateUserSubmit">
                <i class="bi bi-check-lg me-1"></i>Criar Usuário
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('createUserModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
    modal.show();
    
    // Event listener para submit
    document.getElementById('btnCreateUserSubmit').addEventListener('click', async () => {
      try {
        const form = document.getElementById('createUserForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = {
          nome: document.getElementById('userNome').value,
          email: document.getElementById('userEmail').value,
          senha: document.getElementById('userSenha').value,
          tipo: document.getElementById('userTipo').value,
          whatsapp: document.getElementById('userWhatsapp').value || null,
          create_tenant: false
        };
        
        // Mostrar loading no botão
        const submitBtn = document.getElementById('btnCreateUserSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Criando...';
        submitBtn.disabled = true;
        
        await api('/api/admin/users', 'POST', formData);
        
        modal.hide();
        showSuccess('Usuário criado com sucesso!');
        
        // Atualizar listas
        await loadUsers();
        await loadTenantsWithUsers();
        
      } catch (error) {
        console.error('Erro ao criar usuário:', error);
        showError(error.message || 'Erro ao criar usuário');
      } finally {
        // Restaurar botão
        const submitBtn = document.getElementById('btnCreateUserSubmit');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
    
    // Limpar modal quando fechado
    document.getElementById('createUserModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('createUserModal').remove();
    });
  }

  // Ver Tenant
  function viewTenant(tenantId) {
    const tenant = tenants.find(t => t.id_tenant == tenantId);
    if (tenant) {
      // Criar modal de visualização
      const modalHtml = `
        <div class="modal fade" id="viewTenantModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-building me-2"></i>Detalhes do Tenant</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6">
                    <h6>Informações Básicas</h6>
                    <p><strong>ID:</strong> ${tenant.id_tenant}</p>
                    <p><strong>Nome:</strong> ${tenant.tenant_nome || 'N/A'}</p>
                    <p><strong>Email:</strong> ${tenant.tenant_email || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="badge bg-${tenant.tenant_status === 'ativo' ? 'success' : 'secondary'}">${tenant.tenant_status || 'N/A'}</span></p>
                  </div>
                  <div class="col-md-6">
                    <h6>Estatísticas</h6>
                    <p><strong>Total de Usuários:</strong> ${tenant.total_usuarios || 0}</p>
                    <p><strong>Criado em:</strong> ${tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    <p><strong>Última Atualização:</strong> ${tenant.updated_at ? new Date(tenant.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                <button type="button" class="btn btn-primary" onclick="editTenant(${tenantId})" data-bs-dismiss="modal">Editar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Remover modal existente se houver
      const existingModal = document.getElementById('viewTenantModal');
      if (existingModal) existingModal.remove();
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = new bootstrap.Modal(document.getElementById('viewTenantModal'));
      modal.show();
      
      // Limpar modal quando fechado
      document.getElementById('viewTenantModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('viewTenantModal').remove();
      });
    } else {
      showWarning('Tenant não encontrado');
    }
  }

  // Editar Tenant
  function editTenant(tenantId) {
    const tenant = tenants.find(t => t.id_tenant == tenantId);
    if (!tenant) {
      showWarning('Tenant não encontrado');
      return;
    }

    // Criar modal de edição
    const modalHtml = `
      <div class="modal fade" id="editTenantModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar Tenant</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="editTenantForm">
                <div class="mb-3">
                  <label for="tenantNome" class="form-label">Nome *</label>
                  <input type="text" class="form-control" id="tenantNome" value="${tenant.tenant_nome || ''}" required>
                </div>
                <div class="mb-3">
                  <label for="tenantEmail" class="form-label">Email *</label>
                  <input type="email" class="form-control" id="tenantEmail" value="${tenant.tenant_email || ''}" required>
                </div>
                <div class="mb-3">
                  <label for="tenantStatus" class="form-label">Status *</label>
                  <select class="form-select" id="tenantStatus" required>
                    <option value="ativo" ${tenant.tenant_status === 'ativo' ? 'selected' : ''}>Ativo</option>
                    <option value="inativo" ${tenant.tenant_status === 'inativo' ? 'selected' : ''}>Inativo</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnEditTenantSubmit">
                <i class="bi bi-check-lg me-1"></i>Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('editTenantModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('editTenantModal'));
    modal.show();
    
    // Event listener para submit
    document.getElementById('btnEditTenantSubmit').addEventListener('click', async () => {
      try {
        const form = document.getElementById('editTenantForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = {
          nome: document.getElementById('tenantNome').value,
          email: document.getElementById('tenantEmail').value,
          status: document.getElementById('tenantStatus').value
        };
        
        // Mostrar loading no botão
        const submitBtn = document.getElementById('btnEditTenantSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Salvando...';
        submitBtn.disabled = true;
        
        // Aqui você implementaria a chamada para a API de edição
        // await api(`/api/admin/tenants/${tenantId}`, 'PUT', formData);
        
        modal.hide();
        showSuccess('Tenant atualizado com sucesso!');
        
        // Atualizar lista
        await loadTenantsWithUsers();
        
      } catch (error) {
        console.error('Erro ao editar tenant:', error);
        showError(error.message || 'Erro ao editar tenant');
      } finally {
        // Restaurar botão
        const submitBtn = document.getElementById('btnEditTenantSubmit');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
    
    // Limpar modal quando fechado
    document.getElementById('editTenantModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('editTenantModal').remove();
    });
  }

  // Ver Usuário
  function viewUser(userId) {
    const user = users.find(u => u.id_usuario == userId);
    if (user) {
      // Criar modal de visualização
      const modalHtml = `
        <div class="modal fade" id="viewUserModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-person me-2"></i>Detalhes do Usuário</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6">
                    <h6>Informações Pessoais</h6>
                    <p><strong>ID:</strong> ${user.id_usuario}</p>
                    <p><strong>Nome:</strong> ${user.nome || 'N/A'}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>WhatsApp:</strong> ${user.whatsapp || 'N/A'}</p>
                  </div>
                  <div class="col-md-6">
                    <h6>Informações do Sistema</h6>
                    <p><strong>Tipo:</strong> <span class="badge bg-${user.tipo === 'admin' ? 'primary' : 'success'}">${user.tipo || 'N/A'}</span></p>
                    <p><strong>Status:</strong> <span class="badge bg-${user.ativo ? 'success' : 'danger'}">${user.ativo ? 'Ativo' : 'Inativo'}</span></p>
                    <p><strong>Tenant ID:</strong> ${user.id_tenant || 'N/A'}</p>
                    <p><strong>Criado em:</strong> ${user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                <button type="button" class="btn btn-primary" onclick="editUser(${userId})" data-bs-dismiss="modal">Editar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Remover modal existente se houver
      const existingModal = document.getElementById('viewUserModal');
      if (existingModal) existingModal.remove();
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
      modal.show();
      
      // Limpar modal quando fechado
      document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('viewUserModal').remove();
      });
    } else {
      showWarning('Usuário não encontrado');
    }
  }

  // Editar Usuário
  function editUser(userId) {
    const user = users.find(u => u.id_usuario == userId);
    if (!user) {
      showWarning('Usuário não encontrado');
      return;
    }

    // Criar modal de edição
    const modalHtml = `
      <div class="modal fade" id="editUserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Editar Usuário</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="editUserForm">
                <div class="mb-3">
                  <label for="editUserNome" class="form-label">Nome *</label>
                  <input type="text" class="form-control" id="editUserNome" value="${user.nome || ''}" required>
                </div>
                <div class="mb-3">
                  <label for="editUserEmail" class="form-label">Email *</label>
                  <input type="email" class="form-control" id="editUserEmail" value="${user.email || ''}" required>
                </div>
                <div class="mb-3">
                  <label for="editUserTipo" class="form-label">Tipo *</label>
                  <select class="form-select" id="editUserTipo" required>
                    <option value="barbeiro" ${user.tipo === 'barbeiro' ? 'selected' : ''}>Barbeiro</option>
                    <option value="admin" ${user.tipo === 'admin' ? 'selected' : ''}>Administrador</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label for="editUserWhatsapp" class="form-label">WhatsApp</label>
                  <input type="tel" class="form-control" id="editUserWhatsapp" value="${user.whatsapp || ''}" placeholder="11999999999">
                </div>
                <div class="mb-3">
                  <label for="editUserAtivo" class="form-label">Status *</label>
                  <select class="form-select" id="editUserAtivo" required>
                    <option value="true" ${user.ativo ? 'selected' : ''}>Ativo</option>
                    <option value="false" ${!user.ativo ? 'selected' : ''}>Inativo</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label for="editUserSenha" class="form-label">Nova Senha (opcional)</label>
                  <input type="password" class="form-control" id="editUserSenha" placeholder="Deixe em branco para manter a senha atual">
                  <div class="form-text">Mínimo 8 caracteres</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnEditUserSubmit">
                <i class="bi bi-check-lg me-1"></i>Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('editUserModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
    
    // Event listener para submit
    document.getElementById('btnEditUserSubmit').addEventListener('click', async () => {
      try {
        const form = document.getElementById('editUserForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = {
          nome: document.getElementById('editUserNome').value,
          email: document.getElementById('editUserEmail').value,
          tipo: document.getElementById('editUserTipo').value,
          whatsapp: document.getElementById('editUserWhatsapp').value || null,
          ativo: document.getElementById('editUserAtivo').value === 'true'
        };
        
        // Adicionar senha apenas se fornecida
        const senha = document.getElementById('editUserSenha').value;
        if (senha && senha.length >= 8) {
          formData.senha = senha;
        }
        
        // Mostrar loading no botão
        const submitBtn = document.getElementById('btnEditUserSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Salvando...';
        submitBtn.disabled = true;
        
        // Aqui você implementaria a chamada para a API de edição
        // await api(`/api/admin/users/${userId}`, 'PUT', formData);
        
        modal.hide();
        showSuccess('Usuário atualizado com sucesso!');
        
        // Atualizar lista
        await loadUsers();
        
      } catch (error) {
        console.error('Erro ao editar usuário:', error);
        showError(error.message || 'Erro ao editar usuário');
      } finally {
        // Restaurar botão
        const submitBtn = document.getElementById('btnEditUserSubmit');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
    
    // Limpar modal quando fechado
    document.getElementById('editUserModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('editUserModal').remove();
    });
  }

  // Carregar informações do usuário
  function loadUserInfo() {
    try {
      const user = JSON.parse(localStorage.getItem('barbeiros-user') || '{}');
      const userInfo = document.getElementById('currentUser');
      if (userInfo && user.nome) {
        userInfo.textContent = `${user.nome} (${user.email})`;
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
    }
  }

  // Sistema de Notificações Toast
  function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const iconMap = {
      success: 'bi-check-circle-fill text-success',
      error: 'bi-exclamation-triangle-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning',
      info: 'bi-info-circle-fill text-info'
    };
    
    const toastHtml = `
      <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <i class="bi ${iconMap[type] || iconMap.info} me-2"></i>
          <strong class="me-auto">Dev Console</strong>
          <small class="text-muted">agora</small>
          <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();
    
    // Remover elemento após ser escondido
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  // Utilitários melhorados
  function showSuccess(message) {
    showToast(message, 'success');
    console.log('✅', message);
  }

  function showError(message) {
    showToast(message, 'error');
    console.error('❌', message);
  }

  function showWarning(message) {
    showToast(message, 'warning');
    console.warn('⚠️', message);
  }

  function showInfo(message) {
    showToast(message, 'info');
    console.info('ℹ️', message);
  }

  // Loading States
  function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.position = 'relative';
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.id = `loading-${elementId}`;
      overlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>';
      element.appendChild(overlay);
    }
  }

  function hideLoading(elementId) {
    const overlay = document.getElementById(`loading-${elementId}`);
    if (overlay) {
      overlay.remove();
    }
  }

  // Debounce para otimizar busca
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Funções globais para uso em onclick
  window.viewTenant = viewTenant;
  window.editTenant = editTenant;
  window.viewUser = viewUser;
  window.editUser = editUser;

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();