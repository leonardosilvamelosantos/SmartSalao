// Módulo de Agenda
class AgendaPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load(forceReload = false) {
        console.log('🔄 AgendaPage.load - Verificando cache e carregando dados', forceReload ? '(forçando recarregamento)' : '');
        
        const content = document.getElementById('agenda-content');
        if (!content) return;

        // Se forçar recarregamento, limpar cache e recarregar dados
        if (forceReload) {
            console.log('🔄 Forçando recarregamento - limpando cache e recarregando dados');
            window.agendaData = null;
            
            // Mostrar loading
            content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando agenda...</p></div>';

            try {
                const response = await this.app.apiRequest('/api/agendamentos');
                if (response.success) {
                    this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                    window.agendaData = this.data; // Armazenar em cache global
                    console.log('📊 Dados recarregados da API:', this.data.length, 'agendamentos');
                    this.render();
                } else {
                    content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-calendar-x" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar agenda</p></div>';
                }
            } catch (error) {
                console.error('Erro ao recarregar agenda:', error);
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
            }
            return;
        }

        // Verificar se já temos dados em cache
        if (window.agendaData && Array.isArray(window.agendaData) && window.agendaData.length > 0) {
            console.log('💾 Usando dados do cache:', window.agendaData.length, 'agendamentos');
            this.data = window.agendaData;
            this.render();
            return;
        }

        // Se não há dados em cache, carregar da API
        console.log('📡 Carregando dados da API...');
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando agenda...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/agendamentos');
            if (response.success) {
                this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                window.agendaData = this.data; // Armazenar em cache global
                console.log('📊 Dados carregados da API:', this.data.length, 'agendamentos');
                this.render();
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-calendar-x" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar agenda</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar agenda:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    render() {
        console.log('🎨 AgendaPage.render chamada com', this.data?.length || 0, 'agendamentos');
        const content = document.getElementById('agenda-content');
        
        if (!content) {
            console.error('❌ Elemento agenda-content não encontrado');
            return;
        }
        
        // Atualizar estatísticas
        this.atualizarEstatisticas();
        
        if (!this.data || this.data.length === 0) {
            console.log('📭 Nenhum agendamento para renderizar');
            content.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-calendar-week" style="font-size: 4rem; opacity: 0.3;"></i>
                    <h4 class="mt-3 mb-2">Nenhum agendamento encontrado</h4>
                    <p class="text-muted mb-4">Comece criando seu primeiro agendamento</p>
                    <button class="btn btn-primary btn-lg" onclick="agendaPage.novo()">
                        <i class="bi bi-plus-circle me-2"></i>Criar Primeiro Agendamento
                    </button>
                </div>
            `;
            return;
        }

        const sorted = [...this.data].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        const agendamentosPorData = {};
        sorted.forEach(agendamento => {
            const data = new Date(agendamento.start_at).toLocaleDateString('pt-BR');
            if (!agendamentosPorData[data]) {
                agendamentosPorData[data] = [];
            }
            agendamentosPorData[data].push(agendamento);
        });

        const html = Object.entries(agendamentosPorData).map(([data, agendamentosDoDia]) => `
            <div class="agenda-day mb-4" data-date="${data}">
                <div class="d-flex align-items-center mb-3">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="bi bi-calendar-day"></i>
                    </div>
                    <div>
                        <h5 class="mb-0">${data}</h5>
                        <small class="text-muted">${agendamentosDoDia.length} agendamento(s)</small>
                    </div>
                </div>
                <div class="agenda-items">
                    ${agendamentosDoDia.map(agendamento => `
                        <div class="agenda-item p-3 mb-3 border rounded shadow-sm hover-lift animated-card status-${agendamento.status}" data-agendamento-id="${agendamento.id_agendamento}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex align-items-center flex-grow-1">
                                    <div class="me-3">
                                        <div class="badge bg-${agendamento.status === 'confirmed' ? 'success' : agendamento.status === 'pending' ? 'warning' : 'secondary'} fs-6">
                                            ${agendamento.status === 'confirmed' ? '✅ Confirmado' : agendamento.status === 'pending' ? '⏳ Pendente' : '❌ Cancelado'}
                                        </div>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1 fw-bold">${agendamento.cliente_nome || 'Cliente'}</h6>
                                        <p class="mb-1 text-muted">
                                            <i class="bi bi-scissors me-1"></i>${agendamento.nome_servico || 'Serviço'}
                                        </p>
                                        <div class="d-flex align-items-center text-muted small">
                                            <i class="bi bi-clock me-1"></i>
                                            <span>${new Date(agendamento.start_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                                            ${agendamento.observacoes ? `
                                                <span class="ms-3">
                                                    <i class="bi bi-chat-text me-1"></i>
                                                    ${agendamento.observacoes}
                                                </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <div class="btn-group btn-group-sm">
                                        ${agendamento.status === 'pending' ? `
                                            <button class="btn btn-success" onclick="agendaPage.confirmar(${agendamento.id_agendamento})" title="Confirmar">
                                                <i class="bi bi-check-circle"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-outline-primary" onclick="agendaPage.editar(${agendamento.id_agendamento})" title="Editar">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="agendaPage.reagendar(${agendamento.id_agendamento})" title="Reagendar">
                                            <i class="bi bi-arrow-clockwise"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="agendaPage.cancelar(${agendamento.id_agendamento})" title="Cancelar">
                                            <i class="bi bi-x-circle"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- Botão de lixeira para exclusão -->
                            <button class="btn btn-trash" onclick="agendaPage.excluir(${agendamento.id_agendamento})" title="Excluir Agendamento">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        content.innerHTML = html;
        
        // Aplicar classes de cards animados a todos os cards existentes
        setTimeout(() => {
            const cards = document.querySelectorAll('.agenda-item');
            cards.forEach(card => {
                if (!card.classList.contains('animated-card')) {
                    card.classList.add('animated-card');
                }
                
                // Aplicar classe de status baseada no badge
                const badge = card.querySelector('.badge');
                if (badge) {
                    const badgeText = badge.textContent.toLowerCase();
                    let status = 'pending';
                    
                    if (badgeText.includes('confirmado')) status = 'confirmed';
                    else if (badgeText.includes('cancelado')) status = 'cancelled';
                    else if (badgeText.includes('pendente')) status = 'pending';
                    else if (badgeText.includes('processando')) status = 'processing';
                    
                    // Remover classes de status anteriores
                    card.classList.remove('status-confirmed', 'status-cancelled', 'status-pending', 'status-processing');
                    // Adicionar nova classe de status
                    card.classList.add(`status-${status}`);
                }
            });
            
            // Refresh dos cards animados após render
            if (window.refreshAnimatedCards) {
                window.refreshAnimatedCards();
            }
        }, 100);
    }

    atualizarEstatisticas() {
        if (!this.data) return;
        
        const hoje = new Date().toDateString();
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
        
        const agendamentosHoje = this.data.filter(a => new Date(a.start_at).toDateString() === hoje);
        const agendamentosConfirmados = this.data.filter(a => a.status === 'confirmed');
        const agendamentosPendentes = this.data.filter(a => a.status === 'pending');
        const agendamentosSemana = this.data.filter(a => {
            const data = new Date(a.start_at);
            return data >= inicioSemana && data <= fimSemana;
        });
        
        document.getElementById('agenda-hoje').textContent = agendamentosHoje.length;
        document.getElementById('agenda-confirmados').textContent = agendamentosConfirmados.length;
        document.getElementById('agenda-pendentes').textContent = agendamentosPendentes.length;
        document.getElementById('agenda-semana').textContent = agendamentosSemana.length;
    }

    filtrar() {
        const filters = document.getElementById('agenda-filters');
        filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
    }

    aplicarFiltros() {
        const dataInicial = document.getElementById('filter-data-inicial').value;
        const dataFinal = document.getElementById('filter-data-final').value;
        const status = document.getElementById('filter-status').value;
        
        let dadosFiltrados = [...this.data];
        
        if (dataInicial) {
            dadosFiltrados = dadosFiltrados.filter(a => new Date(a.start_at) >= new Date(dataInicial));
        }
        
        if (dataFinal) {
            dadosFiltrados = dadosFiltrados.filter(a => new Date(a.start_at) <= new Date(dataFinal));
        }
        
        if (status) {
            dadosFiltrados = dadosFiltrados.filter(a => a.status === status);
        }
        
        this.data = dadosFiltrados;
        this.render();
    }

    limparFiltros() {
        document.getElementById('filter-data-inicial').value = '';
        document.getElementById('filter-data-final').value = '';
        document.getElementById('filter-status').value = '';
        
        // Recarregar dados originais
        this.load();
    }

    async confirmar(id) {
        if (confirm('Confirmar este agendamento?')) {
            // Atualização otimista - atualizar UI imediatamente
            this.updateAgendamentoStatus(id, 'confirmed');
            
            try {
                const response = await this.app.apiRequest(`/api/agendamentos/${id}/confirmar`, 'PATCH');
                if (response.success) {
                    this.app.showSuccess('Agendamento confirmado com sucesso!');
                    // Atualizar dados locais
                    this.updateAgendamentoInData(id, { status: 'confirmed' });
                    // Atualizar estatísticas
                    this.atualizarEstatisticas();
                    // Atualizar dashboard se estiver visível
                    this.atualizarDashboard();
                } else {
                    // Reverter mudança em caso de erro
                    this.updateAgendamentoStatus(id, 'pending');
                    this.app.showError(response.message || 'Erro ao confirmar agendamento');
                }
            } catch (error) {
                // Reverter mudança em caso de erro
                this.updateAgendamentoStatus(id, 'pending');
                this.app.showError('Erro ao confirmar agendamento');
            }
        }
    }

    async reagendar(id) {
        const agendamento = this.data.find(a => a.id_agendamento === id);
        if (!agendamento) return;

        const clientes = await this.carregarClientes();
        const servicos = await this.carregarServicos();
        
        this.app.showModal('Reagendar', this.getFormHtml(clientes, servicos, agendamento, true));
        this.configurarSeletorData();
    }

    async novo() {
        const clientes = await this.carregarClientes();
        const servicos = await this.carregarServicos();
        
        this.app.showModal('Novo Agendamento', this.getFormHtml(clientes, servicos));
        
        // Configurar seletor de data
        this.configurarSeletorData();
    }

    async editar(id) {
        const agendamento = this.data.find(a => a.id_agendamento === id);
        if (!agendamento) return;

        const clientes = await this.carregarClientes();
        const servicos = await this.carregarServicos();
        
        this.app.showModal('Editar Agendamento', this.getFormHtml(clientes, servicos, agendamento));
    }

    async carregarClientes() {
        try {
            const response = await this.app.apiRequest('/api/clientes');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            return [];
        }
    }

    async carregarServicos() {
        try {
            const response = await this.app.apiRequest('/api/servicos');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            return [];
        }
    }

    getFormHtml(clientes = [], servicos = [], agendamento = null) {
        const dataAtual = agendamento ? new Date(agendamento.start_at).toISOString().split('T')[0] : '';
        const horaAtual = agendamento ? new Date(agendamento.start_at).toTimeString().substring(0, 5) : '';

        return `
            <form id="agendamentoForm">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="cliente_id" class="form-label">Cliente</label>
                        <select class="form-control" id="cliente_id" name="cliente_id" required>
                            <option value="">Selecione um cliente...</option>
                            ${clientes.map(cliente => `
                                <option value="${cliente.id_cliente}" ${agendamento?.id_cliente === cliente.id_cliente ? 'selected' : ''}>${cliente.nome}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="servico_id" class="form-label">Serviço</label>
                        <select class="form-control" id="servico_id" name="servico_id" required>
                            <option value="">Selecione um serviço...</option>
                            ${servicos.map(servico => `
                                <option value="${servico.id_servico}" ${agendamento?.id_servico === servico.id_servico ? 'selected' : ''}>${servico.nome_servico} - R$ ${servico.valor}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="data_agendamento" class="form-label">Data</label>
                        <input type="date" class="form-control" id="data_agendamento" name="data_agendamento" required value="${dataAtual}">
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
                    <textarea class="form-control" id="observacoes" name="observacoes" rows="3">${agendamento?.observacoes || ''}</textarea>
                </div>
                
                <!-- Botões de Ação -->
                <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button type="button" class="btn btn-outline-secondary" onclick="window.barbeirosApp.closeModal()">
                        <i class="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="agendaPage.salvar()">
                        <i class="bi bi-calendar-check me-1"></i>${agendamento ? 'Atualizar' : 'Agendar'}
                    </button>
                </div>
            </form>
        `;
    }

    async salvar() {
        const form = document.getElementById('agendamentoForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!data.cliente_id || !data.servico_id || !data.data_agendamento || !data.hora_agendamento) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        const start_at = `${data.data_agendamento}T${data.hora_agendamento}:00`;

        const payload = {
            id_cliente: parseInt(data.cliente_id),
            id_servico: parseInt(data.servico_id),
            start_at: start_at,
            observacoes: data.observacoes
        };

        try {
            const response = await this.app.apiRequest('/api/agendamentos', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                this.app.showSuccess('Agendamento salvo com sucesso!');
                this.app.closeModal();
                
                // Adicionar novo agendamento aos dados locais
                if (response.data) {
                    this.data.push(response.data);
                    // Atualizar estatísticas
                    this.atualizarEstatisticas();
                    // Atualizar dashboard se estiver visível
                    this.atualizarDashboard();
                    // Recarregar apenas a interface sem fazer nova requisição
                    this.render();
                } else {
                    // Fallback: recarregar dados completos
                    this.load();
                }
            } else {
                this.app.showError(response.message || 'Erro ao salvar agendamento');
            }
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            this.app.showError('Erro de conexão');
        }
    }

    async cancelar(id) {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

        // Atualização otimista - atualizar UI imediatamente
        this.updateAgendamentoStatus(id, 'cancelled');

        try {
            const response = await this.app.apiRequest(`/api/agendamentos/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.app.showSuccess('Agendamento cancelado com sucesso!');
                // Remover agendamento dos dados locais
                this.removeAgendamentoFromData(id);
                // Atualizar estatísticas
                this.atualizarEstatisticas();
                // Atualizar dashboard se estiver visível
                this.atualizarDashboard();
            } else {
                // Reverter mudança em caso de erro
                this.updateAgendamentoStatus(id, 'pending');
                this.app.showError(response.message || 'Erro ao cancelar agendamento');
            }
        } catch (error) {
            // Reverter mudança em caso de erro
            this.updateAgendamentoStatus(id, 'pending');
            console.error('Erro ao cancelar agendamento:', error);
            this.app.showError('Erro de conexão');
        }
    }

    async excluir(id) {
        if (!confirm('⚠️ ATENÇÃO: Esta ação é irreversível!\n\nTem certeza que deseja EXCLUIR permanentemente este agendamento?')) return;

        try {
            const response = await this.app.apiRequest(`/api/agendamentos/${id}/permanent`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.app.showSuccess('Agendamento excluído permanentemente!');
                // Remover agendamento dos dados locais
                this.removeAgendamentoFromData(id);
                // Atualizar estatísticas
                this.atualizarEstatisticas();
                // Atualizar dashboard se estiver visível
                this.atualizarDashboard();
            } else {
                this.app.showError(response.message || 'Erro ao excluir agendamento');
            }
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            this.app.showError('Erro de conexão');
        }
    }

    // Atualizar status do agendamento na UI imediatamente
    updateAgendamentoStatus(id, status) {
        const agendamentoElement = document.querySelector(`[data-agendamento-id="${id}"]`);
        if (agendamentoElement) {
            // Garantir que o card tenha a classe animated-card
            if (!agendamentoElement.classList.contains('animated-card')) {
                agendamentoElement.classList.add('animated-card');
            }
            
            // Remover classes de status anteriores
            agendamentoElement.classList.remove('status-confirmed', 'status-cancelled', 'status-pending', 'status-processing');
            
            // Adicionar nova classe de status
            agendamentoElement.classList.add(`status-${status}`);
            
            const statusBadge = agendamentoElement.querySelector('.badge');
            if (statusBadge) {
                // Atualizar classe e texto do badge
                statusBadge.className = `badge ${this.getStatusClass(status)}`;
                statusBadge.textContent = this.getStatusText(status);
            }
            
            // Usar sistema de cards animados se disponível
            if (window.animateCardStatus) {
                window.animateCardStatus(id, status, 'pulse');
            }
        }
    }

    // Atualizar dados locais do agendamento
    updateAgendamentoInData(id, updates) {
        const agendamento = this.data.find(a => a.id_agendamento === id);
        if (agendamento) {
            Object.assign(agendamento, updates);
        }
    }

    // Remover agendamento dos dados locais
    removeAgendamentoFromData(id) {
        // Encontrar o agendamento antes de removê-lo para obter a data
        const agendamentoRemovido = this.data.find(a => a.id_agendamento === id);
        
        // Remover dos dados
        this.data = this.data.filter(a => a.id_agendamento !== id);
        
        // Remover elemento da UI
        const agendamentoElement = document.querySelector(`[data-agendamento-id="${id}"]`);
        if (agendamentoElement) {
            agendamentoElement.remove();
        }
        
        // Verificar se a data ficou vazia e remover a seção da data se necessário
        if (agendamentoRemovido) {
            const dataObj = new Date(agendamentoRemovido.start_at);
            const data = dataObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            
            // Contar quantos agendamentos restam para esta data
            const agendamentosRestantes = this.data.filter(a => {
                const agendamentoData = new Date(a.start_at);
                const agendamentoDataStr = agendamentoData.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                return agendamentoDataStr === data;
            });
            
            // Se não há mais agendamentos para esta data, remover a seção da data
            if (agendamentosRestantes.length === 0) {
                const dataSection = document.querySelector(`[data-date="${data}"]`);
                if (dataSection) {
                    console.log(`🗑️ Removendo seção da data vazia: ${data}`);
                    dataSection.remove();
                }
            }
        }
    }

    // Obter classe CSS para status
    getStatusClass(status) {
        const statusClasses = {
            'pending': 'bg-warning',
            'confirmed': 'bg-success',
            'completed': 'bg-primary',
            'cancelled': 'bg-danger'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    // Obter texto para status
    getStatusText(status) {
        const statusTexts = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'completed': 'Concluído',
            'cancelled': 'Cancelado'
        };
        return statusTexts[status] || status;
    }

    // Atualizar dashboard se estiver visível
    atualizarDashboard() {
        if (window.dashboardManager) {
            // Atualizar apenas os próximos agendamentos (mais eficiente)
            // Forçar atualização apenas quando necessário (criação/edição)
            window.dashboardManager.updateProximosAgendamentos(true);
        }
    }

    async configurarSeletorData() {
        const dataInput = document.getElementById('data_agendamento');
        const horaSelect = document.getElementById('hora_agendamento');
        
        if (!dataInput || !horaSelect) return;

        // Definir data mínima como hoje
        const hoje = new Date().toISOString().split('T')[0];
        dataInput.min = hoje;

        // Carregar slots quando data mudar
        dataInput.addEventListener('change', async () => {
            const data = dataInput.value;
            if (data) {
                await this.carregarSlotsDisponiveis(data);
            }
        });

        // Carregar slots iniciais se já tiver data
        if (dataInput.value) {
            await this.carregarSlotsDisponiveis(dataInput.value);
        }
    }

    async carregarSlotsDisponiveis(data) {
        const horaSelect = document.getElementById('hora_agendamento');
        if (!horaSelect) return;

        try {
            const response = await this.app.apiRequest(`/api/agendamentos/slots/${data}`);
            
            if (response.success) {
                horaSelect.innerHTML = '<option value="">Selecione um horário...</option>';
                
                response.data.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.horario;
                    option.textContent = slot.horario;
                    option.disabled = !slot.disponivel;
                    if (!slot.disponivel) {
                        option.textContent += ' (Indisponível)';
                    }
                    horaSelect.appendChild(option);
                });
            } else {
                horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
            }
        } catch (error) {
            console.error('Erro ao carregar slots:', error);
            horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        }
    }
}

window.agendaPage = new AgendaPage();
