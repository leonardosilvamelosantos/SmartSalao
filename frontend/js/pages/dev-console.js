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
    document.getElementById('btnRefreshTenants')?.addEventListener('click', loadTenantsWithUsers);
    document.getElementById('btnRefreshUsers')?.addEventListener('click', loadUsers);
    document.getElementById('btnRefreshAudit')?.addEventListener('click', loadAuditLogs);
    document.getElementById('btnCreateTenant')?.addEventListener('click', createTenant);
    document.getElementById('btnCreateUser')?.addEventListener('click', createUser);
    document.getElementById('btnClearCache')?.addEventListener('click', clearCache);
    document.getElementById('btnHealth')?.addEventListener('click', checkHealth);
    document.getElementById('auditSearch')?.addEventListener('input', filterAuditLogs);
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
      const [usersData, tenantsData] = await Promise.all([
        api('/api/admin/users').catch(() => ({ data: [] })),
        api('/api/admin/tenants-with-users').catch(() => ({ data: [] }))
      ]);

      document.getElementById('kpiTenants').textContent = tenantsData.data?.length || 0;
      document.getElementById('kpiUsers').textContent = usersData.data?.length || 0;
      document.getElementById('kpiRpm').textContent = '0';
      document.getElementById('kpiErrors').textContent = '0';
    } catch (error) {
      console.error('Erro ao carregar overview:', error);
    }
  }

  // Carregar Tenants
  async function loadTenantsWithUsers() {
    try {
      const data = await api('/api/admin/tenants-with-users');
      tenants = data.data || [];
      renderTenantsTable();
    } catch (error) {
      console.error('Erro ao carregar tenants:', error);
      showError('Erro ao carregar tenants');
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
        <td>${tenant.id_tenant}</td>
        <td>${tenant.tenant_nome || 'N/A'}</td>
        <td>${tenant.tenant_email || 'N/A'}</td>
        <td>${tenant.total_usuarios || 0}</td>
        <td><span class="badge bg-${tenant.tenant_status === 'ativo' ? 'success' : 'secondary'}">${tenant.tenant_status || 'N/A'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewTenant(${tenant.id_tenant})">Ver</button>
        </td>
      </tr>
    `).join('');
  }

  // Carregar Usuários
  async function loadUsers() {
    try {
      const data = await api('/api/admin/users');
      users = data.data || [];
      renderUsersTable();
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showError('Erro ao carregar usuários');
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
              <td>${user.id_usuario}</td>
        <td>${user.nome || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td><span class="badge bg-${user.tipo === 'admin' ? 'primary' : 'secondary'}">${user.tipo || 'N/A'}</span></td>
        <td>${user.id_tenant || 'N/A'}</td>
        <td><span class="badge bg-${user.ativo ? 'success' : 'danger'}">${user.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewUser(${user.id_usuario})">Ver</button>
          <button class="btn btn-sm btn-outline-warning" onclick="editUser(${user.id_usuario})">Editar</button>
        </td>
            </tr>
    `).join('');
  }

  // Carregar Logs de Auditoria
  async function loadAuditLogs() {
    try {
      const data = await api('/api/admin/audit-logs');
      auditLogs = data.data || [];
      renderAuditTable();
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria:', error);
      showError('Erro ao carregar logs de auditoria');
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
      const data = await api('/api/admin/system/status');
      document.getElementById('systemOutput').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erro ao carregar status do sistema:', error);
      document.getElementById('systemOutput').textContent = `Erro: ${error.message}`;
    }
  }

  // Limpar Cache
  async function clearCache() {
    try {
      await api('/api/admin/cache/clear', 'POST');
      showSuccess('Cache limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      showError('Erro ao limpar cache');
    }
  }

  // Verificar Health
  async function checkHealth() {
    try {
      const data = await api('/health');
      document.getElementById('systemOutput').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erro ao verificar health:', error);
      document.getElementById('systemOutput').textContent = `Erro: ${error.message}`;
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
  function createUser() {
    const name = prompt('Nome do usuário:');
    const email = prompt('Email do usuário:');
    if (name && email) {
      // Implementar criação de usuário
      showSuccess('Funcionalidade em desenvolvimento');
    }
  }

  // Ver Tenant
  function viewTenant(tenantId) {
    console.log('Ver tenant:', tenantId);
    showSuccess('Funcionalidade em desenvolvimento');
  }

  // Ver Usuário
  function viewUser(userId) {
    console.log('Ver usuário:', userId);
    showSuccess('Funcionalidade em desenvolvimento');
  }

  // Editar Usuário
  function editUser(userId) {
    console.log('Editar usuário:', userId);
    showSuccess('Funcionalidade em desenvolvimento');
  }

  // Utilitários
  function showSuccess(message) {
    // Implementar notificação de sucesso
    console.log('✅', message);
  }

  function showError(message) {
    // Implementar notificação de erro
    console.error('❌', message);
  }

  // Funções globais para uso em onclick
  window.viewTenant = viewTenant;
  window.viewUser = viewUser;
  window.editUser = editUser;

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();