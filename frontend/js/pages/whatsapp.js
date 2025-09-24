// Página WhatsApp - Gerenciamento de Bot Multi-Tenant
// console.log('🔧 whatsapp.js carregado'); // Otimizado - log removido

class WhatsAppPage {
    constructor() {
        this.api = window.barbeirosApp?.api || window.ApiClient;
        this.currentTenant = null;
        this.connectionStatus = 'disconnected';
        this.qrCodeData = null;
        this.statusCheckInterval = null;
        this.messageCheckInterval = null;
        this.currentMethod = 'qr';
        this.pairingCode = null;
        this.pairingCodeGenerated = false;
        this.hasRendered = false;
        this.isFetchingStatus = false;
        this.isConnectingAction = false;

        // Cache para status
        this.statusCache = new Map();
        this.cacheTimeout = 2000; // 2 segundos
        this.lastStatusCheck = 0;
        this.statusCheckDebounce = 1000; // 1 segundo de debounce

        // Usar o mesmo token do sistema principal
        this.token = localStorage.getItem('barbeiros-token');
    }

    // Método principal de carregamento da página
    async load() {
        console.log('🚀 WhatsAppPage.load() chamado');
        console.log('🔍 Verificando API disponível...');
        console.log('window.barbeirosApp:', window.barbeirosApp);
        console.log('window.ApiClient:', window.ApiClient);
        console.log('this.api:', this.api);

        // Verificar se a API está disponível
        if (!this.api) {
            console.error('❌ API não disponível, aguardando...');
            // Tentar novamente em 1 segundo (máximo 5 tentativas)
            if (!this.loadAttempts) this.loadAttempts = 0;
            this.loadAttempts++;
            
            if (this.loadAttempts <= 5) {
                setTimeout(() => this.load(), 1000);
            } else {
                console.error('❌ Máximo de tentativas atingido. API não disponível.');
                this.showAPIError();
            }
            return;
        }

        // Resetar contador de tentativas se API estiver disponível
        this.loadAttempts = 0;

        // Verificar autenticação primeiro
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            console.error('❌ Token não encontrado');
            this.showAuthError();
            return;
        }

        console.log('✅ API e token OK, renderizando página...');
        if (!this.hasRendered) {
            this.renderPage();
            this.setupEventListeners();
            this.hasRendered = true;
        }
        this.startStatusUpdates();
        // Atualiza o status imediatamente
        this.updateConnectionStatus();
        console.log('✅ Página WhatsApp carregada com sucesso!');
    }

    // Mostrar erro de autenticação
    showAuthError() {
        const content = document.getElementById('whatsapp-content');
        if (content) {
            content.innerHTML = `
                <div class="alert alert-warning">
                    <h4><i class="fas fa-exclamation-triangle me-2"></i>Acesso Negado</h4>
                    <p>Você precisa estar logado para acessar o sistema WhatsApp.</p>
                    <p><a href="../pages/login.html" class="btn btn-primary">Fazer Login</a></p>
                </div>
            `;
        }
    }

    // Mostrar erro de API não disponível
    showAPIError() {
        const content = document.getElementById('whatsapp-content');
        if (content) {
            content.innerHTML = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle me-2"></i>API Não Disponível</h4>
                    <p>O serviço WhatsApp não está respondendo. Verifique se o servidor está rodando.</p>
                    <p><button onclick="window.whatsappPage && window.whatsappPage.updateConnectionStatus()" class="btn btn-primary">Tentar Novamente</button></p>
                </div>
            `;
        }
    }

    // Renderizar o conteúdo da página
    renderPage() {
        console.log('🎨 WhatsAppPage.renderPage() chamado');
        const content = document.getElementById('whatsapp-content');
        if (!content) {
            console.error('❌ Elemento whatsapp-content não encontrado!');
            return;
        }
        console.log('✅ Elemento whatsapp-content encontrado, renderizando...');

        content.innerHTML = `
            <div class="whatsapp-container">
                <!-- Alertas -->
                <div id="whatsapp-alert-success" class="alert alert-success" style="display: none;"></div>
                <div id="whatsapp-alert-error" class="alert alert-danger" style="display: none;"></div>
                <div id="whatsapp-alert-info" class="alert alert-info" style="display: none;"></div>

                <!-- Seletor de Tenant -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <label for="tenantSelect" class="form-label">Selecionar Tenant:</label>
                        <select id="tenantSelect" class="form-select">
                            <option value="">Carregando tenants...</option>
                        </select>
                    </div>
                    <div class="col-md-6 d-flex align-items-end">
                        <button id="btnRefreshTenants" class="btn btn-outline-primary">
                            <i class="bi bi-arrow-clockwise"></i> Atualizar
                        </button>
                    </div>
                </div>

                <!-- Método de Conexão -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-cog me-2"></i>
                            Método de Conexão
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="connection-method d-flex gap-3 mb-3">
                            <div class="method-option active" data-method="qr" style="flex: 1; padding: 1rem; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s ease;">
                                <strong>📱 QR Code</strong>
                                <br>
                                <small>Escaneie com seu celular</small>
                            </div>
                            <div class="method-option" data-method="pairing" style="flex: 1; padding: 1rem; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s ease;">
                                <strong>🔢 Código de Pareamento</strong>
                                <br>
                                <small>Digite o código no WhatsApp</small>
                            </div>
                        </div>
                        
                        <div id="phoneGroup" style="display: none;">
                            <label for="phoneNumber" class="form-label">Número de Telefone:</label>
                            <input type="tel" id="phoneNumber" class="form-control" placeholder="5511999999999" pattern="[0-9]{10,15}">
                            <div class="form-text">
                                Formato: Apenas números (ex: 5511999999999 para Brasil)
                            </div>
                            <button id="btnGeneratePairing" class="btn btn-info mt-2">
                                <i class="fas fa-key"></i> Gerar Código de Pareamento
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Status da Conexão -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fab fa-whatsapp me-2"></i>
                            Status da Conexão
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="connectionStatus" class="mb-3">
                            <span id="statusIcon" class="status-indicator">
                                <i class="fas fa-circle text-secondary"></i>
                            </span>
                            <span id="statusText">Verificando...</span>
                        </div>

                        <div id="connectionInfo" class="connection-details" style="display: none;">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Usuário:</strong> <span id="userName">N/A</span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Telefone:</strong> <span id="userPhone">N/A</span>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-6">
                                    <strong>Última atividade:</strong> <span id="lastActivity">N/A</span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Status:</strong> <span id="connectionState">Desconectado</span>
                                </div>
                            </div>
                        </div>

                        <div class="control-buttons mt-3">
                            <button id="btnConnect" class="btn btn-success me-2">
                                <i class="fas fa-plug"></i> Conectar
                            </button>
                            <button id="btnDisconnect" class="btn btn-danger me-2" style="display: none;">
                                <i class="fas fa-power-off"></i> Desconectar
                            </button>
                            <button id="btnRestart" class="btn btn-warning me-2" style="display: none;">
                                <i class="fas fa-sync"></i> Reiniciar
                            </button>
                            <button id="btnLogout" class="btn btn-danger" style="display: none;">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>

                <!-- QR Code Section -->
                <div id="qrSection" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-qrcode me-2"></i>
                            QR Code para Conexão
                        </h5>
                    </div>
                    <div class="card-body text-center">
                        <div id="qrCodeContainer" class="qr-code-placeholder mb-3">
                            <div id="qrLoading" class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Carregando...</span>
                                </div>
                                <p class="mt-2">Gerando QR Code...</p>
                            </div>
                            <div id="qrImage" style="display: none;">
                                <img id="qrCodeImg" src="" alt="QR Code WhatsApp" class="img-fluid">
                            </div>
                        </div>
                        <p class="text-muted">
                            <small>Certifique-se de que seu WhatsApp está fechado no navegador antes de escanear.</small>
                        </p>
                    </div>
                </div>

                <!-- Pairing Code Section -->
                <div id="pairingSection" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-key me-2"></i>
                            Código de Pareamento
                        </h5>
                    </div>
                    <div class="card-body text-center">
                        <p>Digite este código no seu WhatsApp para conectar:</p>
                        <div id="pairingCode" class="pairing-code" style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 2px dashed #25d366; color: #25d366;">
                            <div id="pairingPlaceholder">
                                <i class="fas fa-spinner fa-spin"></i><br>
                                Gerando código...
                            </div>
                        </div>
                        <p><small>⏰ Válido por 2 minutos</small></p>
                        <div class="mt-3">
                            <button id="btnConfirmPairing" class="btn btn-success" style="display: none;">
                                <i class="fas fa-check"></i> Confirmar e Exibir Código
                            </button>
                            <button id="btnCancelPairing" class="btn btn-secondary" style="display: none;">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Instruções -->
                <div id="instructions" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h5 class="mb-0">📋 Instruções</h5>
                    </div>
                    <div class="card-body">
                        <ol id="instructionList"></ol>
                    </div>
                </div>

                <!-- Estatísticas -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-primary" id="statMessages">0</h3>
                                <p class="text-muted mb-0">Mensagens Hoje</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-success" id="statBookings">0</h3>
                                <p class="text-muted mb-0">Agendamentos</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-info" id="statActive">0</h3>
                                <p class="text-muted mb-0">Conversas Ativas</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-warning" id="statUptime">0h</h3>
                                <p class="text-muted mb-0">Tempo Online</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mensagens Recentes -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-comments me-2"></i>
                            Mensagens Recentes
                        </h5>
                    </div>
                    <div class="card-body">
                                <!-- Número de teste -->
                                <div class="mb-2">
                                    <label for="testNumberInput" class="form-label">Número de teste</label>
                                    <div class="input-group">
                                        <input type="tel" id="testNumberInput" class="form-control" placeholder="+553599825422">
                                        <button id="btnSetTestNumber" class="btn btn-outline-secondary">
                                            <i class="fas fa-check"></i> Usar
                                        </button>
                                    </div>
                                    <small class="text-muted">Será usado ao enviar a mensagem de teste.</small>
                                </div>
                        <!-- Formulário para enviar mensagem -->
                        <div class="mb-3">
                            <div class="input-group">
                                <input type="text" id="messageInput" class="form-control"
                                       placeholder="Digite uma mensagem para testar..." maxlength="1000">
                                <button id="btnSendMessage" class="btn btn-primary">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Lista de mensagens -->
                        <div id="messageList" class="message-list" style="max-height: 300px; overflow-y: auto;">
                            <div class="text-center text-muted">
                                <i class="fas fa-inbox fa-2x mb-2"></i>
                                <p>Nenhuma mensagem recente</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        console.log('✅ HTML renderizado, carregando tenants...');
        // Carregar tenants após renderizar
        this.loadTenants();
        // Preencher número de teste salvo
        try {
            const savedNumber = localStorage.getItem('whatsapp-test-number') || (window?.env && window.env.WHATSAPP_TEST_NUMBER) || '+553599825422';
            const testNumberInput = document.getElementById('testNumberInput');
            if (testNumberInput) testNumberInput.value = savedNumber;
        } catch (_) {}
        console.log('✅ Página WhatsApp renderizada completamente!');
    }

    // Configurar event listeners
    setupEventListeners() {
        // Seletor de tenant
        document.getElementById('tenantSelect')?.addEventListener('change', (e) => {
            const newTenant = e.target.value;
            
            // Limpar cache quando trocar de tenant
            if (this.currentTenant !== newTenant) {
                this.statusCache.clear();
                this.lastStatusCheck = 0;
            }
            
            this.currentTenant = newTenant;
            
            if (this.currentTenant) {
                console.log(`🔄 Tenant selecionado: ${this.currentTenant}`);
                
                // Mostrar loading imediatamente
                this.showLoadingStatus();
                
                // Atualizar status com delay mínimo para evitar spam
                setTimeout(() => {
                    this.updateConnectionStatus();
                    this.loadTenantStats();
                }, 100);
            } else {
                this.resetStatusDisplay();
            }
        });

        // Botão de atualizar tenants
        document.getElementById('btnRefreshTenants')?.addEventListener('click', () => {
            this.loadTenants();
        });

        // Botões de controle
        document.getElementById('btnConnect')?.addEventListener('click', () => this.connect());
        document.getElementById('btnDisconnect')?.addEventListener('click', () => this.disconnect());
        document.getElementById('btnRestart')?.addEventListener('click', () => this.restart());
        document.getElementById('btnLogout')?.addEventListener('click', () => this.logout());

        // Envio de mensagem
        document.getElementById('btnSendMessage')?.addEventListener('click', () => this.sendTestMessage());
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendTestMessage();
            }
        });

        // Definir número de teste
        document.getElementById('btnSetTestNumber')?.addEventListener('click', () => {
            const input = document.getElementById('testNumberInput');
            const value = (input?.value || '').trim();
            if (value) {
                try { localStorage.setItem('whatsapp-test-number', value); } catch (_) {}
                this.showAlert('info', `Número de teste atualizado: ${value}`);
            } else {
                this.showAlert('error', 'Informe um número de teste válido');
            }
        });

        // Método de conexão
        document.querySelectorAll('.method-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.setConnectionMethod(e.currentTarget.dataset.method);
            });
        });

        // Formatação do telefone
        document.getElementById('phoneNumber')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });

        // Botão de gerar pairing code
        document.getElementById('btnGeneratePairing')?.addEventListener('click', () => this.generatePairingCode());
        
        // Botões de confirmação do pairing code
        document.getElementById('btnConfirmPairing')?.addEventListener('click', () => this.confirmPairingCode());
        document.getElementById('btnCancelPairing')?.addEventListener('click', () => this.cancelPairingCode());
    }

    // Carregar lista de tenants
    async loadTenants() {
        try {
            console.log('🔍 Carregando tenants...');
            const response = await this.api.get('/api/whatsapp-v2/instances');
            console.log('📊 Resposta da API:', response);
            
            const instances = response.instances || [];
            console.log('📊 Instâncias extraídas:', instances);
            
            // Converter instâncias para formato esperado
            const tenants = instances.map(instance => ({
                tenantId: instance.tenantId,
                name: instance.tenantName || `Tenant ${instance.tenantId}`,
                status: {
                    isConnected: instance.isConnected,
                    qrCode: instance.qrCode,
                    pairingCode: instance.pairingCode,
                    phoneNumber: instance.phoneNumber,
                    connectionMethod: instance.connectionMethod,
                    lastActivity: instance.lastActivity,
                    connectionState: instance.connectionState,
                    isConnecting: instance.isConnecting
                }
            }));
            console.log('📊 Tenants convertidos:', tenants);

            const select = document.getElementById('tenantSelect');
            select.innerHTML = '<option value="">Selecione um tenant</option>';

            tenants.forEach(tenant => {
                console.log('📊 Adicionando tenant:', tenant);
                const option = document.createElement('option');
                option.value = tenant.tenantId;
                const status = tenant.status?.isConnected ? '🟢 Conectado' : '🔴 Desconectado';
                const name = tenant.name || `Tenant ${tenant.tenantId}`;
                option.textContent = `Tenant ${name}`;
                select.appendChild(option);
            });

            if (tenants.length === 0) {
                select.innerHTML = '<option value="">Nenhum tenant encontrado</option>';
                this.showAlert('info', 'Nenhum tenant encontrado. Configure tenants no sistema para começar.');
            } else {
                console.log(`✅ ${tenants.length} tenants carregados`);
                this.showAlert('success', `${tenants.length} tenant(s) encontrado(s)`);
            }
        } catch (error) {
            console.error('Erro ao carregar tenants:', error);

            if (error.message && error.message.includes('Token')) {
                this.showAlert('error', 'Sua sessão expirou. Faça login novamente.');
                setTimeout(() => {
                    window.location.href = '../pages/login.html';
                }, 3000);
            } else {
                this.showAlert('error', 'Erro ao carregar tenants. Verifique sua conexão.');
            }
        }
    }

    // Atualizar status da conexão com cache e debounce
    async updateConnectionStatus() {
        if (!this.currentTenant) return;
        if (this.isFetchingStatus) return;

        const now = Date.now();
        
        // Debounce: evitar muitas requisições em pouco tempo
        if (now - this.lastStatusCheck < this.statusCheckDebounce) {
            return;
        }
        
        // Verificar cache
        const cacheKey = `status_${this.currentTenant}`;
        const cached = this.statusCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < this.cacheTimeout) {
            console.log('📋 Usando status do cache');
            this.updateStatusDisplay(cached.data);
            return;
        }

        try {
            this.isFetchingStatus = true;
            this.lastStatusCheck = now;
            
            console.log(`🔍 Verificando status do tenant ${this.currentTenant}...`);
            const response = await this.api.get(`/api/whatsapp-v2/instances/${this.currentTenant}/status`);
            
            // Salvar no cache
            this.statusCache.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            this.updateStatusDisplay(response);
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.updateStatusDisplay({ isConnected: false, exists: false });
        } finally {
            this.isFetchingStatus = false;
        }
    }

    // Mostrar status de loading
    showLoadingStatus() {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        
        if (statusIcon && statusText) {
            statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin text-info"></i>';
            statusText.textContent = 'Carregando...';
            statusText.className = 'text-info';
        }
    }

    // Resetar display do status
    resetStatusDisplay() {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const connectionInfo = document.getElementById('connectionInfo');
        const qrSection = document.getElementById('qrSection');
        
        if (statusIcon && statusText) {
            statusIcon.innerHTML = '<i class="fas fa-circle text-secondary"></i>';
            statusText.textContent = 'Selecione um tenant';
            statusText.className = 'text-secondary';
        }
        
        if (connectionInfo) connectionInfo.style.display = 'none';
        if (qrSection) qrSection.style.display = 'none';
        
        this.hideButtons(['connect', 'disconnect', 'restart', 'logout']);
    }

    // Atualizar exibição do status
    updateStatusDisplay(status) {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const connectionInfo = document.getElementById('connectionInfo');
        const qrSection = document.getElementById('qrSection');

        console.log('🔄 Atualizando display do status:', {
            isConnected: status.isConnected,
            exists: status.exists,
            isConnecting: status.isConnecting
        });

        if (status.isConnected) {
            statusIcon.innerHTML = '<i class="fas fa-circle text-success"></i>';
            statusText.textContent = 'Conectado';
            statusText.className = 'text-success';

            // Mostrar botões apropriados
            this.showButtons(['disconnect', 'restart', 'logout']);
            this.hideButtons(['connect']);

            // Mostrar informações da conexão
            connectionInfo.style.display = 'block';
            document.getElementById('userName').textContent = status.user?.name || 'N/A';
            document.getElementById('userPhone').textContent = status.phoneNumber || 'N/A';
            document.getElementById('lastActivity').textContent = status.lastActivity ? new Date(status.lastActivity).toLocaleString('pt-BR') : 'N/A';
            document.getElementById('connectionState').textContent = 'Conectado';

            // Esconder QR code
            qrSection.style.display = 'none';

        } else if (status.isConnecting) {
            statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin text-warning"></i>';
            statusText.textContent = 'Conectando...';
            statusText.className = 'text-warning';
            
            // Mostrar botão conectar para permitir nova tentativa se necessário
            this.showButtons(['connect']);
            this.hideButtons(['disconnect', 'restart', 'logout']);
            
            // Esconder informações da conexão
            connectionInfo.style.display = 'none';
            
            // Mostrar QR code se disponível
            if (status.qrCode || status.pairingCode) {
                qrSection.style.display = 'block';
                this.showQRCode(status.qrCode || status.pairingCode);
            }

        } else {
            statusIcon.innerHTML = '<i class="fas fa-circle text-danger"></i>';
            statusText.textContent = 'Desconectado';
            statusText.className = 'text-danger';

            // Mostrar botão conectar
            this.showButtons(['connect']);
            this.hideButtons(['disconnect', 'restart', 'logout']);

            // Esconder informações da conexão
            connectionInfo.style.display = 'none';

            if (status.qrCode || status.pairingCode) {
                qrSection.style.display = 'block';
                this.showQRCode();
            }
        }
    }

    // Mostrar botões específicos
    showButtons(buttonNames) {
        buttonNames.forEach(name => {
            const btn = document.getElementById(`btn${name.charAt(0).toUpperCase() + name.slice(1)}`);
            if (btn) btn.style.display = 'inline-block';
        });
    }

    // Esconder botões específicos
    hideButtons(buttonNames) {
        buttonNames.forEach(name => {
            const btn = document.getElementById(`btn${name.charAt(0).toUpperCase() + name.slice(1)}`);
            if (btn) btn.style.display = 'none';
        });
    }

    // Conectar tenant
    async connect() {
        if (!this.currentTenant) {
            this.showAlert('error', 'Selecione um tenant primeiro');
            return;
        }

        try {
            console.log(`🔌 Conectando tenant ${this.currentTenant}...`);
            if (this.isConnectingAction) {
                console.log('⏳ Conexão já em andamento (frontend), ignorando clique duplicado.');
                return;
            }
            this.isConnectingAction = true;
            this.setButtonLoading('btnConnect', true);

            const requestBody = {
                connectionMethod: this.currentMethod
            };

            if (this.currentMethod === 'pairing') {
                const phoneNumber = document.getElementById('phoneNumber').value;
                if (!phoneNumber) {
                    this.showAlert('error', 'Número de telefone é obrigatório para código de pareamento');
                    return;
                }
                requestBody.phoneNumber = phoneNumber;
            }

            console.log(`📡 Fazendo requisição para /api/whatsapp-v2/instances/${this.currentTenant}/connect`);
            console.log('📦 Request body:', requestBody);
            
            // Adicionar timeout de 30 segundos
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: Requisição demorou mais de 30 segundos')), 30000)
            );
            
            const response = await Promise.race([
                this.api.post(`/api/whatsapp-v2/instances/${this.currentTenant}/connect`, requestBody),
                timeoutPromise
            ]);
            
            console.log('📊 Resposta de inicialização:', response);

            const errMsg = response?.message || response?.error;
            if (response.success) {
                this.showAlert('success', 'Conexão iniciada! Aguardando...');
                console.log('✅ Conexão inicializada, iniciando geração...');

                if (this.currentMethod === 'qr') {
                    document.getElementById('qrSection').style.display = 'block';
                    document.getElementById('pairingSection').style.display = 'none';
                    this.showQRCode();
                } else {
                    document.getElementById('qrSection').style.display = 'none';
                    document.getElementById('pairingSection').style.display = 'block';
                    this.showPairingCode();
                }
            } else if (errMsg && /conectando/i.test(errMsg)) {
                // Já está conectando — iniciar polling do código mesmo assim
                this.showAlert('info', 'Conexão em andamento. Aguardando código...');
                if (this.currentMethod === 'qr') {
                    document.getElementById('qrSection').style.display = 'block';
                    document.getElementById('pairingSection').style.display = 'none';
                    this.showQRCode();
                } else {
                    document.getElementById('qrSection').style.display = 'none';
                    document.getElementById('pairingSection').style.display = 'block';
                    this.showPairingCode();
                }
            } else {
                console.error('❌ Erro na inicialização:', errMsg);
                this.showAlert('error', errMsg || 'Erro ao inicializar conexão');
            }

        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            this.showAlert('error', 'Erro ao conectar: ' + (error.message || 'Erro desconhecido'));
        } finally {
            this.setButtonLoading('btnConnect', false);
            this.isConnectingAction = false;
        }
    }

    // Desconectar tenant
    async disconnect() {
        if (!this.currentTenant) return;

        try {
            this.setButtonLoading('btnDisconnect', true);

            await this.api.delete(`/api/whatsapp-v2/instances/${this.currentTenant}/disconnect`);

            this.showAlert('success', 'Conexão parada com sucesso');
            this.updateConnectionStatus();

        } catch (error) {
            console.error('Erro ao desconectar:', error);
            this.showAlert('error', 'Erro ao desconectar');
        } finally {
            this.setButtonLoading('btnDisconnect', false);
        }
    }

    // Reiniciar tenant
    async restart() {
        if (!this.currentTenant) return;

        try {
            this.setButtonLoading('btnRestart', true);

            await this.api.delete(`/api/whatsapp-v2/instances/${this.currentTenant}/disconnect`);

            this.showAlert('success', 'Conexão reiniciada com sucesso');
            this.updateConnectionStatus();

        } catch (error) {
            console.error('Erro ao reiniciar:', error);
            this.showAlert('error', 'Erro ao reiniciar conexão');
        } finally {
            this.setButtonLoading('btnRestart', false);
        }
    }

    // Logout tenant
    async logout() {
        if (!this.currentTenant) return;

        if (!confirm('Tem certeza que deseja fazer logout? Isso removerá todos os dados de autenticação.')) {
            return;
        }

        try {
            this.setButtonLoading('btnLogout', true);

            await this.api.delete(`/api/whatsapp-v2/instances/${this.currentTenant}/disconnect`);

            this.showAlert('success', 'Logout realizado com sucesso');
            this.updateConnectionStatus();

        } catch (error) {
            console.error('Erro no logout:', error);
            this.showAlert('error', 'Erro no logout');
        } finally {
            this.setButtonLoading('btnLogout', false);
        }
    }

    // Mostrar QR Code ou Pairing Code usando polling no endpoint /status
    async showQRCode(qrCodeData = null) {
        if (!this.currentTenant) return;

        try {
            console.log(`📱 Exibindo QR Code para tenant ${this.currentTenant}...`);
            
            // Se já temos o QR code, usar diretamente
            if (qrCodeData) {
                console.log('✅ QR Code já disponível, exibindo diretamente');
                this.displayQRCode(qrCodeData);
                return;
            }
            
            // Mostrar loading
            document.getElementById('qrLoading').innerHTML =
                '<i class="fas fa-clock fa-2x text-warning"></i><br><p>Aguardando código de conexão...</p>';
            
            // Iniciar polling para obter código do endpoint /status
            const connectionCode = await this.waitForQRCode(this.currentTenant, 5); // 5 tentativas máximo (15 segundos)
            
            if (connectionCode) {
                console.log('✅ Código de conexão recebido:', connectionCode);
                this.displayQRCode(connectionCode);
            } else {
                console.error('❌ Código de conexão não gerado a tempo');
                document.getElementById('qrLoading').innerHTML =
                    '<i class="fas fa-exclamation-triangle fa-2x text-danger"></i><br><p>Código não gerado a tempo</p>';
                this.showAlert('error', 'Código de conexão não foi gerado. Tente novamente.');
            }

        } catch (error) {
            console.error('❌ Erro ao obter código de conexão:', error);
            document.getElementById('qrLoading').innerHTML =
                '<i class="fas fa-exclamation-triangle fa-2x text-danger"></i><br><p>Erro ao obter código</p>';
            this.showAlert('error', 'Erro ao obter código de conexão: ' + (error.message || 'Erro desconhecido'));
        }
    }

    // Exibir QR Code ou Pairing Code
    displayQRCode(connectionCode) {
        console.log('🎨 Exibindo código de conexão:', connectionCode);
        
        // Verificar se é QR Code (base64) ou Pairing Code (numérico)
        if (connectionCode.startsWith('data:image/') || 
           (connectionCode.length > 100 && /^[A-Za-z0-9+/=]+$/.test(connectionCode))) {
            // É QR Code (base64 ou dados encoded)
            console.log('🎨 QR Code detectado, gerando imagem...');
            this.generateQRCodeImage(connectionCode);
            document.getElementById('qrSection').style.display = 'block';
            document.getElementById('pairingSection').style.display = 'none';
        } else if (/^\d+$/.test(connectionCode) && connectionCode.length >= 4 && connectionCode.length <= 12) {
            // É Pairing Code (numérico com comprimento típico)
            console.log('🔢 Exibindo Pairing Code:', connectionCode);
            this.showPairingCode(connectionCode);
            document.getElementById('qrSection').style.display = 'none';
            document.getElementById('pairingSection').style.display = 'block';
        } else {
            // Formato não reconhecido - tratar como texto
            console.log('📝 Formato não reconhecido, exibindo como texto:', connectionCode);
            this.showPairingCode(connectionCode);
            document.getElementById('qrSection').style.display = 'none';
            document.getElementById('pairingSection').style.display = 'block';
        }
    }

    // Aguardar QR Code ou Pairing Code ficar disponível no endpoint /status
    async waitForQRCode(tenantId, maxAttempts = 5) {
        let attempts = 0;
        let qrCode = null;
        let pairingCode = null;

        console.log(`⏰ Iniciando polling para código de conexão (${maxAttempts} tentativas máx)`);

        while (!qrCode && !pairingCode && attempts < maxAttempts) {
            try {
                console.log(`🔄 Tentativa ${attempts + 1}/${maxAttempts} - Verificando status do tenant ${tenantId}...`);
                const response = await this.api.get(`/api/whatsapp-v2/instances/${tenantId}/status`);
                console.log('📊 Resposta completa do status:', response);

            qrCode = response.qrCode;
            pairingCode = response.pairingCode;
                
                console.log(`📋 qrCode: ${qrCode ? 'Disponível' : 'Null'}, pairingCode: ${pairingCode ? 'Disponível' : 'Null'}`);
                
                if (!qrCode && !pairingCode) {
                    console.log(`⏳ Código ainda não disponível, aguardando 3 segundos... (${attempts + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos
                    attempts++;
                }
            } catch (error) {
                console.error('❌ Erro ao verificar status:', error);
                console.log('📋 Response data:', error.response ? error.response.data : 'N/A');
                
                // Continuar tentando mesmo com erro, a menos que seja erro de autenticação
                if (error.message && error.message.includes('Token')) {
                    throw error;
                }
                
                console.log(`⏳ Aguardando 3 segundos após erro... (${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                attempts++;
            }
        }

        console.log(`✅ Polling finalizado: qrCode=${!!qrCode}, pairingCode=${!!pairingCode}, tentativas=${attempts}`);
        
        // Normalizar retorno
        if (qrCode && typeof qrCode === 'object' && qrCode.data) {
            return qrCode.data;
        }
        if (typeof qrCode === 'string') {
            return qrCode;
        }
        if (pairingCode && typeof pairingCode === 'object' && pairingCode.code) {
            return pairingCode.code;
        }
        return pairingCode || qrCode || null;
    }

    // Gerar imagem do QR code a partir de dados base64 ou raw
    generateQRCodeImage(qrData) {
        console.log('🎨 Gerando imagem do QR Code...');
        console.log('📊 Tipo de dados QR:', typeof qrData);
        console.log('📊 QR Data (primeiros 100 chars):', qrData ? qrData.substring(0, 100) : 'null');
        
        const qrImage = document.createElement('img');
        
        if (qrData && qrData.startsWith('data:image/')) {
            // Usar diretamente o QR Code base64 da nossa API
            qrImage.src = qrData;
            console.log('✅ Usando QR Code base64 da API');
        } else if (qrData && typeof qrData === 'string') {
            // Dados raw do QR - criar data URL
            try {
                // Se for uma string que parece ser dados de QR raw
                if (qrData.length > 100 && !qrData.includes(' ')) {
                    console.log('📊 Dados raw do QR detectados, criando data URL...');
                    // Criar um data URL simples para exibição (pode precisar de ajustes dependendo do formato)
                    qrImage.src = 'data:image/png;base64,' + btoa(qrData);
                } else {
                    // Tentar como texto puro para exibição
                    console.log('📊 Texto do QR detectado, criando imagem alternativa...');
                    qrImage.alt = 'QR Code: ' + qrData;
                    qrImage.style.border = '2px dashed #ccc';
                    qrImage.style.padding = '10px';
                    qrImage.innerHTML = '<div style="text-align:center;color:#666;">QR Code Texto:<br><strong>' + qrData + '</strong></div>';
                }
            } catch (error) {
                console.error('❌ Erro ao processar dados do QR:', error);
                qrImage.src = '';
            }
        } else {
            // Fallback ou tratamento de erro se o formato não for o esperado
            console.error('❌ Formato de QR Code inesperado:', qrData);
            qrImage.src = ''; // Limpar imagem
            qrImage.alt = 'QR Code não disponível';
        }
        
        qrImage.alt = 'QR Code WhatsApp';
        qrImage.className = 'img-fluid';
        qrImage.style.maxWidth = '300px';
        qrImage.style.maxHeight = '300px';

        const qrLoading = document.getElementById('qrLoading');
        const qrImageContainer = document.getElementById('qrImage');

        if (qrLoading) {
            qrLoading.style.display = 'none';
            console.log('✅ Escondendo loading do QR');
        } else {
            console.log('❌ Elemento qrLoading não encontrado');
        }

        if (qrImageContainer) {
            qrImageContainer.innerHTML = ''; // Limpar conteúdo anterior
            qrImageContainer.appendChild(qrImage);
            qrImageContainer.style.display = 'block';
            console.log('✅ QR Code exibido na interface');
        } else {
            console.log('❌ Elemento qrImage não encontrado');
        }
    }

    // Enviar mensagem de teste
    async sendTestMessage() {
        if (!this.currentTenant) {
            this.showAlert('error', 'Selecione um tenant primeiro');
            return;
        }

        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message) {
            this.showAlert('error', 'Digite uma mensagem');
            return;
        }

        try {
            this.setButtonLoading('btnSendMessage', true);

            // Número de teste: localStorage > env > fallback
            let defaultTestNumber = '+553599825422';
            try {
                defaultTestNumber = localStorage.getItem('whatsapp-test-number') || (window?.env && window.env.WHATSAPP_TEST_NUMBER) || defaultTestNumber;
            } catch (_) {}
            await this.api.post(`/api/whatsapp-v2/instances/${this.currentTenant}/send`, {
                to: defaultTestNumber,
                message: message
            });

            this.showAlert('success', 'Mensagem enviada com sucesso');
            messageInput.value = '';

            // Adicionar à lista de mensagens
            this.addMessageToList('Você', message);

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showAlert('error', 'Erro ao enviar mensagem');
        } finally {
            this.setButtonLoading('btnSendMessage', false);
        }
    }

    // Carregar estatísticas do tenant
    async loadTenantStats() {
        if (!this.currentTenant) return;

        try {
            // Por enquanto, usar dados simulados
            document.getElementById('statMessages').textContent = '0';
            document.getElementById('statBookings').textContent = '0';
            document.getElementById('statActive').textContent = '0';
            document.getElementById('statUptime').textContent = '0h';

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Adicionar mensagem à lista
    addMessageToList(from, content) {
        const messageList = document.getElementById('messageList');
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item mb-2 p-2 border rounded';

        messageItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${from}:</strong> ${content}
                </div>
                <small class="text-muted">${new Date().toLocaleTimeString('pt-BR')}</small>
            </div>
        `;

        // Inserir no topo da lista
        messageList.insertBefore(messageItem, messageList.firstChild);

        // Limitar a 10 mensagens
        while (messageList.children.length > 10) {
            messageList.removeChild(messageList.lastChild);
        }

        // Remover mensagem vazia
        const emptyMessage = messageList.querySelector('.text-center');
        if (emptyMessage) {
            emptyMessage.remove();
        }
    }

    // Set button loading state
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const originalContent = button.innerHTML;

        if (loading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
            button.disabled = true;
        } else {
            button.innerHTML = originalContent;
            button.disabled = false;
        }
    }

    // Show alert
    showAlert(type, message) {
        const alertElement = document.getElementById(`whatsapp-alert-${type}`);
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.style.display = 'block';

            // Esconder após 5 segundos
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    }

    // Make API request
    async makeRequest(endpoint, options = {}) {
        // Verificar se há token válido
        if (!this.token || this.token === 'null' || this.token === 'undefined') {
            console.error('Token inválido ou expirado');
            this.showAlert('error', 'Sessão expirada. Faça login novamente.');
            setTimeout(() => {
                window.location.href = '../pages/login.html';
            }, 2000);
            throw new Error('Token inválido');
        }

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        if (finalOptions.body && typeof finalOptions.body === 'object') {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        try {
            const response = await fetch(`/api${endpoint}`, finalOptions);

            // Tratar erros de autenticação
            if (response.status === 401) {
                console.error('Erro 401: Token expirado ou inválido');
                this.showAlert('error', 'Sessão expirada. Faça login novamente.');
                setTimeout(() => {
                    window.location.href = '../pages/login.html';
                }, 2000);
                throw new Error('Token expirado');
            }

            if (response.status === 403) {
                console.error('Erro 403: Acesso negado');
                this.showAlert('error', 'Acesso negado. Você não tem permissão para acessar este recurso.');
                throw new Error('Acesso negado');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(error.message || `Erro ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição API:', error);
            throw error;
        }
    }

    // Start status updates
    startStatusUpdates() {
        if (this.statusCheckInterval) return;
        this.statusCheckInterval = setInterval(() => {
            if (this.currentTenant) {
                this.updateConnectionStatus();
            }
        }, 15000); // Atualizar a cada 15 segundos (reduzido para melhor performance)
    }

    // Stop status updates
    stopStatusUpdates() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    // Cleanup when page is unloaded
    destroy() {
        this.stopStatusUpdates();
    }

    // Definir método de conexão
    setConnectionMethod(method) {
        this.currentMethod = method;
        
        // Atualizar UI
        document.querySelectorAll('.method-option').forEach(option => {
            option.classList.remove('active');
            option.style.borderColor = '#ddd';
            option.style.backgroundColor = '#f8f9fa';
        });
        
        const selectedOption = document.querySelector(`[data-method="${method}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            selectedOption.style.borderColor = '#25d366';
            selectedOption.style.backgroundColor = '#d4edda';
        }

        // Mostrar/ocultar campo de telefone e botão de pairing
        const phoneGroup = document.getElementById('phoneGroup');
        const pairingSection = document.getElementById('pairingSection');
        
        if (method === 'pairing') {
            phoneGroup.style.display = 'block';
            // Esconder QR section se estiver visível
            document.getElementById('qrSection').style.display = 'none';
        } else {
            phoneGroup.style.display = 'none';
            pairingSection.style.display = 'none';
            // Limpar pairing code
            this.pairingCode = null;
            this.pairingCodeGenerated = false;
        }
    }

    // Gerar código de pareamento
    async generatePairingCode() {
        if (!this.currentTenant) {
            this.showAlert('error', 'Selecione um tenant primeiro');
            return;
        }

        const phoneNumber = document.getElementById('phoneNumber').value;
        if (!phoneNumber) {
            this.showAlert('error', 'Digite o número de telefone');
            return;
        }

        if (phoneNumber.length < 10) {
            this.showAlert('error', 'Número de telefone deve ter pelo menos 10 dígitos');
            return;
        }

        try {
            console.log('🔑 Gerando código de pareamento...');
            this.setButtonLoading('btnGeneratePairing', true);

            const response = await this.api.post(`/api/whatsapp-v2/instances/${this.currentTenant}/pairing-code`, {
                phoneNumber: phoneNumber
            });

            if (response.success && response.pairingCode) {
                this.pairingCode = response.pairingCode;
                this.pairingCodeGenerated = true;
                
                // Mostrar botões de confirmação
                document.getElementById('btnConfirmPairing').style.display = 'inline-block';
                document.getElementById('btnCancelPairing').style.display = 'inline-block';
                
                // Mostrar seção de pairing
                document.getElementById('pairingSection').style.display = 'block';
                document.getElementById('qrSection').style.display = 'none';
                
                this.showAlert('info', 'Código gerado! Confirme para exibir.');
            } else {
                this.showAlert('error', 'Erro ao gerar código de pareamento');
            }

        } catch (error) {
            console.error('❌ Erro ao gerar pairing code:', error);
            this.showAlert('error', 'Erro ao gerar código: ' + (error.message || 'Erro desconhecido'));
        } finally {
            this.setButtonLoading('btnGeneratePairing', false);
        }
    }

    // Confirmar e exibir código de pareamento
    confirmPairingCode() {
        if (!this.pairingCode) {
            this.showAlert('error', 'Nenhum código gerado');
            return;
        }

        // Mostrar o código
        document.getElementById('pairingPlaceholder').innerHTML = this.pairingCode.code;
        
        // Esconder botões de confirmação
        document.getElementById('btnConfirmPairing').style.display = 'none';
        document.getElementById('btnCancelPairing').style.display = 'none';
        
        // Mostrar instruções
        this.showInstructions('pairing', this.pairingCode.code);
        
        this.showAlert('success', 'Código exibido! Use-o no WhatsApp.');
    }

    // Cancelar geração de código de pareamento
    cancelPairingCode() {
        this.pairingCode = null;
        this.pairingCodeGenerated = false;
        
        // Esconder seção de pairing
        document.getElementById('pairingSection').style.display = 'none';
        
        // Esconder botões de confirmação
        document.getElementById('btnConfirmPairing').style.display = 'none';
        document.getElementById('btnCancelPairing').style.display = 'none';
        
        // Limpar placeholder
        document.getElementById('pairingPlaceholder').innerHTML = 
            '<i class="fas fa-spinner fa-spin"></i><br>Gerando código...';
        
        this.showAlert('info', 'Geração de código cancelada');
    }

    // Mostrar Pairing Code na interface
    showPairingCode(code) {
        const pairingPlaceholder = document.getElementById('pairingPlaceholder');
        if (pairingPlaceholder) {
            pairingPlaceholder.innerHTML = code;
            pairingPlaceholder.style.fontSize = '2rem';
            pairingPlaceholder.style.fontWeight = 'bold';
            pairingPlaceholder.style.letterSpacing = '0.5rem';
            pairingPlaceholder.style.color = '#25d366';
        }
        
        // Mostrar instruções específicas para pairing code
        this.showInstructions('pairing', code);
    }

    // Mostrar instruções
    showInstructions(method, code = null) {
        const instructions = document.getElementById('instructions');
        const instructionList = document.getElementById('instructionList');

        instructions.style.display = 'block';

        if (method === 'qr') {
            instructionList.innerHTML = `
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Menu</strong> (três pontos) → <strong>Dispositivos conectados</strong></li>
                <li>Toque em <strong>Conectar um dispositivo</strong></li>
                <li>Escaneie o QR Code acima</li>
            `;
        } else if (method === 'pairing') {
            instructionList.innerHTML = `
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Menu</strong> (três pontos) → <strong>Dispositivos conectados</strong></li>
                <li>Toque em <strong>Conectar um dispositivo</strong></li>
                <li>Toque em <strong>Conectar com número de telefone</strong></li>
                <li>Digite o código: <strong>${code}</strong></li>
            `;
        }
    }
}

// Registrar página no router quando estiver disponível
function registerWhatsAppPage() {
    if (window.router) {
        console.log('🔧 Registrando página WhatsApp no router...');
        window.whatsappPage = new WhatsAppPage();
        window.router.registerPage('whatsapp', window.whatsappPage);
        console.log('✅ Página WhatsApp registrada com sucesso');
    } else {
        // Tentar novamente em 100ms se o router não estiver disponível
        setTimeout(registerWhatsAppPage, 100);
    }
}

// Iniciar registro da página
registerWhatsAppPage();
