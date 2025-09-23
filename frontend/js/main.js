// JavaScript Principal - Sistema Barbeiros

class BarbeirosApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.apiUrl = this.getApiUrl();
        this.token = null;
        this.user = null;
        this.init();
    }

    // Detectar URL da API automaticamente
    getApiUrl() {
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

    async init() {
        // Limpar dados de autenticação inválidos na inicialização
        this.clearInvalidAuthData();
        this.checkAuth();
        this.setupEventListeners();
        
        // Carregar dados do dashboard
        await this.loadDashboardData();
        
        // Carregar dados de todas as páginas em background para melhor UX
        this.loadAllPagesData();
    }

    // Carregar dados de todas as páginas em background
    loadAllPagesData() {
        
        // Carregar dados de serviços
        this.loadServicosData().then(() => {
        }).catch(error => {
            console.warn('⚠️ Erro ao carregar dados de serviços:', error);
        });
        
        // Carregar dados de clientes
        this.loadClientesData().then(() => {
        }).catch(error => {
            console.warn('⚠️ Erro ao carregar dados de clientes:', error);
        });
        
        // Carregar dados de agenda
        this.loadAgendaData().then(() => {
        }).catch(error => {
            console.warn('⚠️ Erro ao carregar dados de agenda:', error);
        });
        
        // Carregar dados de usuários
        this.loadUsuariosData().then(() => {
        }).catch(error => {
            console.warn('⚠️ Erro ao carregar dados de usuários:', error);
        });
        
        console.log('🚀 Carregamento em background iniciado para todas as páginas');
    }

    // Função auxiliar para gerenciar modal de forma segura
    showModal(title, content) {
        const modalElement = document.getElementById('formModal');
        const modalTitle = document.getElementById('formModalTitle');
        const modalBody = document.getElementById('formModalBody');
        
        // Configurar conteúdo
        if (modalTitle) modalTitle.innerHTML = title;
        if (modalBody) modalBody.innerHTML = content;
        
        // Remover event listeners antigos para evitar duplicação
        modalElement.removeEventListener('shown.bs.modal', this.modalShownHandler);
        modalElement.removeEventListener('hidden.bs.modal', this.modalHiddenHandler);
        
        // Criar handlers únicos para este modal
        this.modalShownHandler = () => {
            modalElement.setAttribute('aria-hidden', 'false');
            // Focar no primeiro elemento interativo
            const firstInput = modalElement.querySelector('input, button, select, textarea');
            if (firstInput) firstInput.focus();
        };
        
        this.modalHiddenHandler = () => {
            modalElement.setAttribute('aria-hidden', 'true');
            // Limpar conteúdo do modal
            const modalBody = document.getElementById('formModalBody');
            if (modalBody) modalBody.innerHTML = '';
        };
        
        // Adicionar event listeners
        modalElement.addEventListener('shown.bs.modal', this.modalShownHandler);
        modalElement.addEventListener('hidden.bs.modal', this.modalHiddenHandler);
        
        // Criar instância do modal com configurações seguras
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: true,
            focus: true
        });
        
        modal.show();
        return modal;
    }

    // Limpar dados de autenticação inválidos
    clearInvalidAuthData() {
        const token = localStorage.getItem('barbeiros-token');
        const user = localStorage.getItem('barbeiros-user');
        
        // Se não há token ou usuário, ou se são strings "null", limpar tudo
        if (!token || !user || token === 'null' || user === 'null' || token === 'undefined' || user === 'undefined') {
            this.clearAuthData();
            return;
        }
        
        // Atualizar this.token antes de verificar
        this.token = token;
        this.user = JSON.parse(user);
        
        // Verificar se o token é válido
        if (!this.isValidToken()) {
            this.clearAuthData();
        }
    }

    // Verificar autenticação
    checkAuth() {
        this.token = localStorage.getItem('barbeiros-token');
        this.user = JSON.parse(localStorage.getItem('barbeiros-user') || 'null');

        // Verificar se o token é válido (não null, undefined ou string "null")
        if (!this.token || this.token === 'null' || this.token === 'undefined' || !this.user || !this.isValidToken()) {
            // Limpar dados de autenticação inválidos
            this.clearAuthData();
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'pages/login.html';
            return;
        }

        // Atualizar nome do usuário na interface
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.user.nome) {
            userNameElement.textContent = this.user.nome;
        }

        // Reinicializar sistema de notificações se estiver autenticado
        if (window.notificationSystem) {
            window.notificationSystem.reinitialize();
        }
    }

    // Verificar se o token é válido
    isValidToken() {
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            return false;
        }
        
        try {
            // Verificar se o token tem a estrutura básica de JWT
            const parts = this.token.split('.');
            if (parts.length !== 3) {
                return false;
            }
            
            // Decodificar o payload (sem verificar assinatura)
            const payload = JSON.parse(atob(parts[1]));
            
            // Verificar se não expirou
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                return false;
            }
            
            // Verificar se tem os campos necessários (userId e tenantId)
            if (!payload.userId || !payload.tenantId) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Limpar dados de autenticação
    clearAuthData() {
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        this.token = null;
        this.user = null;
    }

    // Configurar event listeners
    setupEventListeners() {
        // Logout
        document.addEventListener('click', (e) => {
            if (e.target.closest('[onclick="logout()"]')) {
                this.logout();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K para buscar
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }

            // Escape para fechar modais
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Navegação entre páginas
    showPage(pageName) {
        this.currentPage = pageName;
        
        if (!window.router) {
            console.error('❌ Router não encontrado!');
            return;
        }
        
        const targetPage = document.getElementById(`${pageName}-page`);
        if (!targetPage) {
            console.error('❌ Página não encontrada:', `${pageName}-page`);
            return;
        }
        
        if (window.router) {
            window.router.navigate(pageName);
        }
    }

    // Método para mostrar modal
    showModal(title, content) {
        const modalBody = document.getElementById('formModalBody');
        const modalTitle = document.getElementById('formModalTitle');
        
        if (modalBody && modalTitle) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            
            const modal = new bootstrap.Modal(document.getElementById('formModal'));
            modal.show();
        }
    }

    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            const response = await this.apiRequest('/api/dashboard');

            if (response.success) {
                this.updateDashboardMetrics(response.data);
            } else {
                this.showError('Erro ao carregar dados do dashboard');
            }
        } catch (error) {
            console.error('Erro no dashboard:', error);
            this.showError('Erro de conexão com o servidor');
        }

        // Carregar nome do estabelecimento
        await this.loadEstablishmentName();
    }

    // Atualizar métricas do dashboard
    updateDashboardMetrics(data) {
        // Métricas principais (usando dados simulados se API não retornar)
        const metrics = data || {
            agendamentosHoje: 5,
            receitaHoje: 250.00,
            clientesAtivos: 45,
            agendamentosConcluidos: 3
        };

        document.getElementById('agendamentos-hoje').textContent = metrics.agendamentosHoje || 0;
        document.getElementById('receita-hoje').textContent = `R$ ${(metrics.receitaHoje || 0).toFixed(2)}`;
        document.getElementById('clientes-ativos').textContent = metrics.clientesAtivos || 0;
        document.getElementById('agendamentos-concluidos').textContent = metrics.agendamentosConcluidos || 0;
    }

    // Carregar nome do estabelecimento
    async loadEstablishmentName() {
        try {
            const response = await this.apiRequest('/api/configuracoes');
            
            if (response.success && response.data) {
                const establishmentName = response.data.nome_estabelecimento || 'SmartSalao';
                this.updateEstablishmentName(establishmentName);
            } else {
                // Usar nome padrão se não conseguir carregar
                this.updateEstablishmentName('SmartSalao');
            }
        } catch (error) {
            console.error('Erro ao carregar nome do estabelecimento:', error);
            // Usar nome padrão em caso de erro
            this.updateEstablishmentName('SmartSalao');
        }
    }

    // Atualizar nome do estabelecimento na navbar
    updateEstablishmentName(name) {
        const desktopElement = document.getElementById('establishment-name');
        const mobileElement = document.getElementById('establishment-name-mobile');
        
        if (desktopElement) {
            desktopElement.textContent = name;
        }
        
        if (mobileElement) {
            mobileElement.textContent = name;
        }
    }

    // Carregar dados dos serviços
    async loadServicosData() {
        const content = document.getElementById('servicos-content');
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando serviços...</p></div>';

        try {
            const response = await this.apiRequest('/api/servicos');

            if (response.success) {
                this.renderServicos(response.data);
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar serviços</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    // Renderizar lista de serviços
    renderServicos(servicos) {
        const content = document.getElementById('servicos-content');

        if (!servicos || servicos.length === 0) {
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wrench" style="font-size: 3rem;"></i><p class="mt-2">Nenhum serviço cadastrado</p></div>';
            return;
        }

        const html = `
            <div class="row">
                ${servicos.map(servico => `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${servico.nome_servico}</h5>
                                <p class="card-text text-muted">${servico.descricao || 'Sem descrição'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="h6 text-primary">R$ ${servico.valor.toFixed(2)}</span>
                                    <span class="badge bg-secondary">${servico.duracao_min} min</span>
                                </div>
                            </div>
                            <div class="card-footer bg-transparent">
                                <div class="btn-group w-100">
                                    <button class="btn btn-outline-primary btn-sm" onclick="editarServico(${servico.id_servico})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="excluirServico(${servico.id_servico})">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        content.innerHTML = html;
    }

    // Carregar dados dos clientes
    async loadClientesData() {
        
        try {
            const response = await this.apiRequest('/api/clientes');

            if (response.success) {
                // Armazenar dados em cache global
                window.clientesData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                
                // Renderizar apenas se estiver na página de clientes
                const content = document.getElementById('clientes-content');
                if (content) {
                    this.renderClientes(response.data);
                }
            } else {
                console.error('❌ Erro na resposta da API de clientes:', response);
                const content = document.getElementById('clientes-content');
                if (content) {
                    content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar clientes</p></div>';
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            const content = document.getElementById('clientes-content');
            if (content) {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
            }
        }
    }

    // Renderizar lista de clientes
    renderClientes(clientes) {
        const content = document.getElementById('clientes-content');
        if (!content) return;

        if (!clientes || clientes.length === 0) {
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-people" style="font-size: 3rem;"></i><p class="mt-2">Nenhum cliente cadastrado</p></div>';
            return;
        }

        const html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>WhatsApp</th>
                            <th>Último Agendamento</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientes.map(cliente => `
                            <tr>
                                <td>${cliente.nome}</td>
                                <td>${cliente.whatsapp || 'Não informado'}</td>
                                <td>${cliente.ultimo_agendamento || 'Nunca'}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="editarCliente(${cliente.id_cliente})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="verHistorico(${cliente.id_cliente})">
                                            <i class="bi bi-clock-history"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    }

    // Carregar dados da agenda
    async loadAgendaData() {
        console.log('🔄 loadAgendaData chamada');
        
        try {
            const response = await this.apiRequest('/api/agendamentos');

            if (response.success) {
                console.log('📊 Dados da agenda recebidos:', response.data);
                // Armazenar dados em cache global
                window.agendaData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                console.log('💾 Cache atualizado:', window.agendaData);
                
                // NÃO renderizar aqui - deixar para o router/AgendaPage
                console.log('⏭️ loadAgendaData: dados carregados, delegando renderização para router/AgendaPage');
            } else {
                console.error('❌ Erro na resposta da API de agenda:', response);
                const content = document.getElementById('agenda-content');
                if (content) {
                    content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-calendar-x" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar agenda</p></div>';
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar agenda:', error);
            const content = document.getElementById('agenda-content');
            if (content) {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
            }
        }
    }

    // Renderizar agenda
    renderAgenda(agendamentos) {
        console.log('🎨 main.js renderAgenda chamada com:', agendamentos?.length || 0, 'agendamentos');
        const content = document.getElementById('agenda-content');
        if (!content) {
            console.error('❌ Elemento agenda-content não encontrado em renderAgenda');
            return;
        }

        if (!agendamentos || agendamentos.length === 0) {
            console.log('📭 Nenhum agendamento para renderizar');
            content.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-calendar-week" style="font-size: 3rem;"></i>
                    <p class="mt-2">Nenhum agendamento encontrado</p>
                    <button class="btn btn-primary" onclick="novoAgendamento()">
                        <i class="bi bi-plus-circle me-1"></i>Criar Primeiro Agendamento
                    </button>
                </div>
            `;
            return;
        }

        console.log(`📊 Renderizando ${agendamentos.length} agendamentos`);
        
        // Ordenar por start_at ASC e organizar por data
        const sorted = [...agendamentos].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        const agendamentosPorData = {};
        sorted.forEach(agendamento => {
            // Ajustar timezone para exibição correta da data
            const dataObj = new Date(agendamento.start_at);
            const data = dataObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            if (!agendamentosPorData[data]) {
                agendamentosPorData[data] = [];
            }
            agendamentosPorData[data].push(agendamento);
        });
        
        console.log('📅 Agendamentos por data:', agendamentosPorData);

        const html = Object.entries(agendamentosPorData).map(([data, agendamentosDoDia]) => `
            <div class="agenda-day mb-4">
                <h5 class="mb-3">
                    <i class="bi bi-calendar-day me-2"></i>${data}
                </h5>
                <div class="agenda-items">
                    ${agendamentosDoDia.map(agendamento => `
                        <div class="agenda-item p-3 mb-2 border rounded">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex align-items-center">
                                    <div class="me-3">
                                        <div class="badge bg-${agendamento.status === 'confirmed' ? 'success' : agendamento.status === 'pending' ? 'warning' : 'secondary'}">
                                            ${agendamento.status === 'confirmed' ? 'Confirmado' : agendamento.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                        </div>
                                    </div>
                                    <div>
                                        <h6 class="mb-1">${agendamento.cliente_nome || 'Cliente'}</h6>
                                        <p class="mb-1 text-muted small">${agendamento.nome_servico || 'Serviço'}</p>
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-clock me-1 text-muted"></i>
                                            <small class="text-muted">${new Date(agendamento.start_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'})}</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="editarAgendamento(${agendamento.id_agendamento})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-success" onclick="confirmarAgendamento(${agendamento.id_agendamento})">
                                            <i class="bi bi-check-circle"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="cancelarAgendamento(${agendamento.id_agendamento})">
                                            <i class="bi bi-x-circle"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        content.innerHTML = html;
    }

    // Carregar dados dos usuários
    async loadUsuariosData() {
        
        try {
            const response = await this.apiRequest('/api/usuarios');

            if (response.success) {
                // Armazenar dados em cache global
                window.usuariosData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                
                // Renderizar apenas se estiver na página de usuários
                const content = document.getElementById('usuarios-content');
                if (content) {
                    this.renderUsuarios(response.data);
                }
            } else {
                console.error('❌ Erro na resposta da API de usuários:', response);
                const content = document.getElementById('usuarios-content');
                if (content) {
                    content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar usuários</p></div>';
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            const content = document.getElementById('usuarios-content');
            if (content) {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
            }
        }
    }

    // Renderizar lista de usuários
    renderUsuarios(usuarios) {
        const content = document.getElementById('usuarios-content');
        if (!content) return;

        if (!usuarios || usuarios.length === 0) {
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-people" style="font-size: 3rem;"></i><p class="mt-2">Nenhum usuário cadastrado</p></div>';
            return;
        }

        const html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Tipo</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(usuario => `
                            <tr>
                                <td>${usuario.nome}</td>
                                <td>${usuario.email}</td>
                                <td>
                                    <span class="badge bg-${usuario.tipo === 'admin' ? 'danger' : usuario.tipo === 'barbeiro' ? 'primary' : 'secondary'}">
                                        ${usuario.tipo === 'admin' ? 'Admin' : usuario.tipo === 'barbeiro' ? 'Barbeiro' : 'Outro'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-${usuario.ativo ? 'success' : 'danger'}">
                                        ${usuario.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="editarUsuario(${usuario.id_usuario})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="excluirUsuario(${usuario.id_usuario})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    }

    // API Request helper
    async apiRequest(endpoint, options = {}) {
        // Verificar se o token é válido antes de enviar
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            this.clearAuthData();
            window.location.href = 'pages/login.html';
            return { success: false, message: 'Token inválido' };
        }

        // Se o segundo parâmetro for uma string, tratar como método HTTP
        if (typeof options === 'string') {
            options = { method: options };
        }

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        const response = await fetch(`${this.apiUrl}${endpoint}`, mergedOptions);
        return await response.json();
    }

    // Logout
    logout() {
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        window.location.href = 'login.html';
    }

    // Mostrar erro
    showError(message) {
        // Implementar toast ou modal de erro
        console.error(message);
        alert(message); // Temporário
    }

    // Mostrar sucesso
    showSuccess(message) {
        // Implementar toast ou modal de sucesso
        console.log(message);
        alert(message); // Temporário
    }

    // Fechar modal
    closeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('formModal'));
        if (modal) {
            modal.hide();
        }
    }

    // Mostrar busca
    showSearch() {
        // Implementar busca global
        console.log('Busca global - TODO');
    }
}

// Funções globais para os onclicks
function showPage(pageName) {
    if (window.barbeirosApp) {
        window.barbeirosApp.showPage(pageName);
    }
}

function logout() {
    if (window.barbeirosApp) {
        window.barbeirosApp.logout();
    }
}

// Função para fechar sidebar mobile
function closeMobileSidebar() {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarCollapse && sidebarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(sidebarCollapse, {
            toggle: false
        });
        bsCollapse.hide();
    }
    
    if (overlay) {
        overlay.classList.remove('show');
    }
    
    if (sidebar) {
        sidebar.classList.remove('show');
    }
}

// Função para abrir sidebar mobile
function openMobileSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

// Gerenciar eventos da sidebar mobile
document.addEventListener('DOMContentLoaded', function() {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('show.bs.collapse', function() {
            if (overlay) {
                overlay.classList.add('show');
            }
            if (sidebar) {
                sidebar.classList.add('show');
            }
        });
        
        sidebarCollapse.addEventListener('hide.bs.collapse', function() {
            if (overlay) {
                overlay.classList.remove('show');
            }
            if (sidebar) {
                sidebar.classList.remove('show');
            }
        });
    }
    
    // Fechar sidebar ao clicar no overlay
    if (overlay) {
        overlay.addEventListener('click', function() {
            closeMobileSidebar();
        });
    }
});

function novoAgendamento() {
    // Modal de novo agendamento
    const modalHtml = `
        <div class="modal-header">
            <h5 class="modal-title">
                <i class="bi bi-calendar-plus me-2"></i>Novo Agendamento
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="agendamentoForm">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="cliente_id" class="form-label">Cliente Cadastrado</label>
                        <select class="form-control" id="cliente_id" name="cliente_id">
                            <option value="">Selecione um cliente...</option>
                        </select>
                        <small class="form-text text-muted">Ou preencha o nome manualmente abaixo</small>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="servico_id" class="form-label">Serviço</label>
                        <select class="form-control" id="servico_id" name="servico_id" required>
                            <option value="">Selecione um serviço...</option>
                        </select>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="nome_cliente_manual" class="form-label">Nome do Cliente (Manual)</label>
                        <input type="text" class="form-control" id="nome_cliente_manual" name="nome_cliente_manual" placeholder="Digite o nome do cliente...">
                        <small class="form-text text-muted">Use apenas se não selecionou um cliente cadastrado</small>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="telefone_cliente_manual" class="form-label">Telefone (Opcional)</label>
                        <input type="tel" class="form-control" id="telefone_cliente_manual" name="telefone_cliente_manual" placeholder="(11) 99999-9999">
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="data_agendamento" class="form-label">Data</label>
                        <input type="date" class="form-control" id="data_agendamento" name="data_agendamento" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="hora_agendamento" class="form-label">Horário</label>
                        <select class="form-control" id="hora_agendamento" name="hora_agendamento" required>
                            <option value="">Selecione um horário...</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="observacoes" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes" name="observacoes" rows="3" placeholder="Observações opcionais..."></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="salvarAgendamento()">
                <i class="bi bi-check-circle me-1"></i>Agendar
            </button>
        </div>
    `;

    // Usar a função auxiliar para mostrar o modal
    if (window.barbeirosApp && window.barbeirosApp.showModal) {
        window.barbeirosApp.showModal('<i class="bi bi-calendar-plus me-2"></i>Novo Agendamento', modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="bi bi-calendar-plus me-2"></i>Novo Agendamento';
        }
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    }

    // Carregar clientes e serviços
    carregarClientesSelect();
    carregarServicosSelect();
    carregarHorariosSelect();
    configurarCamposCliente();

    // Definir data mínima como hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data_agendamento').min = hoje;
}

function novoCliente() {
    // Modal de novo cliente
    const modalHtml = `
        <div class="modal-header">
            <h5 class="modal-title">
                <i class="bi bi-person-plus me-2"></i>Novo Cliente
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="clienteForm">
                <div class="mb-3">
                    <label for="nome_cliente" class="form-label">Nome Completo *</label>
                    <input type="text" class="form-control" id="nome_cliente" name="nome_cliente" required placeholder="Digite o nome completo">
                </div>
                <div class="mb-3">
                    <label for="email_cliente" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email_cliente" name="email_cliente" placeholder="email@exemplo.com">
                </div>
                <div class="mb-3">
                    <label for="whatsapp_cliente" class="form-label">WhatsApp *</label>
                    <input type="tel" class="form-control" id="whatsapp_cliente" name="whatsapp_cliente" required placeholder="+5511999999999">
                </div>
                <div class="mb-3">
                    <label for="observacoes_cliente" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes_cliente" name="observacoes_cliente" rows="3" placeholder="Informações adicionais..."></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" onclick="salvarCliente()">
                <i class="bi bi-person-check me-1"></i>Salvar Cliente
            </button>
        </div>
    `;

    // Usar a função auxiliar para mostrar o modal
    if (window.barbeirosApp && window.barbeirosApp.showModal) {
        window.barbeirosApp.showModal('<i class="bi bi-person-plus me-2"></i>Novo Cliente', modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="bi bi-person-plus me-2"></i>Novo Cliente';
        }
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    }
}

// Exportar clientes
async function exportarClientes() {
    try {
        const resp = await window.barbeirosApp.apiRequest('/api/clientes/export');
        if (resp && resp.data) {
            const blob = new Blob([JSON.stringify(resp.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clientes-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.barbeirosApp.showSuccess('Clientes exportados com sucesso!');
        } else {
            window.barbeirosApp.showError('Falha ao exportar clientes');
        }
    } catch (e) {
        console.error('Erro ao exportar clientes:', e);
        window.barbeirosApp.showError('Erro ao exportar clientes');
    }
}

// Importar clientes em massa via JSON
function importarClientes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                const parsed = JSON.parse(ev.target.result);
                const payload = Array.isArray(parsed) ? parsed : (parsed.data || []);
                if (!Array.isArray(payload) || payload.length === 0) {
                    window.barbeirosApp.showError('Arquivo não contém clientes válidos');
                    return;
                }
                const resp = await window.barbeirosApp.apiRequest('/api/clientes/import', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (resp && resp.success) {
                    window.barbeirosApp.showSuccess(`Importação concluída: ${resp.data?.inseridos || 0} inseridos, ${resp.data?.atualizados || 0} atualizados, ${resp.data?.ignorados || 0} ignorados`);
                    // Recarregar lista de clientes
                    if (window.barbeirosApp && typeof window.barbeirosApp.loadClientesData === 'function') {
                        window.barbeirosApp.loadClientesData();
                    }
                } else {
                    window.barbeirosApp.showError(resp?.message || 'Falha ao importar clientes');
                }
            } catch (err) {
                console.error('Erro ao processar arquivo de clientes:', err);
                window.barbeirosApp.showError('Arquivo JSON inválido');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function novoServico() {
    // Modal de novo serviço
    const modalHtml = `
        <div class="modal-header">
            <h5 class="modal-title">
                <i class="bi bi-wrench-adjustable me-2"></i>Novo Serviço
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="servicoForm">
                <div class="mb-3">
                    <label for="nome_servico" class="form-label">Nome do Serviço *</label>
                    <input type="text" class="form-control" id="nome_servico" name="nome_servico" required placeholder="Ex: Corte Masculino, Barba, etc.">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="duracao_servico" class="form-label">Duração (minutos) *</label>
                        <input type="number" class="form-control" id="duracao_servico" name="duracao_servico" required placeholder="30" min="5" max="480">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="valor_servico" class="form-label">Valor (R$) *</label>
                        <input type="number" class="form-control" id="valor_servico" name="valor_servico" required placeholder="35.00" min="0" step="0.01">
                    </div>
                </div>
                <div class="mb-3">
                    <label for="descricao_servico" class="form-label">Descrição</label>
                    <textarea class="form-control" id="descricao_servico" name="descricao_servico" rows="3" placeholder="Descreva o serviço..."></textarea>
                </div>
                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="ativo_servico" name="ativo_servico" checked>
                        <label class="form-check-label" for="ativo_servico">
                            Serviço ativo
                        </label>
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-info" onclick="salvarServico()">
                <i class="bi bi-wrench me-1"></i>Salvar Serviço
            </button>
        </div>
    `;

    // Usar a função auxiliar para mostrar o modal
    if (window.barbeirosApp && window.barbeirosApp.showModal) {
        window.barbeirosApp.showModal('<i class="bi bi-wrench-adjustable me-2"></i>Novo Serviço', modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="bi bi-wrench-adjustable me-2"></i>Novo Serviço';
        }
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    }
}

// Funções auxiliares para os modais
function configurarCamposCliente() {
    const clienteSelect = document.getElementById('cliente_id');
    const nomeManualInput = document.getElementById('nome_cliente_manual');
    const telefoneManualInput = document.getElementById('telefone_cliente_manual');

    if (!clienteSelect || !nomeManualInput) return;

    // Função para atualizar estado dos campos
    function atualizarCampos() {
        const clienteSelecionado = clienteSelect.value !== '';
        const nomePreenchido = nomeManualInput.value.trim() !== '';

        if (clienteSelecionado) {
            // Se cliente foi selecionado, desabilitar campos manuais
            nomeManualInput.disabled = true;
            telefoneManualInput.disabled = true;
            nomeManualInput.value = '';
            telefoneManualInput.value = '';
        } else {
            // Se não há cliente selecionado, habilitar campos manuais
            nomeManualInput.disabled = false;
            telefoneManualInput.disabled = false;
        }

        if (nomePreenchido) {
            // Se nome foi preenchido manualmente, desabilitar select
            clienteSelect.disabled = true;
        } else {
            // Se nome não foi preenchido, habilitar select
            clienteSelect.disabled = false;
        }
    }

    // Adicionar event listeners
    clienteSelect.addEventListener('change', atualizarCampos);
    nomeManualInput.addEventListener('input', atualizarCampos);

    // Configurar estado inicial
    atualizarCampos();
}

function carregarHorariosSelect() {
    const select = document.getElementById('hora_agendamento');
    if (!select) return;

    // Limpar opções existentes (exceto a primeira)
    select.innerHTML = '<option value="">Selecione um horário...</option>';

    // Gerar horários de 15 em 15 minutos das 06:00 às 22:00
    for (let hora = 6; hora <= 22; hora++) {
        for (let minuto = 0; minuto < 60; minuto += 15) {
            const horaStr = hora.toString().padStart(2, '0');
            const minutoStr = minuto.toString().padStart(2, '0');
            const valor = `${horaStr}:${minutoStr}`;
            const texto = `${horaStr}:${minutoStr}`;
            
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = texto;
            select.appendChild(option);
        }
    }
}

async function carregarClientesSelect() {
    try {
        const response = await window.barbeirosApp.apiRequest('/api/clientes');
        if (response.success && response.data) {
            const select = document.getElementById('cliente_id');
            select.innerHTML = '<option value="">Selecione um cliente...</option>';
            response.data.forEach(cliente => {
                select.innerHTML += `<option value="${cliente.id_cliente}">${cliente.nome}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function carregarServicosSelect() {
    try {
        const response = await window.barbeirosApp.apiRequest('/api/servicos');
        if (response.success && response.data) {
            const select = document.getElementById('servico_id');
            select.innerHTML = '<option value="">Selecione um serviço...</option>';
            response.data.forEach(servico => {
                select.innerHTML += `<option value="${servico.id_servico}">${servico.nome_servico} - R$ ${servico.valor}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// Variável para controlar se já está salvando
let salvandoAgendamento = false;

async function salvarAgendamento() {
    console.log('💾 salvarAgendamento chamada - salvandoAgendamento:', salvandoAgendamento);
    console.log('💾 Stack trace:', new Error().stack);
    
    // Prevenir múltiplos cliques
    if (salvandoAgendamento) {
        console.log('⚠️ Salvamento já em andamento, ignorando clique duplo');
        return;
    }

    // Verificar se os elementos existem antes de acessá-los
    const clienteElement = document.getElementById('cliente_id');
    const servicoElement = document.getElementById('servico_id');
    const dataElement = document.getElementById('data_agendamento');
    const horaElement = document.getElementById('hora_agendamento');
    const observacoesElement = document.getElementById('observacoes');
    const nomeManualElement = document.getElementById('nome_cliente_manual');
    const telefoneManualElement = document.getElementById('telefone_cliente_manual');
    const modal = document.getElementById('formModal');

    if (!clienteElement || !servicoElement || !dataElement || !horaElement || !modal) {
        console.error('Elementos do formulário de agendamento não encontrados');
        alert('Erro: Formulário não está carregado corretamente. Tente novamente.');
        return;
    }

    // Marcar como salvando
    salvandoAgendamento = true;

    // Desabilitar botão e mostrar loading
    const salvarBtn = document.querySelector('button[onclick="salvarAgendamento()"]');
    if (salvarBtn) {
        salvarBtn.disabled = true;
        salvarBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-1"></i>Salvando...';
    }

    const cliente_id = clienteElement.value;
    const servico_id = servicoElement.value;
    const data = dataElement.value;
    const hora = horaElement.value;
    const observacoes = observacoesElement ? observacoesElement.value.trim() : '';
    const nome_manual = nomeManualElement ? nomeManualElement.value.trim() : '';
    const telefone_manual = telefoneManualElement ? telefoneManualElement.value.trim() : '';

    // Validar se pelo menos um tipo de cliente foi preenchido
    if (!cliente_id && !nome_manual) {
        alert('Selecione um cliente cadastrado ou digite o nome do cliente!');
        salvandoAgendamento = false;
        // Restaurar botão
        const salvarBtn = document.querySelector('button[onclick="salvarAgendamento()"]');
        if (salvarBtn) {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Agendar';
        }
        return;
    }

    if (!servico_id || !data || !hora) {
        alert('Preencha todos os campos obrigatórios!');
        salvandoAgendamento = false;
        // Restaurar botão
        const salvarBtn = document.querySelector('button[onclick="salvarAgendamento()"]');
        if (salvarBtn) {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Agendar';
        }
        return;
    }

    // Validação de horário não é mais necessária pois o select só tem opções válidas

    // Criar data considerando o timezone local (America/Sao_Paulo)
    // Isso garante que 17:30 local seja enviado como 17:30
    const [ano, mes, dia] = data.split('-');
    const [horaNum, minutoNum] = hora.split(':');
    const dataObj = new Date(ano, mes - 1, dia, parseInt(horaNum), parseInt(minutoNum), 0);
    const start_at = dataObj.toISOString();
    
    console.log('🕐 Conversão de horário:', {
        data: data,
        hora: hora,
        dataObj: dataObj,
        start_at: start_at,
        horaLocal: dataObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });

    const editingId = modal.dataset.editingId;
    const isEditing = !!editingId;

    try {
        console.log('📤 Enviando requisição para API:', {
            url: `/api/agendamentos${isEditing ? '/' + editingId : ''}`,
            method: isEditing ? 'PUT' : 'POST',
            data: {
                id_cliente: parseInt(cliente_id),
                id_servico: parseInt(servico_id),
                start_at: start_at,
                observacoes: observacoes
            }
        });
        
        // Preparar dados do agendamento
        const agendamentoData = {
            id_servico: parseInt(servico_id),
            start_at: start_at,
            observacoes: observacoes
        };

        // Adicionar dados do cliente (cadastrado ou manual)
        if (cliente_id) {
            agendamentoData.id_cliente = parseInt(cliente_id);
        } else {
            agendamentoData.nome_cliente_manual = nome_manual;
            if (telefone_manual) {
                agendamentoData.telefone_cliente_manual = telefone_manual;
            }
        }

        const response = await window.barbeirosApp.apiRequest(`/api/agendamentos${isEditing ? '/' + editingId : ''}`, {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify(agendamentoData)
        });
        
        console.log('📥 Resposta da API:', response);

        if (response.success) {
            window.barbeirosApp.showSuccess(`Agendamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);

            // Fechar modal de forma segura
            try {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            } catch (modalError) {
                console.warn('Erro ao fechar modal:', modalError);
            }

            // Limpar dados do modal de forma segura
            try {
                delete modal.dataset.editingId;
                const modalTitle = document.getElementById('formModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = 'Novo Agendamento';
                }
            } catch (cleanupError) {
                console.warn('Erro ao limpar dados do modal:', cleanupError);
            }

            // Recarregar agenda se estiver na página
            if (window.barbeirosApp.currentPage === 'agenda') {
                console.log('🔄 Recarregando agenda após criação/edição');
                // Limpar cache e forçar recarregamento
                window.agendaData = null;
                // Aguardar um pouco para garantir que o backend processou
                setTimeout(() => {
                    console.log('🔄 Verificando método de recarregamento...');
                    console.log('🔄 window.agendaPage existe?', !!window.agendaPage);
                    console.log('🔄 window.barbeirosApp.currentPage:', window.barbeirosApp.currentPage);
                    
                    if (window.agendaPage && typeof window.agendaPage.load === 'function') {
                        // Se AgendaPage está ativa, usar ela para recarregar com força
                        console.log('🔄 Usando agendaPage.load(true)');
                        window.agendaPage.load(true);
                    } else {
                        // Senão, usar o método padrão
                        console.log('🔄 Usando loadAgendaData()');
                        window.barbeirosApp.loadAgendaData();
                    }
                }, 100);
            }
        } else {
            console.log('❌ Erro na resposta da API:', response);
            window.barbeirosApp.showError(response.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} agendamento`);
        }
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        window.barbeirosApp.showError('Erro de conexão');
    } finally {
        // Resetar flag de salvamento e restaurar botão
        console.log('🔄 Finally executado - resetando salvandoAgendamento de', salvandoAgendamento, 'para false');
        salvandoAgendamento = false;
        
        // Restaurar botão
        const salvarBtn = document.querySelector('button[onclick="salvarAgendamento()"]');
        if (salvarBtn) {
            salvarBtn.disabled = false;
            salvarBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Agendar';
            console.log('🔄 Botão restaurado');
        }
    }
}

async function salvarCliente() {
    // Verificar se os elementos existem antes de acessá-los
    const nomeElement = document.getElementById('nome_cliente');
    const emailElement = document.getElementById('email_cliente');
    const whatsappElement = document.getElementById('whatsapp_cliente');
    const observacoesElement = document.getElementById('observacoes_cliente');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !whatsappElement || !modal) {
        console.error('Elementos do formulário de cliente não encontrados');
        alert('Erro: Formulário não está carregado corretamente. Tente novamente.');
        return;
    }

    const nome = nomeElement.value.trim();
    const email = emailElement ? emailElement.value.trim() : '';
    const whatsapp = whatsappElement.value.trim();
    const observacoes = observacoesElement ? observacoesElement.value.trim() : '';

    // Debug: mostrar dados coletados
    console.log('Dados do formulário de cliente:', { nome, email, whatsapp, observacoes });

    // Validar campos obrigatórios com mais detalhes
    const camposObrigatorios = [
        { campo: 'nome', valor: nome, nome: 'Nome Completo' },
        { campo: 'whatsapp', valor: whatsapp, nome: 'WhatsApp' }
    ];

    const camposVazios = camposObrigatorios.filter(campo => !campo.valor || campo.valor.trim() === '');
    
    if (camposVazios.length > 0) {
        const camposFaltando = camposVazios.map(campo => campo.nome).join(', ');
        alert(`Preencha os seguintes campos obrigatórios: ${camposFaltando}`);
        return;
    }

    // Validar WhatsApp
    if (whatsapp && !validarTelefone(whatsapp)) {
        alert('WhatsApp inválido! Use apenas números.');
        return;
    }

    // Validar email se fornecido
    if (email && !validarEmail(email)) {
        alert('Email inválido!');
        return;
    }

    try {
        const response = await window.barbeirosApp.apiRequest('/api/clientes', {
            method: 'POST',
            body: JSON.stringify({
                nome: nome,
                email: email,
                whatsapp: whatsapp,
                observacoes: observacoes
            })
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Cliente criado com sucesso!');

            // Fechar modal de forma segura
            try {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            } catch (modalError) {
                console.warn('Erro ao fechar modal:', modalError);
            }

            // Limpar dados do modal de forma segura
            try {
                delete modal.dataset.editingId;
                const modalTitle = document.getElementById('formModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = 'Novo Cliente';
                }
            } catch (cleanupError) {
                console.warn('Erro ao limpar dados do modal:', cleanupError);
            }

            // Recarregar clientes se estiver na página
            if (window.barbeirosApp.currentPage === 'clientes') {
                window.barbeirosApp.loadClientesData();
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao criar cliente');
        }
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

async function salvarServico() {
    // Verificar se os elementos existem antes de acessá-los
    const nomeElement = document.getElementById('nome_servico');
    const duracaoElement = document.getElementById('duracao_servico');
    const valorElement = document.getElementById('valor_servico');
    const descricaoElement = document.getElementById('descricao_servico');
    const ativoElement = document.getElementById('ativo_servico');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !duracaoElement || !valorElement || !ativoElement || !modal) {
        console.error('Elementos do formulário não encontrados');
        alert('Erro: Formulário não está carregado corretamente. Tente novamente.');
        return;
    }

    const nome = nomeElement.value.trim();
    const duracao = parseInt(duracaoElement.value);
    const valor = parseFloat(valorElement.value);
    const descricao = descricaoElement ? descricaoElement.value.trim() : '';
    const ativo = ativoElement.checked;

    if (!nome || !duracao || !valor) {
        alert('Nome, duração e valor são obrigatórios!');
        return;
    }

    const editingId = modal.dataset.editingId;
    const isEditing = !!editingId;

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/servicos${isEditing ? '/' + editingId : ''}`, {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify({
                nome_servico: nome,
                duracao_min: duracao,
                valor: valor,
                descricao: descricao,
                ativo: ativo
            })
        });

        if (response.success) {
            window.barbeirosApp.showSuccess(`Serviço ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);

            // Fechar modal de forma segura
            try {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    // Remover foco do botão antes de fechar
                    if (document.activeElement) {
                        document.activeElement.blur();
                    }
                    bsModal.hide();
                }
            } catch (modalError) {
                console.warn('Erro ao fechar modal:', modalError);
            }

            // Limpar dados do modal de forma segura
            try {
                delete modal.dataset.editingId;
                const modalTitle = document.getElementById('formModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = 'Novo Serviço';
                }
            } catch (cleanupError) {
                console.warn('Erro ao limpar dados do modal:', cleanupError);
            }

            // Recarregar serviços se estiver na página
            console.log('Página atual:', window.barbeirosApp.currentPage);
            
            // Sempre recarregar dados de serviços após criar um serviço
            console.log('Recarregando dados de serviços...');
            await window.barbeirosApp.loadServicosData();
            
            // Forçar atualização da interface se estiver na página de serviços
            if (window.barbeirosApp.currentPage === 'servicos') {
                // Simular navegação para a página de serviços para atualizar a interface
                window.barbeirosApp.showPage('servicos');
            }
            
            // Atualizar métricas do dashboard sem recarregar a página
            console.log('Atualizando métricas do dashboard...');
            // As métricas já foram atualizadas na função loadServicosData
        } else {
            window.barbeirosApp.showError(response.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} serviço`);
        }
    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

function editarServico(id) {
    console.log('Editar serviço:', id);

    // Buscar dados do serviço para editar
    const servico = servicosData.find(s => s.id_servico === id);
    if (!servico) {
        alert('Serviço não encontrado!');
        return;
    }

    // Verificar se os elementos existem antes de preenchê-los
    const nomeElement = document.getElementById('nome_servico');
    const duracaoElement = document.getElementById('duracao_servico');
    const valorElement = document.getElementById('valor_servico');
    const descricaoElement = document.getElementById('descricao_servico');
    const ativoElement = document.getElementById('ativo_servico');
    const modalTitle = document.getElementById('formModalTitle');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !duracaoElement || !valorElement || !ativoElement || !modalTitle || !modal) {
        console.error('Elementos do modal não encontrados para edição');
        alert('Erro: Modal não está carregado corretamente. Tente novamente.');
        return;
    }

    // Preencher o modal com os dados do serviço
    nomeElement.value = servico.nome_servico;
    duracaoElement.value = servico.duracao_min;
    valorElement.value = servico.valor;
    if (descricaoElement) {
        descricaoElement.value = servico.descricao || '';
    }
    ativoElement.checked = servico.ativo === 1;

    // Atualizar título do modal
    modalTitle.textContent = 'Editar Serviço';

    // Armazenar ID do serviço sendo editado
    modal.dataset.editingId = id;

    // Mostrar modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

async function excluirServico(id) {
    if (confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
        console.log('Excluir serviço:', id);

        try {
            const response = await window.barbeirosApp.apiRequest(`/api/servicos/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                window.barbeirosApp.showSuccess('Serviço excluído com sucesso!');
                // Recarregar serviços se estiver na página
                if (window.barbeirosApp.currentPage === 'servicos') {
                    window.barbeirosApp.loadServicosData();
                }
            } else {
                window.barbeirosApp.showError(response.message || 'Erro ao excluir serviço');
            }
        } catch (error) {
            console.error('Erro ao excluir serviço:', error);
            window.barbeirosApp.showError('Erro de conexão');
        }
    }
}

async function toggleServicoStatus(id) {
    console.log('Toggle status do serviço:', id);

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/servicos/${id}/status`, {
            method: 'PATCH'
        });

        if (response.success) {
            window.barbeirosApp.showSuccess(response.message);
            // Recarregar serviços se estiver na página
            if (window.barbeirosApp.currentPage === 'servicos') {
                window.barbeirosApp.loadServicosData();
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao alterar status do serviço');
        }
    } catch (error) {
        console.error('Erro ao alterar status do serviço:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

function editarCliente(id) {
    console.log('Editar cliente:', id);

    // Buscar dados do cliente para editar (usando cache local se disponível)
    let cliente = null;
    if (window.clientesData && window.clientesData.length > 0) {
        cliente = window.clientesData.find(c => c.id_cliente === id);
    }

    if (!cliente) {
        // Se não encontrou no cache, buscar via API
        console.log('Cliente não encontrado no cache, buscando via API...');
        alert('Cliente não encontrado. Tente recarregar a página.');
        return;
    }

    // Verificar se os elementos existem antes de preenchê-los
    const nomeElement = document.getElementById('nome_cliente');
    const emailElement = document.getElementById('email_cliente');
    const whatsappElement = document.getElementById('whatsapp_cliente');
    const observacoesElement = document.getElementById('observacoes_cliente');
    const modalTitle = document.getElementById('formModalTitle');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !whatsappElement || !modalTitle || !modal) {
        console.error('Elementos do modal não encontrados para edição de cliente');
        alert('Erro: Modal não está carregado corretamente. Tente novamente.');
        return;
    }

    // Preencher o modal com os dados do cliente
    nomeElement.value = cliente.nome || '';
    if (emailElement) {
        emailElement.value = cliente.email || '';
    }
    whatsappElement.value = cliente.whatsapp || '';
    if (observacoesElement) {
        observacoesElement.value = cliente.observacoes || '';
    }

    // Atualizar título do modal
    modalTitle.textContent = 'Editar Cliente';

    // Armazenar ID do cliente sendo editado
    modal.dataset.editingId = id;

    // Mostrar modal
    try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (modalError) {
        console.error('Erro ao abrir modal para edição:', modalError);
        alert('Erro ao abrir modal. Tente novamente.');
    }
}

async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        return;
    }

    console.log('Excluir cliente:', id);

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/clientes/${id}`, {
            method: 'DELETE'
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Cliente excluído com sucesso!');

            // Recarregar clientes se estiver na página
            if (window.barbeirosApp.currentPage === 'clientes') {
                window.barbeirosApp.loadClientesData();
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao excluir cliente');
        }
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

function verHistorico(id) {
    console.log('Ver histórico do cliente:', id);
    // TODO: Implementar visualização de histórico
}

function editarUsuario(id) {
    console.log('Editar usuário:', id);

    // Buscar dados do usuário para editar (usando cache local se disponível)
    let usuario = null;
    if (window.usuariosData && window.usuariosData.length > 0) {
        usuario = window.usuariosData.find(u => u.id_usuario === id);
    }

    if (!usuario) {
        // Se não encontrou no cache, buscar via API
        console.log('Usuário não encontrado no cache, buscando via API...');
        alert('Usuário não encontrado. Tente recarregar a página.');
        return;
    }

    // Verificar se os elementos existem antes de preenchê-los
    const nomeElement = document.getElementById('nome_usuario');
    const emailElement = document.getElementById('email_usuario');
    const senhaElement = document.getElementById('senha_usuario');
    const tipoElement = document.getElementById('tipo_usuario');
    const whatsappElement = document.getElementById('whatsapp_usuario');
    const modalTitle = document.getElementById('formModalTitle');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !emailElement || !senhaElement || !tipoElement || !modalTitle || !modal) {
        console.error('Elementos do modal não encontrados para edição de usuário');
        alert('Erro: Modal não está carregado corretamente. Tente novamente.');
        return;
    }

    // Preencher o modal com os dados do usuário
    nomeElement.value = usuario.nome || '';
    emailElement.value = usuario.email || '';
    senhaElement.value = ''; // Não preenchemos senha por segurança
    tipoElement.value = usuario.tipo || 'barbeiro';
    if (whatsappElement) {
        whatsappElement.value = usuario.whatsapp || '';
    }

    // Atualizar título do modal
    modalTitle.textContent = 'Editar Usuário';

    // Armazenar ID do usuário sendo editado
    modal.dataset.editingId = id;

    // Mostrar modal
    try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (modalError) {
        console.error('Erro ao abrir modal para edição:', modalError);
        alert('Erro ao abrir modal. Tente novamente.');
    }
}

async function excluirUsuario(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }

    console.log('Excluir usuário:', id);

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/usuarios/${id}`, {
            method: 'DELETE'
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Usuário excluído com sucesso!');

            // Recarregar usuários se estiver na página
            if (window.barbeirosApp.currentPage === 'usuarios') {
                window.barbeirosApp.loadUsuariosData();
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao excluir usuário');
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

async function salvarUsuario() {
    // Verificar se os elementos existem antes de acessá-los
    const nomeElement = document.getElementById('nome_usuario');
    const emailElement = document.getElementById('email_usuario');
    const senhaElement = document.getElementById('senha_usuario');
    const tipoElement = document.getElementById('tipo_usuario');
    const whatsappElement = document.getElementById('whatsapp_usuario');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !emailElement || !senhaElement || !tipoElement || !modal) {
        console.error('Elementos do formulário de usuário não encontrados');
        alert('Erro: Formulário não está carregado corretamente. Tente novamente.');
        return;
    }

    const nome = nomeElement.value.trim();
    const email = emailElement.value.trim();
    const senha = senhaElement.value.trim();
    const tipo = tipoElement.value;
    const whatsapp = whatsappElement ? whatsappElement.value.trim() : '';

    if (!nome || !email || !senha || !tipo) {
        alert('Nome, email, senha e tipo são obrigatórios!');
        return;
    }

    const modalElement = modal;
    const editingId = modalElement.dataset.editingId;
    const isEditing = !!editingId;

    try {
        const response = await window.barbeirosApp.apiRequest('/api/usuarios', {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify({
                id_usuario: isEditing ? parseInt(editingId) : undefined,
                nome: nome,
                email: email,
                senha: senha,
                tipo: tipo,
                whatsapp: whatsapp
            })
        });

        if (response.success) {
            window.barbeirosApp.showSuccess(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);

            // Fechar modal de forma segura
            try {
                const bsModal = bootstrap.Modal.getInstance(modalElement);
                if (bsModal) {
                    bsModal.hide();
                }
            } catch (modalError) {
                console.warn('Erro ao fechar modal:', modalError);
            }

            // Limpar dados do modal de forma segura
            try {
                delete modalElement.dataset.editingId;
                const modalTitle = document.getElementById('formModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = 'Novo Usuário';
                }
            } catch (cleanupError) {
                console.warn('Erro ao limpar dados do modal:', cleanupError);
            }

            // Recarregar usuários se estiver na página
            if (window.barbeirosApp.currentPage === 'usuarios') {
                window.barbeirosApp.loadUsuariosData();
            }
        } else {
            window.barbeirosApp.showError(response.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} usuário`);
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

function novoUsuario() {
    console.log('Novo usuário');

    // Verificar se os elementos existem antes de preenchê-los
    const nomeElement = document.getElementById('nome_usuario');
    const emailElement = document.getElementById('email_usuario');
    const senhaElement = document.getElementById('senha_usuario');
    const tipoElement = document.getElementById('tipo_usuario');
    const whatsappElement = document.getElementById('whatsapp_usuario');
    const modalTitle = document.getElementById('formModalTitle');
    const modal = document.getElementById('formModal');

    if (!nomeElement || !emailElement || !senhaElement || !tipoElement || !modalTitle || !modal) {
        console.error('Elementos do modal não encontrados para novo usuário');
        alert('Erro: Modal não está carregado corretamente. Tente novamente.');
        return;
    }

    // Limpar formulário
    nomeElement.value = '';
    emailElement.value = '';
    senhaElement.value = '';
    tipoElement.value = 'barbeiro';
    if (whatsappElement) {
        whatsappElement.value = '';
    }

    // Atualizar título do modal
    modalTitle.textContent = 'Novo Usuário';

    // Limpar ID de edição
    delete modal.dataset.editingId;

    // Mostrar modal
    try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch (modalError) {
        console.error('Erro ao abrir modal para novo usuário:', modalError);
        alert('Erro ao abrir modal. Tente novamente.');
    }
}

function editarAgendamento(id) {
    console.log('Editar agendamento:', id);

    // Buscar dados do agendamento para editar (usando cache local se disponível)
    let agendamento = null;
    if (window.agendaData && window.agendaData.length > 0) {
        agendamento = window.agendaData.find(a => a.id_agendamento === id);
    }

    if (!agendamento) {
        console.log('Agendamento não encontrado no cache, buscando via API...');
        alert('Agendamento não encontrado. Tente recarregar a página.');
        return;
    }

    // Inicializar modal e campos
    novoAgendamento();

    // Após montar o modal, garantir que os selects estejam carregados antes de preencher
    Promise.all([carregarClientesSelect(), carregarServicosSelect(), carregarHorariosSelect()]).then(() => {
        // Configurar campos de cliente após carregar
        configurarCamposCliente();
        const clienteElement = document.getElementById('cliente_id');
        const servicoElement = document.getElementById('servico_id');
        const dataElement = document.getElementById('data_agendamento');
        const horaElement = document.getElementById('hora_agendamento');
        const observacoesElement = document.getElementById('observacoes');
        const modalTitle = document.getElementById('formModalTitle');
        const modal = document.getElementById('formModal');

        if (!clienteElement || !servicoElement || !dataElement || !horaElement || !modalTitle || !modal) {
            console.error('Elementos do modal não encontrados para edição de agendamento');
            alert('Erro: Modal não está carregado corretamente. Tente novamente.');
            return;
        }

        // Preencher dados
        if (agendamento.id_cliente) clienteElement.value = agendamento.id_cliente;
        if (agendamento.id_servico) servicoElement.value = agendamento.id_servico;
        if (agendamento.start_at) {
            const dateTime = new Date(agendamento.start_at);
            dataElement.value = dateTime.toISOString().split('T')[0];
            horaElement.value = dateTime.toTimeString().substring(0, 5);
        }
        if (observacoesElement) {
            observacoesElement.value = agendamento.observacoes || '';
        }

        // Título e flag de edição
        modalTitle.textContent = 'Editar Agendamento';
        modal.dataset.editingId = id;
    }).catch(() => {
        alert('Erro ao preparar formulário de edição. Tente novamente.');
    });
}

function confirmarAgendamento(id) {
    console.log('Confirmar agendamento:', id);
    // TODO: Implementar confirmação de agendamento
}

async function cancelarAgendamento(id) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
        return;
    }

    console.log('Cancelar agendamento:', id);

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/agendamentos/${id}`, {
            method: 'DELETE'
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Agendamento cancelado com sucesso!');

            // Recarregar agenda se estiver na página
            if (window.barbeirosApp.currentPage === 'agenda') {
                if (window.agendaPage) {
                    // Se AgendaPage está ativa, usar ela para recarregar com força
                    window.agendaPage.load(true);
                } else {
                    // Senão, usar o método padrão
                    window.barbeirosApp.loadAgendaData();
                }
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao cancelar agendamento');
        }
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

// === VARIÁVEIS GLOBAIS PARA CACHE DE DADOS ===
let servicosData = []; // Cache dos dados dos serviços
let servicosViewMode = localStorage.getItem('servicosViewMode') || 'table'; // 'table' ou 'cards'
let clientesData = []; // Cache dos dados dos clientes
let agendaData = []; // Cache dos dados dos agendamentos
let usuariosData = []; // Cache dos dados dos usuários

// === FUNÇÕES ESPECÍFICAS PARA PÁGINA DE SERVIÇOS ===

// Renderizar serviços em tabela
function renderizarServicosTabela(servicos) {
    const tbody = document.getElementById('servicos-table-body');
    const emptyState = document.getElementById('servicos-empty-table');

    if (!servicos || servicos.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = servicos.map(servico => `
        <tr>
            <td>
                <div>
                    <div class="servico-nome">${servico.nome_servico}</div>
                    ${servico.descricao ? `<div class="servico-descricao">${servico.descricao}</div>` : ''}
                </div>
            </td>
            <td>
                <span class="servico-duracao">
                    <i class="bi bi-clock me-1"></i>${servico.duracao_min} min
                </span>
            </td>
            <td>
                <span class="servico-valor">R$ ${parseFloat(servico.valor).toFixed(2)}</span>
            </td>
            <td>
                <span class="badge servico-status-badge ${servico.ativo ? 'status-ativo' : 'status-inativo'}">
                    ${servico.ativo ? '<i class="bi bi-check-circle me-1"></i>Ativo' : '<i class="bi bi-x-circle me-1"></i>Inativo'}
                </span>
            </td>
            <td>
                <span class="badge bg-warning-subtle text-warning">
                    <i class="bi bi-star me-1"></i>${servico.popularidade || 0}
                </span>
            </td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editarServico(${servico.id_servico})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="duplicarServico(${servico.id_servico})" title="Duplicar">
                        <i class="bi bi-copy"></i>
                    </button>
                    <button class="btn btn-outline-${servico.ativo ? 'warning' : 'success'}" onclick="toggleServicoStatus(${servico.id_servico})" title="${servico.ativo ? 'Desativar' : 'Ativar'}">
                        <i class="bi bi-${servico.ativo ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="excluirServico(${servico.id_servico})" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Renderizar serviços em cards
function renderizarServicosCards(servicos) {
    const container = document.getElementById('servicos-cards-container');
    const emptyState = document.getElementById('servicos-empty-cards');

    if (!servicos || servicos.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = servicos.map(servico => `
        <div class="col-xl-3 col-lg-4 col-md-6">
            <div class="servico-card">
                <div class="servico-card-header">
                    <h5>${servico.nome_servico}</h5>
                </div>
                <div class="servico-card-body">
                    ${servico.descricao ? `<p class="text-muted small mb-3">${servico.descricao}</p>` : ''}
                    <div class="servico-metric">
                        <i class="bi bi-clock text-info"></i>
                        <span class="valor">${servico.duracao_min} min</span>
                    </div>
                    <div class="servico-metric">
                        <i class="bi bi-cash text-success"></i>
                        <span class="valor">R$ ${parseFloat(servico.valor).toFixed(2)}</span>
                    </div>
                    <div class="servico-metric">
                        <i class="bi bi-star text-warning"></i>
                        <span class="valor">${servico.popularidade || 0}</span>
                    </div>
                </div>
                <div class="servico-card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge servico-status-badge ${servico.ativo ? 'status-ativo' : 'status-inativo'}">
                            ${servico.ativo ? '<i class="bi bi-check-circle me-1"></i>Ativo' : '<i class="bi bi-x-circle me-1"></i>Inativo'}
                        </span>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editarServico(${servico.id_servico})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="excluirServico(${servico.id_servico})" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtrar serviços
function filtrarServicos() {
    const searchEl = document.getElementById('servico-search');
    const statusEl = document.getElementById('servico-status');
    const searchTerm = (searchEl?.value || '').toLowerCase();
    const statusFilter = statusEl?.value || '';

    let filtered = servicosData.filter(servico => {
        const matchesSearch = servico.nome_servico.toLowerCase().includes(searchTerm) ||
                            (servico.descricao && servico.descricao.toLowerCase().includes(searchTerm));
        const matchesStatus = statusFilter === '' || servico.ativo.toString() === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Aplicar ordenação atual
    ordenarServicos(filtered, true);

    // Renderizar com filtro aplicado
    if (servicosViewMode === 'table') {
        renderizarServicosTabela(filtered);
    } else {
        renderizarServicosCards(filtered);
    }

    // Atualizar contador
    document.getElementById('contador-servicos').textContent = filtered.length;
}

// Ordenar serviços
function ordenarServicos(servicosParaOrdenar, usarFiltroAtual = false) {
    let servicos = usarFiltroAtual ? servicosParaOrdenar : servicosData;
    const criterio = document.getElementById('servico-ordenacao')?.value || 'nome';

    servicos.sort((a, b) => {
        switch (criterio) {
            case 'nome':
                return a.nome_servico.localeCompare(b.nome_servico);
            case 'valor':
                return parseFloat(b.valor) - parseFloat(a.valor);
            case 'duracao':
                return b.duracao_min - a.duracao_min;
            case 'popularidade':
                return (b.popularidade || 0) - (a.popularidade || 0);
            default:
                return 0;
        }
    });

    if (!usarFiltroAtual) {
        // Reaplicar filtros após ordenação
        filtrarServicos();
    }

    return servicos;
}

// Toggle de visualização (tabela/cards)
function toggleVisualizacaoServicos() {
    const btnToggle = document.getElementById('btn-toggle-view');
    const tableView = document.getElementById('servicos-table-view');
    const cardsView = document.getElementById('servicos-cards-view');

    if (servicosViewMode === 'table') {
        servicosViewMode = 'cards';
        tableView.style.display = 'none';
        cardsView.style.display = 'block';
        btnToggle.innerHTML = '<i class="bi bi-list me-1"></i>Tabela';
    } else {
        servicosViewMode = 'table';
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        btnToggle.innerHTML = '<i class="bi bi-grid me-1"></i>Grade';
    }

    try { localStorage.setItem('servicosViewMode', servicosViewMode); } catch (e) {}

    // Re-renderizar na nova visualização
    if (servicosViewMode === 'table') {
        renderizarServicosTabela(servicosData);
    } else {
        renderizarServicosCards(servicosData);
    }

    // Reaplicar filtros
    filtrarServicos();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('servico-search').value = '';
    document.getElementById('servico-status').value = '';
    document.getElementById('servico-ordenacao').value = 'nome';

    filtrarServicos();
}

// Exportar serviços
function exportarServicos() {
    if (servicosData.length === 0) {
        alert('Nenhum serviço para exportar.');
        return;
    }

    const dados = servicosData.map(servico => ({
        nome: servico.nome_servico,
        descricao: servico.descricao || '',
        duracao_min: servico.duracao_min,
        valor: parseFloat(servico.valor),
        ativo: servico.ativo
    }));

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servicos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.barbeirosApp.showSuccess('Serviços exportados com sucesso!');
}

// Importar serviços
function importarServicos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const dados = JSON.parse(e.target.result);
                    // Aqui seria implementada a lógica de importação via API
                    console.log('Dados para importar:', dados);
                    window.barbeirosApp.showSuccess('Funcionalidade de importação será implementada em breve!');
                } catch (error) {
                    console.error('Erro ao importar:', error);
                    window.barbeirosApp.showError('Arquivo inválido!');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Toggle status do serviço
function toggleServicoStatus(id) {
    console.log('Toggle status serviço:', id);
    // TODO: Implementar toggle de status via API
    window.barbeirosApp.showSuccess('Funcionalidade será implementada em breve!');
}

// Duplicar serviço
async function duplicarServico(id) {
    console.log('Duplicar serviço:', id);

    // Buscar dados do serviço para duplicar
    const servico = servicosData.find(s => s.id_servico === id);
    if (!servico) {
        alert('Serviço não encontrado!');
        return;
    }

    // Criar uma cópia com nome modificado
    const nomeDuplicado = `${servico.nome_servico} (Cópia)`;

    try {
        const response = await window.barbeirosApp.apiRequest('/api/servicos', {
            method: 'POST',
            body: JSON.stringify({
                nome_servico: nomeDuplicado,
                duracao_min: servico.duracao_min,
                valor: servico.valor,
                descricao: servico.descricao,
                ativo: servico.ativo
            })
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Serviço duplicado com sucesso!');
            // Recarregar serviços se estiver na página
            if (window.barbeirosApp.currentPage === 'servicos') {
                window.barbeirosApp.loadServicosData();
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao duplicar serviço');
        }
    } catch (error) {
        console.error('Erro ao duplicar serviço:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

// Atualizar métricas da página de serviços
function atualizarMetricasServicos(servicos) {
    const totalServicos = servicos.length;
    const servicosAtivos = servicos.filter(s => s.ativo).length;

    // Total de serviços
    document.getElementById('total-servicos').textContent = totalServicos;

    // Receita média
    const valores = servicos.map(s => parseFloat(s.valor));
    const receitaMedia = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
    document.getElementById('receita-media').textContent = `R$ ${receitaMedia.toFixed(2)}`;

    // Duração média
    const duracoes = servicos.map(s => s.duracao_min);
    const duracaoMedia = duracoes.length > 0 ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : 0;
    document.getElementById('duracao-media').textContent = `${Math.round(duracaoMedia)} min`;

    // Serviço mais popular
    const maisPopular = servicos.reduce((prev, current) => {
        return (prev.popularidade || 0) > (current.popularidade || 0) ? prev : current;
    }, {});
    document.getElementById('mais-popular').textContent = maisPopular.nome_servico || '-';
}

// Sobrescrever a função loadServicosData para usar o novo sistema
BarbeirosApp.prototype.loadServicosData = async function() {
    const tableContainer = document.getElementById('servicos-table-container');
    const cardsContainer = document.getElementById('servicos-cards-container');

    try {
        const response = await this.apiRequest('/api/servicos');

        if (response.success) {
            servicosData = response.data || [];
            console.log('✅ Serviços carregados:', servicosData.length, 'itens');

            // Atualizar métricas (sempre)
            if (typeof atualizarMetricasServicos === 'function') {
                atualizarMetricasServicos(servicosData);
            }

            // Renderizar serviços se os elementos existirem
            if (tableContainer || cardsContainer) {
                console.log('📄 Renderizando interface de serviços...');
                if (servicosViewMode === 'table' && tableContainer) {
                    renderizarServicosTabela(servicosData);
                } else if (cardsContainer) {
                    renderizarServicosCards(servicosData);
                }

                // Aplicar filtros iniciais
                if (typeof filtrarServicos === 'function') {
                    filtrarServicos();
                }
                console.log('✅ Interface de serviços atualizada');
            } else {
                console.log('ℹ️ Elementos de serviços não encontrados');
            }
        } else {
            console.error('❌ Erro na resposta da API:', response);
            if (tableContainer) {
                tableContainer.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar serviços</p></div>';
            }
            if (cardsContainer) {
                cardsContainer.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar serviços</p></div>';
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        if (tableContainer) {
            tableContainer.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
        if (cardsContainer) {
            cardsContainer.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }
};

// Função para limpar dados de autenticação na inicialização
function clearAuthOnStartup() {
    // Verificar se há dados de autenticação no localStorage
    const token = localStorage.getItem('barbeiros-token');
    const user = localStorage.getItem('barbeiros-user');
    
    if (token || user) {
        console.log('Dados de autenticação encontrados no localStorage, verificando validade...');
        
        // Se há token, verificar se é válido
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const now = Math.floor(Date.now() / 1000);
                    
                    // Se o token expirou ou não tem campos necessários, limpar
                    if (payload.exp && payload.exp < now) {
                        console.log('Token expirado, limpando dados de autenticação');
                        localStorage.removeItem('barbeiros-token');
                        localStorage.removeItem('barbeiros-user');
                    } else if (!payload.userId || !payload.tenantId) {
                        console.log('Token inválido, limpando dados de autenticação');
                        localStorage.removeItem('barbeiros-token');
                        localStorage.removeItem('barbeiros-user');
                    }
                } else {
                    console.log('Token malformado, limpando dados de autenticação');
                    localStorage.removeItem('barbeiros-token');
                    localStorage.removeItem('barbeiros-user');
                }
            } catch (error) {
                console.log('Erro ao verificar token, limpando dados de autenticação:', error);
                localStorage.removeItem('barbeiros-token');
                localStorage.removeItem('barbeiros-user');
            }
        }
    }
}

// Funções de validação globais
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarTelefone(telefone) {
    // Remove todos os caracteres não numéricos
    const numeros = telefone.replace(/\D/g, '');
    // Telefone deve ter:
    // - 10 dígitos: DDD + 8 dígitos (celular antigo)
    // - 11 dígitos: DDD + 9 dígitos (celular novo)
    // - 12 dígitos: DDD + 8 dígitos (fixo com 9)
    // - 13 dígitos: Código do país + DDD + 9 dígitos
    return numeros.length >= 10 && numeros.length <= 13;
}

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Limpar dados de autenticação inválidos antes de inicializar
    clearAuthOnStartup();
    
    // Inicializar router
    window.router = new Router();
    console.log('🔧 Router inicializado');
    
    window.barbeirosApp = new BarbeirosApp();
    
    // Registrar páginas no router
    if (window.router) {
        console.log('🔧 Registrando páginas no router...');
        console.log('  - clientesPage:', !!window.clientesPage);
        console.log('  - servicosPage:', !!window.servicosPage);
        console.log('  - agendaPage:', !!window.agendaPage);
        console.log('  - usuariosPage:', !!window.usuariosPage);
        console.log('  - configuracoesPage:', !!window.configuracoesPage);
        
        if (window.configuracoesPage) {
            console.log('  - configuracoesPage.load:', typeof window.configuracoesPage.load);
        }
        
        window.router.registerPage('clientes', window.clientesPage);
        window.router.registerPage('servicos', window.servicosPage);
        window.router.registerPage('agenda', window.agendaPage);
        window.router.registerPage('usuarios', window.usuariosPage);
        window.router.registerPage('configuracoes', window.configuracoesPage);
        
        // Registrar página WhatsApp se disponível
        if (window.whatsappPage) {
            console.log('  - whatsappPage:', !!window.whatsappPage);
            window.router.registerPage('whatsapp', window.whatsappPage);
        }
    }

    // Inicializar toggle Auto-Agendamento no topo (navbar)
    (async function initAutoConfirmTopSwitch() {
        try {
            const topSwitch = document.getElementById('autoConfirmTopSwitch');
            if (!topSwitch) return;

            // Carregar estado atual da configuração
            try {
                const cfg = await window.barbeirosApp.apiRequest('/api/configuracoes');
                if (cfg && cfg.success && cfg.data) {
                    topSwitch.checked = !!cfg.data.auto_confirm_whatsapp;
                }
            } catch (e) {
                console.warn('Não foi possível carregar auto_confirm_whatsapp:', e);
            }

            // Alteração de estado
            topSwitch.addEventListener('change', async (ev) => {
                const desired = !!ev.target.checked;
                try {
                    await window.barbeirosApp.apiRequest('/api/configuracoes', {
                        method: 'PUT',
                        body: JSON.stringify({ auto_confirm_whatsapp: desired })
                    });
                    if (window.barbeirosApp?.showSuccess) {
                        window.barbeirosApp.showSuccess(`Auto-agendamento ${desired ? 'ativado' : 'desativado'}`);
                    }
                } catch (err) {
                    console.error('Falha ao salvar auto_confirm_whatsapp:', err);
                    ev.target.checked = !desired; // reverter UI
                    if (window.barbeirosApp?.showError) {
                        window.barbeirosApp.showError('Falha ao atualizar auto-agendamento');
                    }
                }
            });
        } catch (_) {}
    })();
});
