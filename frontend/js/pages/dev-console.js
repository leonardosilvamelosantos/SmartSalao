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
    const name = prompt('Nome do tenant:');
    const email = prompt('Email do tenant:');
    if (name && email) {
      // Implementar criação de tenant
      showSuccess('Funcionalidade em desenvolvimento');
    }
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
      showInfo(`Tenant: ${tenant.tenant_nome || 'N/A'} (ID: ${tenantId})`);
    } else {
      showWarning('Tenant não encontrado');
    }
  }

  // Editar Tenant
  function editTenant(tenantId) {
    showWarning('Edição de tenant em desenvolvimento');
  }

  // Ver Usuário
  function viewUser(userId) {
    const user = users.find(u => u.id_usuario == userId);
    if (user) {
      showInfo(`Usuário: ${user.nome || 'N/A'} (${user.email}) - Tipo: ${user.tipo}`);
    } else {
      showWarning('Usuário não encontrado');
    }
  }

  // Editar Usuário
  function editUser(userId) {
    showWarning('Edição de usuário em desenvolvimento');
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