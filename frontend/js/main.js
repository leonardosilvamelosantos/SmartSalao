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
        // Aguardar o sistema de roteamento de autenticação
        this.waitForAuthRouter();
    }

    // Aguardar o sistema de roteamento de autenticação
    waitForAuthRouter() {
        // Se o AuthRouter já está disponível, inicializar
        if (window.authRouter) {
            this.initializeApp();
            return;
        }

        // Aguardar o evento de autenticação
        window.addEventListener('auth:authenticated', (event) => {
            console.log('🔐 Evento de autenticação recebido:', event.detail);
            this.initializeApp();
        });

        // Aguardar o evento de página de login
        window.addEventListener('auth:login-page', (event) => {
            console.log('🔐 Evento de página de login recebido');
            // Não inicializar a aplicação se estiver na página de login
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!this.isInitialized) {
                console.warn('⚠️ Timeout na inicialização, tentando inicializar mesmo assim...');
                this.initializeApp();
            }
        }, 5000);
    }

    // Inicializar aplicação (chamado após autenticação confirmada)
    async initializeApp() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando aplicação...');
        this.isInitialized = true;

        // Limpar dados de autenticação inválidos na inicialização
        this.clearInvalidAuthData();
        this.checkAuth();
        
        // Configurar eventos críticos primeiro (reduzir FID)
        this.setupEventListeners();
        
        // Carregar dados essenciais primeiro
        await this.loadDashboardData();
        
        // Deferir carregamento pesado para reduzir FID
        requestIdleCallback(() => {
            this.preloadServices();
            this.loadAllPagesData();
        });
        
        // Listener para quando dashboardManager estiver pronto
        window.addEventListener('dashboardManager:ready', () => {
            console.log('🎯 DashboardManager pronto! Recarregando agendamentos...');
            if (window.dashboardManager) {
                window.dashboardManager.loadProximosAgendamentos();
            }
        });
    }

    // Pré-carregar serviços
    async preloadServices() {
        try {
            console.log('🔄 Pré-carregando dados de serviços...');
            const response = await this.apiRequest('/api/servicos');
            
            if (response.success) {
                console.log('✅ Serviços pré-carregados:', response.data?.length || 0, 'itens');
                // Armazenar dados globalmente para uso posterior
                window.servicosData = response.data || [];
                return response.data;
            } else {
                console.warn('⚠️ Erro ao pré-carregar serviços:', response.message);
                return [];
            }
        } catch (error) {
            console.warn('⚠️ Erro ao pré-carregar serviços:', error);
            return [];
        }
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
        
        // console.log('🚀 Carregamento em background iniciado para todas as páginas'); // Otimizado - log removido
    }

    // Função auxiliar para criar títulos de modal com ícones
    createModalTitle(iconClass, text) {
        const icon = document.createElement('i');
        icon.className = iconClass;
        const textNode = document.createTextNode(text);
        const container = document.createElement('span');
        container.appendChild(icon);
        container.appendChild(textNode);
        return container;
    }

    // Função auxiliar para gerenciar modal de forma segura
    showModal(title, content) {
        const modalElement = document.getElementById('formModal');
        const modalTitle = document.getElementById('formModalTitle');
        const modalBody = document.getElementById('formModalBody');
        
        // Configurar conteúdo - tratar título com HTML
        if (modalTitle) {
            modalTitle.innerHTML = '';
            if (typeof title === 'string' && title.includes('<i class')) {
                // Se for HTML string, usar innerHTML
                modalTitle.innerHTML = title;
            } else if (title && title.nodeType === 1) {
                // Se for elemento DOM (nodeType === 1), anexar
                modalTitle.appendChild(title);
            } else if (typeof title === 'string') {
                // Se for string simples, usar textContent
                modalTitle.textContent = title;
            } else {
                // Fallback para outros tipos
                modalTitle.textContent = String(title);
            }
        }
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

    // Verificar se o token é válido (versão silenciosa para evitar logs duplicados)
    isValidTokenSilent() {
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
            
            // Verificar se tem pelo menos um dos campos necessários (mais flexível)
            if (!payload.userId && !payload.id) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
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
        
        // Verificar se o token é válido (sem logs duplicados)
        if (!this.isValidTokenSilent()) {
            this.clearAuthData();
        }
    }

    // Verificar autenticação
    checkAuth() {
        // Se já verificamos recentemente, pular verificação duplicada
        if (this.lastAuthCheck && Date.now() - this.lastAuthCheck < 1000) {
            return;
        }
        
        this.token = localStorage.getItem('barbeiros-token');
        this.user = JSON.parse(localStorage.getItem('barbeiros-user') || 'null');

        console.log('🔒 Verificando autenticação...');
        console.log('🔒 Token encontrado:', !!this.token, this.token ? this.token.substring(0, 50) + '...' : 'null');
        console.log('🔒 Usuário encontrado:', !!this.user, this.user ? this.user.nome : 'null');

        // Verificar se o token é válido (não null, undefined ou string "null")
        if (!this.token || this.token === 'null' || this.token === 'undefined' || !this.user || !this.isValidToken()) {
            console.log('🔒 Token ou usuário inválido, redirecionando para login');
            // Limpar dados de autenticação inválidos
            this.clearAuthData();
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'pages/login.html';
            return;
        }

        // Marcar timestamp da verificação
        this.lastAuthCheck = Date.now();

        // Atualizar nome do usuário na interface
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.user.nome) {
            userNameElement.textContent = this.user.nome;
        }

        // Reinicializar sistema de notificações se estiver autenticado
        if (window.notificationSystem) {
            window.notificationSystem.reinitialize();
        }

        // Mostrar notificação de login bem-sucedido
        if (window.toastSystem && this.user.nome) {
            window.toastSystem.success(`Bem-vindo, ${this.user.nome}!`);
        }
    }

    // Verificar se o token é válido (versão com logs para debug)
    isValidToken() {
        console.log('🔍 Verificando validade do token...');
        
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            console.log('❌ Token não encontrado ou inválido');
            return false;
        }
        
        try {
            // Verificar se o token tem a estrutura básica de JWT
            const parts = this.token.split('.');
            if (parts.length !== 3) {
                console.log('❌ Token não tem estrutura JWT válida');
                return false;
            }
            
            // Decodificar o payload (sem verificar assinatura)
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔍 Payload do token:', payload);
            
            // Verificar se não expirou
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                console.log('❌ Token expirado. Exp:', payload.exp, 'Now:', now);
                return false;
            }
            
            // Verificar se tem pelo menos um dos campos necessários (mais flexível)
            if (!payload.userId && !payload.id) {
                console.log('❌ Token não tem userId ou id. userId:', payload.userId, 'id:', payload.id);
                return false;
            }
            
            console.log('✅ Token válido');
            return true;
        } catch (error) {
            console.log('❌ Erro ao decodificar token:', error);
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


    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            console.log('🔄 Main.js: Carregando dados do dashboard...');
            const response = await this.apiRequest('/api/dashboard');

            if (response.success) {
                console.log('✅ Main.js: Dados do dashboard carregados:', response.data);
                this.updateDashboardMetrics(response.data);
            } else {
                console.error('❌ Main.js: Erro na resposta da API:', response);
                this.showError('Erro ao carregar dados do dashboard');
            }
        } catch (error) {
            console.error('❌ Main.js: Erro no dashboard:', error);
            this.showError('Erro de conexão com o servidor');
        }

        // Carregar nome do estabelecimento
        await this.loadEstablishmentName();
        
        // Carregar agendamentos do dashboard se dashboardManager estiver disponível
        if (window.dashboardManager) {
            console.log('🔄 Main.js: Carregando agendamentos via dashboardManager...');
            await window.dashboardManager.loadProximosAgendamentos();
        } else {
            console.warn('⚠️ Main.js: dashboardManager não está disponível, aguardando...');
            // Aguardar mais tempo e tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.dashboardManager) {
                console.log('✅ Main.js: dashboardManager agora disponível, carregando agendamentos...');
                await window.dashboardManager.loadProximosAgendamentos();
            } else {
                console.error('❌ Main.js: dashboardManager ainda não disponível após aguardar');
                // Tentar criar dashboardManager manualmente
                console.log('🔧 Main.js: Tentando criar dashboardManager manualmente...');
                if (window.DashboardManager) {
                    window.dashboardManager = new window.DashboardManager(this);
                    console.log('✅ Main.js: dashboardManager criado manualmente');
                    await window.dashboardManager.loadProximosAgendamentos();
                } else {
                    console.error('❌ Main.js: DashboardManager class não está disponível');
                }
            }
        }
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
        console.log('🔄 Carregando dados de serviços...');
        
        // Verificar se já temos dados pré-carregados
        if (window.servicosData && window.servicosData.length > 0) {
            console.log('✅ Usando dados pré-carregados de serviços:', window.servicosData.length, 'itens');
            this.renderServicos(window.servicosData);
            
            // Forçar atualização da interface se estiver na página de serviços
            if (this.currentPage === 'servicos') {
                console.log('🔄 Atualizando interface da página de serviços...');
                // Chamar a função de renderização específica da página
                if (typeof renderizarServicosTabela === 'function') {
                    console.log('🔄 Chamando renderizarServicosTabela...');
                    renderizarServicosTabela(window.servicosData);
                } else {
                    console.warn('⚠️ Função renderizarServicosTabela não encontrada');
                }
                if (typeof atualizarMetricasServicos === 'function') {
                    console.log('🔄 Chamando atualizarMetricasServicos...');
                    atualizarMetricasServicos(window.servicosData);
                } else {
                    console.warn('⚠️ Função atualizarMetricasServicos não encontrada');
                }
            }
            return;
        }
        
        try {
            const response = await this.apiRequest('/api/servicos');
            console.log('📊 Resposta da API de serviços:', response);

            if (response.success) {
                console.log('✅ Dados de serviços carregados:', response.data?.length || 0, 'itens');
                this.renderServicos(response.data);
                
                // Armazenar dados globalmente
                window.servicosData = response.data || [];
                
                // Forçar atualização da interface se estiver na página de serviços
                if (this.currentPage === 'servicos') {
                    console.log('🔄 Atualizando interface da página de serviços...');
                    // Chamar a função de renderização específica da página
                    if (typeof renderizarServicosTabela === 'function') {
                        console.log('🔄 Chamando renderizarServicosTabela...');
                        renderizarServicosTabela(response.data);
                    } else {
                        console.warn('⚠️ Função renderizarServicosTabela não encontrada');
                    }
                    if (typeof atualizarMetricasServicos === 'function') {
                        console.log('🔄 Chamando atualizarMetricasServicos...');
                        atualizarMetricasServicos(response.data);
                    } else {
                        console.warn('⚠️ Função atualizarMetricasServicos não encontrada');
                    }
                }
            } else {
                console.error('❌ Erro na API de serviços:', response.message);
                this.showError('Erro ao carregar serviços: ' + (response.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar serviços:', error);
            this.showError('Erro de conexão ao carregar serviços');
        }
    }

    // Renderizar lista de serviços
    renderServicos(servicos) {
        console.log('🔄 Renderizando serviços:', servicos?.length || 0, 'itens');
        
        // Atualizar métricas
        if (typeof atualizarMetricasServicos === 'function') {
            atualizarMetricasServicos(servicos);
        }
        
        // Renderizar na visualização padrão (grade)
        if (servicosViewMode === 'cards') {
            if (typeof renderizarServicosCards === 'function') {
                renderizarServicosCards(servicos);
            } else {
                console.warn('⚠️ Função renderizarServicosCards não encontrada');
            }
        } else {
            if (typeof renderizarServicosTabela === 'function') {
                renderizarServicosTabela(servicos);
            } else {
                console.warn('⚠️ Função renderizarServicosTabela não encontrada');
            }
        }
        
        // Armazenar dados globalmente para uso posterior
        window.servicosData = servicos || [];
        console.log('✅ Serviços renderizados e armazenados globalmente');
        return;
        
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
        // console.log('🔄 loadAgendaData chamada'); // Otimizado - log removido
        
        try {
            const response = await this.apiRequest('/api/agendamentos');

            if (response.success) {
                // console.log('📊 Dados da agenda recebidos:', response.data); // Otimizado - log removido
                // Armazenar dados em cache global
                window.agendaData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                // console.log('💾 Cache atualizado:', window.agendaData); // Otimizado - log removido
                
                // NÃO renderizar aqui - deixar para o router/AgendaPage
                // console.log('⏭️ loadAgendaData: dados carregados, delegando renderização para router/AgendaPage'); // Otimizado - log removido
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

    // Renderizar agenda - OTIMIZADO PARA MOBILE
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
                    <span class="badge bg-primary ms-2">${agendamentosDoDia.length} agendamento(s)</span>
                </h5>
                <div class="agenda-items">
                    ${agendamentosDoDia.map(agendamento => this.renderAppointmentCard(agendamento)).join('')}
                </div>
            </div>
        `).join('');

        content.innerHTML = html;
    }

    // Renderizar card de agendamento individual - OTIMIZADO PARA MOBILE
    renderAppointmentCard(agendamento) {
        const statusClass = agendamento.status === 'confirmed' ? 'confirmed' : 
                           agendamento.status === 'pending' ? 'pending' : 'cancelled';
        
        const statusText = agendamento.status === 'confirmed' ? 'Confirmado' : 
                          agendamento.status === 'pending' ? 'Pendente' : 'Cancelado';
        
        const statusIcon = agendamento.status === 'confirmed' ? 'bi-check-circle-fill' : 
                          agendamento.status === 'pending' ? 'bi-clock-fill' : 'bi-x-circle-fill';
        
        const time = new Date(agendamento.start_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: 'America/Sao_Paulo'
        });

        return `
            <div class="appointment-item">
                <!-- Status indicator -->
                <div class="appointment-status ${statusClass}"></div>
                
                <!-- Conteúdo principal -->
                <div class="appointment-content">
                    <!-- Header com informações principais -->
                    <div class="appointment-header">
                        <div class="appointment-info">
                            <div class="appointment-client">${agendamento.cliente_nome || 'Cliente'}</div>
                            <div class="appointment-service">${agendamento.nome_servico || 'Serviço'}</div>
                        </div>
                        
                        <div class="appointment-right-info">
                            <div class="appointment-time">
                                <i class="bi bi-clock me-1"></i>${time}
                            </div>
                            <!-- Status badge -->
                            <div class="badge bg-${agendamento.status === 'confirmed' ? 'success' : agendamento.status === 'pending' ? 'warning' : 'secondary'} d-flex align-items-center">
                                <i class="bi ${statusIcon} me-1"></i>${statusText}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Ações - OTIMIZADAS PARA MOBILE -->
                    <div class="appointment-actions">
                        <div class="btn-group">
                            <button class="btn btn-edit" onclick="editarAgendamento(${agendamento.id_agendamento})" title="Editar agendamento">
                                <i class="bi bi-pencil"></i>
                                <span class="d-none d-sm-inline">Editar</span>
                            </button>
                            <button class="btn btn-reschedule" onclick="reagendarAgendamento(${agendamento.id_agendamento})" title="Reagendar">
                                <i class="bi bi-arrow-repeat"></i>
                                <span class="d-none d-sm-inline">Reagendar</span>
                            </button>
                            <button class="btn btn-cancel" onclick="cancelarAgendamento(${agendamento.id_agendamento})" title="Cancelar">
                                <i class="bi bi-x-circle"></i>
                                <span class="d-none d-sm-inline">Cancelar</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Botão de deletar separado -->
                <button class="appointment-delete" onclick="deletarAgendamento(${agendamento.id_agendamento})" title="Deletar agendamento">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    }

    // Filtrar agenda por status - FUNÇÃO MOBILE OTIMIZADA
    filtrarAgendaPorStatus(status) {
        console.log('🔍 Filtrando agenda por status:', status);
        
        // Atualizar ícones ativos
        const navIcons = document.querySelectorAll('.navbar-secondary .nav-icon');
        navIcons.forEach(icon => icon.classList.remove('active'));
        
        // Encontrar e ativar o ícone correspondente
        const targetIcon = Array.from(navIcons).find(icon => {
            const onclick = icon.getAttribute('onclick');
            return onclick && onclick.includes(`'${status}'`);
        });
        
        if (targetIcon) {
            targetIcon.classList.add('active');
        }
        
        // Aplicar filtro se houver dados carregados
        if (window.agendaData && window.agendaData.length > 0) {
            let agendamentosFiltrados = window.agendaData;
            
            if (status !== 'all') {
                agendamentosFiltrados = window.agendaData.filter(agendamento => agendamento.status === status);
            }
            
            this.renderAgenda(agendamentosFiltrados);
        }
    }

    // Método para ordenar serviços
    ordenarServicos(ordenacao) {
        console.log('Ordenando serviços por:', ordenacao);
        
        if (!this.servicosData || this.servicosData.length === 0) {
            console.warn('Nenhum serviço para ordenar');
            return;
        }

        let servicosOrdenados = [...this.servicosData];

        switch (ordenacao) {
            case 'nome':
                servicosOrdenados.sort((a, b) => (a.nome_servico || '').localeCompare(b.nome_servico || ''));
                break;
            case 'valor':
                servicosOrdenados.sort((a, b) => parseFloat(a.valor || 0) - parseFloat(b.valor || 0));
                break;
            case 'duracao':
                servicosOrdenados.sort((a, b) => parseInt(a.duracao_min || 0) - parseInt(b.duracao_min || 0));
                break;
            case 'popularidade':
                // Ordenar por número de agendamentos (implementar quando tiver dados)
                servicosOrdenados.sort((a, b) => (b.popularidade || 0) - (a.popularidade || 0));
                break;
            default:
                console.warn('Tipo de ordenação não reconhecido:', ordenacao);
                return;
        }

        this.servicosData = servicosOrdenados;
        this.renderServicos();
        console.log('Serviços ordenados com sucesso');
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
        console.log('🌐 API Request:', endpoint, 'Token presente:', !!this.token);
        console.log('🌐 Token completo:', this.token ? this.token.substring(0, 50) + '...' : 'null');
        
        // Verificar se o token é válido antes de enviar
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            console.log('❌ Token inválido, tentando buscar do localStorage');
            const tokenFromStorage = localStorage.getItem('barbeiros-token');
            if (tokenFromStorage && tokenFromStorage !== 'null' && tokenFromStorage !== 'undefined') {
                console.log('🔄 Token encontrado no localStorage, atualizando this.token');
                this.token = tokenFromStorage;
            } else {
                console.log('❌ Token não encontrado em lugar nenhum, redirecionando para login');
                this.clearAuthData();
                window.location.href = 'pages/login.html';
                return { success: false, message: 'Token inválido' };
            }
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
        
        console.log('🌐 Headers finais:', mergedOptions.headers);
        console.log('🌐 Body:', mergedOptions.body);

        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, mergedOptions);
            const data = await response.json();
            
            console.log('📡 API Response:', response.status, data);
            
            // Se receber 401, limpar auth e redirecionar
            if (response.status === 401) {
                console.log('🔒 Token expirado ou inválido (401), redirecionando para login');
                this.clearAuthData();
                window.location.href = 'pages/login.html';
                return { success: false, message: 'Token expirado' };
            }
            
            return data;
        } catch (error) {
            console.error('❌ Erro na requisição API:', error);
            throw error;
        }
    }

    // Logout
    logout() {
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        window.location.href = 'login.html';
    }

    // Mostrar erro
    showError(message) {
        console.error(message);
        if (window.notificationManager) {
            window.notificationManager.showError(message);
        } else {
            alert(message); // Fallback
        }
    }

    // Mostrar sucesso
    showSuccess(message) {
        console.log(message);
        if (window.notificationManager) {
            window.notificationManager.showSuccess(message);
        } else {
            alert(message); // Fallback
        }
    }

    // Mostrar notificação dourada (importante/neutra)
    showGold(message) {
        console.log(message);
        if (window.notificationManager) {
            window.notificationManager.showGold(message);
        } else {
            alert(message); // Fallback
        }
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
    // Fechar sidebar mobile se estiver aberta
    if (window.innerWidth < 992) {
        closeMobileSidebar();
    }
    
    if (window.barbeirosApp) {
        window.barbeirosApp.showPage(pageName);
    }
}

function logout() {
    // Usar o sistema de roteamento para logout
    if (window.authRouter) {
        window.authRouter.logout();
    } else if (window.barbeirosApp) {
        window.barbeirosApp.logout();
    } else {
        // Fallback: limpar dados e redirecionar
        localStorage.removeItem('barbeiros-token');
        localStorage.removeItem('barbeiros-user');
        localStorage.removeItem('barbeiros-tenant');
        window.location.href = 'pages/login.html';
    }
}

// Função para fechar sidebar mobile
function closeMobileSidebar() {
    console.log('🔄 Fechando sidebar mobile...');
    
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Fechar collapse do Bootstrap
    if (sidebarCollapse && sidebarCollapse.classList.contains('show')) {
        console.log('✅ Fechando collapse da sidebar');
        const bsCollapse = new bootstrap.Collapse(sidebarCollapse, {
            toggle: false
        });
        bsCollapse.hide();
    }
    
    // Remover overlay
    if (overlay) {
        console.log('✅ Removendo overlay');
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
    }
    
    // Forçar reflow para garantir que as mudanças sejam aplicadas
    document.body.offsetHeight;
    
    console.log('✅ Sidebar mobile fechada');
}

// Função para abrir sidebar mobile
function openMobileSidebar() {
    console.log('🔄 Abrindo sidebar mobile...');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.classList.add('show');
        console.log('✅ Overlay adicionado');
    }
}

// Função de emergência para limpar overlay
function clearSidebarOverlay() {
    console.log('🚨 Limpeza de emergência do overlay...');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        console.log('✅ Overlay limpo');
    }
    
    // Função global para limpar overlay (pode ser chamada de qualquer lugar)
    window.clearOverlay = clearSidebarOverlay;
    
    if (sidebarCollapse) {
        sidebarCollapse.classList.remove('show');
        console.log('✅ Sidebar collapse limpo');
    }
    
    // Forçar reflow
    document.body.offsetHeight;
    console.log('✅ Limpeza de emergência concluída');
}

// Adicionar função global para limpeza de emergência
window.clearSidebarOverlay = clearSidebarOverlay;

// Gerenciar eventos da sidebar mobile
document.addEventListener('DOMContentLoaded', function() {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    // Garantir que o overlay esteja oculto no carregamento inicial
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        console.log('✅ Overlay inicializado como oculto');
    }
    
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
        
        // Garantir que o overlay seja completamente removido quando o collapse for fechado
        sidebarCollapse.addEventListener('hidden.bs.collapse', function() {
            if (overlay) {
                overlay.classList.remove('show');
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                console.log('✅ Overlay completamente removido');
            }
        });
    }
    
    // Limpeza adicional após um pequeno delay para garantir que tudo esteja carregado
    setTimeout(() => {
        if (overlay && overlay.classList.contains('show')) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            console.log('✅ Limpeza adicional do overlay aplicada');
        }
    }, 100);
    
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
                        <div class="position-relative">
                            <input type="text" class="form-control" id="cliente_search" placeholder="Digite para buscar cliente..." autocomplete="off">
                            <select class="form-control d-none" id="cliente_id" name="cliente_id">
                                <option value="">Selecione um cliente...</option>
                            </select>
                            <div id="cliente_dropdown" class="dropdown-menu w-100" style="max-height: 200px; overflow-y: auto; display: none;"></div>
                        </div>
                        <small class="form-text text-muted">Digite para buscar ou preencha o nome manualmente abaixo</small>
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
        const title = window.barbeirosApp.createModalTitle('bi bi-calendar-plus me-2', 'Novo Agendamento');
        window.barbeirosApp.showModal(title, modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'bi bi-calendar-plus me-2';
            modalTitle.appendChild(icon);
            modalTitle.appendChild(document.createTextNode('Novo Agendamento'));
        }
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    }

    // Carregar clientes e serviços
    carregarClientesSelect();
    carregarServicosSelect();
    configurarCamposCliente();

    // Definir data mínima como hoje
    const hoje = new Date().toISOString().split('T')[0];
    const dataInput = document.getElementById('data_agendamento');
    dataInput.min = hoje;
    dataInput.value = hoje; // Definir data padrão como hoje
    
    // Carregar horários para hoje
    carregarHorariosSelect();
    
    // Carregar horários quando a data mudar
    dataInput.addEventListener('change', carregarHorariosSelect);
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
        const title = window.barbeirosApp.createModalTitle('bi bi-person-plus me-2', 'Novo Cliente');
        window.barbeirosApp.showModal(title, modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'bi bi-person-plus me-2';
            modalTitle.appendChild(icon);
            modalTitle.appendChild(document.createTextNode('Novo Cliente'));
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
        const title = window.barbeirosApp.createModalTitle('bi bi-wrench-adjustable me-2', 'Novo Serviço');
        window.barbeirosApp.showModal(title, modalHtml);
    } else {
        // Fallback para compatibilidade
        document.getElementById('formModalBody').innerHTML = modalHtml;
        const modalTitle = document.getElementById('formModalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'bi bi-wrench-adjustable me-2';
            modalTitle.appendChild(icon);
            modalTitle.appendChild(document.createTextNode('Novo Serviço'));
        }
        const modal = new bootstrap.Modal(document.getElementById('formModal'));
        modal.show();
    }
}

// Funções auxiliares para os modais
function configurarCamposCliente() {
    const clienteSelect = document.getElementById('cliente_id');
    const clienteSearch = document.getElementById('cliente_search');
    const clienteDropdown = document.getElementById('cliente_dropdown');
    const nomeManualInput = document.getElementById('nome_cliente_manual');
    const telefoneManualInput = document.getElementById('telefone_cliente_manual');

    if (!clienteSelect || !nomeManualInput) return;

    // Array para armazenar todos os clientes
    let todosClientes = [];

    // Configurar busca de clientes
    if (clienteSearch && clienteDropdown) {
        clienteSearch.addEventListener('input', function() {
            const termo = this.value.toLowerCase().trim();
            
            if (termo.length < 2) {
                clienteDropdown.style.display = 'none';
                clienteSelect.value = '';
                return;
            }

            // Filtrar clientes
            const clientesFiltrados = todosClientes.filter(cliente => 
                cliente.nome.toLowerCase().includes(termo) ||
                (cliente.whatsapp && cliente.whatsapp.includes(termo)) ||
                (cliente.email && cliente.email.toLowerCase().includes(termo))
            );

            // Mostrar dropdown com resultados
            if (clientesFiltrados.length > 0) {
                clienteDropdown.innerHTML = clientesFiltrados.map(cliente => `
                    <div class="dropdown-item" data-id="${cliente.id_cliente}" data-nome="${cliente.nome}" style="cursor: pointer;">
                        <div class="fw-bold">${cliente.nome}</div>
                        ${cliente.whatsapp ? `<small class="text-muted">${cliente.whatsapp}</small>` : ''}
                        ${cliente.email ? `<small class="text-muted d-block">${cliente.email}</small>` : ''}
                    </div>
                `).join('');
                clienteDropdown.style.display = 'block';
            } else {
                clienteDropdown.innerHTML = '<div class="dropdown-item text-muted">Nenhum cliente encontrado</div>';
                clienteDropdown.style.display = 'block';
            }
        });

        // Selecionar cliente do dropdown
        clienteDropdown.addEventListener('click', function(e) {
            const item = e.target.closest('.dropdown-item[data-id]');
            if (item) {
                const id = item.dataset.id;
                const nome = item.dataset.nome;
                
                clienteSearch.value = nome;
                clienteSelect.value = id;
                clienteDropdown.style.display = 'none';
                
                // Desabilitar campos manuais
                if (nomeManualInput) nomeManualInput.disabled = true;
                if (telefoneManualInput) telefoneManualInput.disabled = true;
            }
        });

        // Esconder dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!clienteSearch.contains(e.target) && !clienteDropdown.contains(e.target)) {
                clienteDropdown.style.display = 'none';
            }
        });
    }

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
            if (clienteSearch) clienteSearch.disabled = true;
        } else {
            // Se nome não foi preenchido, habilitar select
            clienteSelect.disabled = false;
            if (clienteSearch) clienteSearch.disabled = false;
        }
    }

    // Adicionar event listeners
    clienteSelect.addEventListener('change', atualizarCampos);
    nomeManualInput.addEventListener('input', atualizarCampos);

    // Configurar estado inicial
    atualizarCampos();

    // Função para carregar todos os clientes
    async function carregarTodosClientes() {
        try {
            const response = await window.barbeirosApp.apiRequest('/api/clientes');
            if (response.success && response.data) {
                todosClientes = response.data;
            }
        } catch (error) {
            console.error('Erro ao carregar clientes para busca:', error);
        }
    }

    // Carregar clientes quando o modal abrir
    carregarTodosClientes();
}

async function carregarHorariosSelect() {
    const select = document.getElementById('hora_agendamento');
    const dataInput = document.getElementById('data_agendamento');
    if (!select || !dataInput) return;

    // Limpar opções existentes (exceto a primeira)
    select.innerHTML = '<option value="">Selecione um horário...</option>';

    // Obter data selecionada
    const dataSelecionada = dataInput.value;
    if (!dataSelecionada) return;

    try {
        // Usar a API para carregar slots disponíveis
        const response = await window.barbeirosApp.apiRequest(`/api/agendamentos/slots/${dataSelecionada}`);
        
        if (response.success && response.data) {
            response.data.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.horario;
                option.textContent = slot.horario;
                option.disabled = !slot.disponivel;
                if (!slot.disponivel) {
                    option.textContent += ' (Indisponível)';
                }
                select.appendChild(option);
            });
        } else {
            // Fallback: gerar horários localmente se API falhar
            console.warn('API de slots falhou, usando fallback local');
            carregarHorariosSelectFallback();
        }
    } catch (error) {
        console.error('Erro ao carregar slots:', error);
        // Fallback: gerar horários localmente se API falhar
        carregarHorariosSelectFallback();
    }
}

// Função fallback para gerar horários localmente (múltiplos de 15 minutos)
function carregarHorariosSelectFallback() {
    const select = document.getElementById('hora_agendamento');
    const dataInput = document.getElementById('data_agendamento');
    if (!select || !dataInput) return;

    // Obter data selecionada
    const dataSelecionada = dataInput.value;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    // Gerar horários de 15 em 15 minutos das 08:00 às 18:00 (horário padrão)
    for (let hora = 8; hora <= 18; hora++) {
        for (let minuto = 0; minuto < 60; minuto += 15) {
            // Se for hoje, verificar se o horário já passou
            if (dataSelecionada === hoje) {
                if (hora < horaAtual || (hora === horaAtual && minuto <= minutoAtual)) {
                    continue; // Pular horários já passados
                }
            }

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
        window.notificationManager?.showError('Erro: Formulário não está carregado corretamente. Tente novamente.');
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
        window.notificationManager?.showWarning('Selecione um cliente cadastrado ou digite o nome do cliente!');
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
        window.notificationManager?.showWarning('Preencha todos os campos obrigatórios!');
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
    
    // Criar data no timezone local sem conversão automática
    const dataObj = new Date(ano, mes - 1, dia, parseInt(horaNum), parseInt(minutoNum), 0);
    
    // Formatar para ISO string mantendo o horário local
    const start_at = `${data}T${hora}:00`;
    
    console.log('🕐 Conversão de horário:', {
        data: data,
        hora: hora,
        dataObj: dataObj,
        start_at: start_at,
        horaLocal: dataObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        formatoEnviado: `${data}T${hora}:00`
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

            // Atualizar próximos agendamentos no dashboard
            if (window.dashboardManager && window.dashboardManager.updateProximosAgendamentos) {
                console.log('🔄 Atualizando próximos agendamentos no dashboard...');
                window.dashboardManager.updateProximosAgendamentos();
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
        window.notificationManager?.showError('Erro: Formulário não está carregado corretamente. Tente novamente.');
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
        window.notificationManager?.showWarning('WhatsApp inválido! Use apenas números.');
        return;
    }

    // Validar email se fornecido
    if (email && !validarEmail(email)) {
        window.notificationManager?.showWarning('Email inválido!');
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
        window.notificationManager?.showError('Erro: Formulário não está carregado corretamente. Tente novamente.');
        return;
    }

    const nome = nomeElement.value.trim();
    const duracao = parseInt(duracaoElement.value);
    const valor = parseFloat(valorElement.value);
    const descricao = descricaoElement ? descricaoElement.value.trim() : '';
    const ativo = ativoElement.checked;

    if (!nome || !duracao || !valor) {
        window.notificationManager?.showWarning('Nome, duração e valor são obrigatórios!');
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

            // Atualizar interface imediatamente se estiver na página de serviços
            if (window.barbeirosApp.currentPage === 'servicos') {
                console.log('🔄 Atualizando interface imediatamente...');
                // Recarregar dados e atualizar interface
                await window.barbeirosApp.loadServicosData();
                
                // Forçar atualização da tabela de serviços
                setTimeout(() => {
                    if (typeof renderizarServicosTabela === 'function' && window.servicosData) {
                        console.log('🔄 Forçando atualização da tabela de serviços...');
                        renderizarServicosTabela(window.servicosData);
                    }
                }, 200);
            } else {
                // Recarregar dados em background
                console.log('🔄 Recarregando dados em background...');
                setTimeout(() => {
                    window.barbeirosApp.loadServicosData();
                }, 100);
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

function excluirServico(id) {
    console.log('🔍 Função excluirServico chamada para ID:', id);
    console.log('🔍 Tipo do ID:', typeof id);
    console.log('🔍 Valor do ID:', id);
    
    // Verificar se o ID é válido
    if (!id || isNaN(id)) {
        console.error('❌ ID inválido:', id);
        alert('Erro: ID do serviço inválido');
        return;
    }
    
    // Usar confirm nativo - deve ser síncrono para garantir que aguarde a confirmação
    if (!confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
        console.log('❌ Exclusão cancelada pelo usuário');
        return;
    }
    
    console.log('✅ Exclusão confirmada pelo usuário, prosseguindo...');
    
    // Executar exclusão de forma assíncrona APÓS a confirmação
    executarExclusao(id);
}

async function executarExclusao(id) {
    console.log('Excluir serviço:', id);

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/servicos/${id}`, {
            method: 'DELETE'
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Serviço excluído com sucesso!');
            
            // Remover o serviço da interface imediatamente (tanto tabela quanto cards)
            const servicoRow = document.querySelector(`tr[data-servico-id="${id}"]`);
            const servicoCard = document.querySelector(`.servico-card[data-servico-id="${id}"]`);
            
            if (servicoRow) {
                // Remoção instantânea da tabela com animação
                servicoRow.classList.add('removing');
                setTimeout(() => {
                    servicoRow.remove();
                }, 200);
            }
            
            if (servicoCard) {
                // Remoção instantânea dos cards com animação
                servicoCard.classList.add('removing');
                setTimeout(() => {
                    servicoCard.remove();
                    // Reorganizar cards após remoção
                    reorganizarCards();
                }, 200);
            }
            
            // Atualizar dados globais imediatamente
            if (window.servicosData) {
                window.servicosData = window.servicosData.filter(s => s.id_servico != id);
                
                // Atualizar métricas
                if (typeof atualizarMetricasServicos === 'function') {
                    atualizarMetricasServicos(window.servicosData);
                }
                
                // Atualizar contador
                const contador = document.getElementById('contador-servicos');
                if (contador) {
                    contador.textContent = window.servicosData.length;
                }
            }
            
            // Verificar se precisa mostrar estado vazio
            setTimeout(() => {
                const tbody = document.getElementById('servicos-table-body');
                const cardsContainer = document.getElementById('servicos-cards-container');
                
                if (servicosViewMode === 'table' && tbody && tbody.children.length === 0) {
                    const emptyState = document.getElementById('servicos-empty-table');
                    if (emptyState) emptyState.style.display = 'block';
                } else if (servicosViewMode === 'cards' && cardsContainer && cardsContainer.children.length === 0) {
                    const emptyState = document.getElementById('servicos-empty-cards');
                    if (emptyState) emptyState.style.display = 'block';
                }
            }, 250);
            
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao excluir serviço');
        }
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        window.barbeirosApp.showError('Erro de conexão');
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
    const confirmed = await window.notificationManager?.confirmDelete('este cliente');
    if (!confirmed) {
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
    const confirmed = await window.notificationManager?.confirmDelete('este usuário');
    if (!confirmed) {
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
        window.notificationManager?.showError('Erro: Formulário não está carregado corretamente. Tente novamente.');
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

        // Recarregar horários quando a data mudar
        if (dataElement) {
            dataElement.addEventListener('change', carregarHorariosSelect);
        }
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
    const confirmed = await window.notificationManager?.confirmCancel('este agendamento');
    if (!confirmed) {
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
let servicosViewMode = localStorage.getItem('servicosViewMode') || 'cards'; // 'table' ou 'cards'
let clientesData = []; // Cache dos dados dos clientes
let agendaData = []; // Cache dos dados dos agendamentos
let usuariosData = []; // Cache dos dados dos usuários

// === FUNÇÕES ESPECÍFICAS PARA PÁGINA DE SERVIÇOS ===

// Reorganizar cards após exclusão para evitar espaços vazios
function reorganizarCards() {
    if (servicosViewMode === 'cards' && window.servicosData) {
        console.log('🔄 Reorganizando cards após exclusão...');
        
        const container = document.getElementById('servicos-cards-container');
        if (!container) return;
        
        // Adicionar efeito visual de reorganização nos cards existentes
        const existingCards = container.querySelectorAll('.servico-card');
        existingCards.forEach(card => {
            card.classList.add('reorganizing');
        });
        
        // Pequeno delay para permitir que a animação de remoção termine
        setTimeout(() => {
            // Re-renderizar cards com os dados atualizados
            renderizarServicosCards(window.servicosData);
            
            // Remover efeito de reorganização após renderização
            setTimeout(() => {
                const newCards = container.querySelectorAll('.servico-card');
                newCards.forEach(card => {
                    card.classList.remove('reorganizing');
                });
            }, 100);
        }, 100);
    }
}

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
        <tr data-servico-id="${servico.id_servico}">
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
            <div class="servico-card" data-servico-id="${servico.id_servico}">
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
    if (typeof ordenarServicos === 'function') {
        ordenarServicos(filtered, true);
    }

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
    
    if (!servicos || servicos.length === 0) {
        console.warn('Nenhum serviço para ordenar');
        return;
    }
    
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

    if (servicosViewMode === 'cards') {
        servicosViewMode = 'table';
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        btnToggle.innerHTML = '<i class="bi bi-grid me-1"></i>Grade';
    } else {
        servicosViewMode = 'cards';
        tableView.style.display = 'none';
        cardsView.style.display = 'block';
        btnToggle.innerHTML = '<i class="bi bi-list me-1"></i>Tabela';
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

// Importar serviços em massa via JSON
function importarServicos() {
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
                    window.barbeirosApp.showError('Arquivo não contém serviços válidos');
                    return;
                }
                const resp = await window.barbeirosApp.apiRequest('/api/servicos/import', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (resp && resp.success) {
                    window.barbeirosApp.showSuccess(`Importação concluída: ${resp.data?.inseridos || 0} inseridos, ${resp.data?.atualizados || 0} atualizados, ${resp.data?.ignorados || 0} ignorados`);
                    // Recarregar lista de serviços
                    if (window.barbeirosApp && typeof window.barbeirosApp.loadServicosData === 'function') {
                        window.barbeirosApp.loadServicosData();
                    }
                } else {
                    window.barbeirosApp.showError(resp?.message || 'Falha ao importar serviços');
                }
            } catch (err) {
                console.error('Erro ao processar arquivo de serviços:', err);
                window.barbeirosApp.showError('Arquivo JSON inválido');
            }
        };
        reader.readAsText(file);
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
            // console.log('✅ Serviços carregados:', servicosData.length, 'itens'); // Otimizado - log removido

            // Atualizar métricas (sempre)
            if (typeof atualizarMetricasServicos === 'function') {
                atualizarMetricasServicos(servicosData);
            }

            // Renderizar serviços se os elementos existirem
            if (tableContainer || cardsContainer) {
                // console.log('📄 Renderizando interface de serviços...'); // Otimizado - log removido
                if (servicosViewMode === 'table' && tableContainer) {
                    renderizarServicosTabela(servicosData);
                } else if (cardsContainer) {
                    renderizarServicosCards(servicosData);
                }

                // Aplicar filtros iniciais
                if (typeof filtrarServicos === 'function') {
                    filtrarServicos();
                }
                // console.log('✅ Interface de serviços atualizada'); // Otimizado - log removido
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
        // console.log('Dados de autenticação encontrados no localStorage, verificando validade...'); // Otimizado - log removido
        
        // Se há token, verificar se é válido
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const now = Math.floor(Date.now() / 1000);
                    
                    // Se o token expirou, limpar
                    if (payload.exp && payload.exp < now) {
                        console.log('Token expirado, limpando dados de autenticação');
                        localStorage.removeItem('barbeiros-token');
                        localStorage.removeItem('barbeiros-user');
                    }
                    // Remover verificação muito restritiva de userId/tenantId
                    // O token será validado adequadamente pela aplicação principal
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

// Funções de ação para agendamentos - OTIMIZADAS PARA MOBILE
function editarAgendamento(id) {
    console.log('✏️ Editando agendamento:', id);
    // Implementar edição de agendamento
    alert('Funcionalidade de edição será implementada em breve!');
}

function reagendarAgendamento(id) {
    console.log('🔄 Reagendando agendamento:', id);
    // Implementar reagendamento
    alert('Funcionalidade de reagendamento será implementada em breve!');
}

function cancelarAgendamento(id) {
    console.log('❌ Cancelando agendamento:', id);
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
        // Implementar cancelamento
        alert('Funcionalidade de cancelamento será implementada em breve!');
    }
}

async function concluirAgendamento(id) {
    console.log('✅ Concluindo agendamento:', id);
    if (!confirm('Tem certeza que deseja marcar este agendamento como concluído?')) {
        return;
    }

    try {
        const response = await window.barbeirosApp.apiRequest(`/api/agendamentos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' })
        });

        if (response.success) {
            window.barbeirosApp.showSuccess('Agendamento marcado como concluído!');
            // Recarregar dados do dashboard
            if (window.dashboardManager) {
                window.dashboardManager.loadDashboardData();
            }
            // Recarregar agenda se estiver aberta
            if (window.agendaPage) {
                window.agendaPage.load(true);
            }
        } else {
            window.barbeirosApp.showError(response.message || 'Erro ao concluir agendamento');
        }
    } catch (error) {
        console.error('Erro ao concluir agendamento:', error);
        window.barbeirosApp.showError('Erro de conexão');
    }
}

function deletarAgendamento(id) {
    console.log('🗑️ Deletando agendamento:', id);
    if (confirm('Tem certeza que deseja deletar este agendamento? Esta ação não pode ser desfeita.')) {
        // Implementar deleção
        alert('Funcionalidade de deleção será implementada em breve!');
    }
}

// Função global para filtrar agenda por status
function filtrarAgendaPorStatus(status) {
    if (window.app) {
        window.app.filtrarAgendaPorStatus(status);
    }
}

// Função para ordenar serviços
function ordenarServicos() {
    const ordenacao = document.getElementById('servico-ordenacao')?.value || 'nome';
    console.log('Ordenando serviços por:', ordenacao);
    
    if (window.barbeirosApp && typeof window.barbeirosApp.ordenarServicos === 'function') {
        window.barbeirosApp.ordenarServicos(ordenacao);
    } else {
        console.warn('Função de ordenação não disponível');
    }
}


// Função para atualizar notificações
function updateNotifications() {
    if (window.notificationSystem && typeof window.notificationSystem.updateNotifications === 'function') {
        window.notificationSystem.updateNotifications();
    } else {
        console.warn('Sistema de notificações não disponível');
    }
}

// Função para limpar todas as notificações
function clearAllNotifications() {
    if (window.notificationSystem && typeof window.notificationSystem.clearAll === 'function') {
        window.notificationSystem.clearAll();
    } else {
        console.warn('Sistema de notificações não disponível');
    }
}

// Polyfill para requestIdleCallback (reduzir FID)
if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(callback) {
        return setTimeout(callback, 1);
    };
}

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Limpar dados de autenticação inválidos antes de inicializar
    clearAuthOnStartup();
    
    // Inicializar router
    window.router = new Router();
    // console.log('🔧 Router inicializado'); // Otimizado - log removido
    
    window.barbeirosApp = new BarbeirosApp();
    
    // Registrar páginas no router
    if (window.router) {
        console.log('🔧 Registrando páginas no router...');
        console.log('  - dashboardPage:', !!window.dashboardPage);
        console.log('  - clientesPage:', !!window.clientesPage);
        console.log('  - servicosPage:', !!window.servicosPage);
        console.log('  - agendaPage:', !!window.agendaPage);
        console.log('  - usuariosPage:', !!window.usuariosPage);
        console.log('  - configuracoesPage:', !!window.configuracoesPage);
        
        if (window.configuracoesPage) {
            console.log('  - configuracoesPage.load:', typeof window.configuracoesPage.load);
        }
        
        // Registrar páginas disponíveis
        if (window.dashboardPage) {
            window.router.registerPage('dashboard', window.dashboardPage);
        } else {
            console.warn('⚠️ dashboardPage não está disponível, será carregado sob demanda');
        }
        if (window.clientesPage) {
            window.router.registerPage('clientes', window.clientesPage);
        }
        if (window.servicosPage) {
            window.router.registerPage('servicos', window.servicosPage);
        } else {
            console.warn('⚠️ servicosPage não está disponível, será carregado sob demanda');
        }
        if (window.agendaPage) {
            window.router.registerPage('agenda', window.agendaPage);
        }
        if (window.usuariosPage) {
            window.router.registerPage('usuarios', window.usuariosPage);
        }
        if (window.configuracoesPage) {
            window.router.registerPage('configuracoes', window.configuracoesPage);
        }
        
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

            // Aguardar a aplicação estar totalmente inicializada
            let attempts = 0;
            while (!window.barbeirosApp || !window.barbeirosApp.token) {
                if (attempts > 50) { // 5 segundos máximo
                    console.error('❌ Timeout aguardando inicialização da aplicação');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            console.log('✅ Aplicação inicializada, configurando auto-confirm');

            // Carregar estado atual da configuração
            try {
                const cfg = await window.barbeirosApp.apiRequest('/api/agendamentos/auto-confirm-status');
                if (cfg && cfg.success && cfg.data) {
                    topSwitch.checked = !!cfg.data.auto_confirm_whatsapp;
                }
            } catch (e) {
                console.warn('Não foi possível carregar auto_confirm_whatsapp:', e);
            }

            // Alteração de estado
            topSwitch.addEventListener('change', async (ev) => {
                const desired = !!ev.target.checked;
                console.log('🔄 Alterando auto-confirm para:', desired);
                
                // Verificar se a aplicação está inicializada
                if (!window.barbeirosApp) {
                    console.error('❌ Aplicação não inicializada');
                    ev.target.checked = !desired; // reverter UI
                    return;
                }
                
                // Verificar se o token está presente
                const token = window.barbeirosApp.token || localStorage.getItem('barbeiros-token');
                console.log('🔑 Token atual:', token ? 'Presente' : 'Ausente');
                console.log('🔑 Token completo:', token ? token.substring(0, 50) + '...' : 'null');
                
                if (!token || token === 'null' || token === 'undefined') {
                    console.error('❌ Token não encontrado, redirecionando para login');
                    window.location.href = 'pages/login.html';
                    return;
                }
                
                try {
                    const response = await window.barbeirosApp.apiRequest('/api/agendamentos/auto-confirm', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ativo: desired })
                    });
                    
                    console.log('✅ Resposta do auto-confirm:', response);
                    
                    if (window.barbeirosApp?.showSuccess) {
                        window.barbeirosApp.showSuccess(`Auto-agendamento ${desired ? 'ativado' : 'desativado'}`);
                    }
                } catch (err) {
                    console.error('❌ Falha ao salvar auto_confirm_whatsapp:', err);
                    ev.target.checked = !desired; // reverter UI
                    if (window.barbeirosApp?.showError) {
                        window.barbeirosApp.showError('Erro ao alterar configuração: ' + (err.message || 'Erro desconhecido'));
                    }
                }
            });
        } catch (_) {}
    })();
});
