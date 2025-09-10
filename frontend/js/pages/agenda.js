// Módulo de Agenda
class AgendaPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        const content = document.getElementById('agenda-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando agenda...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/agendamentos');
            if (response.success) {
                this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
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
        const content = document.getElementById('agenda-content');
        if (!this.data || this.data.length === 0) {
            content.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-calendar-week" style="font-size: 3rem;"></i>
                    <p class="mt-2">Nenhum agendamento encontrado</p>
                    <button class="btn btn-primary" onclick="agendaPage.novo()">
                        <i class="bi bi-plus-circle me-1"></i>Criar Primeiro Agendamento
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
                                            <small class="text-muted">${new Date(agendamento.start_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="agendaPage.editar(${agendamento.id_agendamento})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="agendaPage.cancelar(${agendamento.id_agendamento})">
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
                        <select class="form-control" id="cliente_id" required>
                            <option value="">Selecione um cliente...</option>
                            ${clientes.map(cliente => `
                                <option value="${cliente.id_cliente}" ${agendamento?.id_cliente === cliente.id_cliente ? 'selected' : ''}>${cliente.nome}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="servico_id" class="form-label">Serviço</label>
                        <select class="form-control" id="servico_id" required>
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
                        <input type="date" class="form-control" id="data_agendamento" required value="${dataAtual}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="hora_agendamento" class="form-label">Horário</label>
                        <select class="form-control" id="hora_agendamento" required>
                            <option value="">Selecione um horário...</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="observacoes" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes" rows="3">${agendamento?.observacoes || ''}</textarea>
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

        try {
            const response = await this.app.apiRequest('/api/agendamentos', {
                method: 'POST',
                body: JSON.stringify({
                    id_cliente: parseInt(data.cliente_id),
                    id_servico: parseInt(data.servico_id),
                    start_at: start_at,
                    observacoes: data.observacoes
                })
            });

            if (response.success) {
                this.app.showSuccess('Agendamento salvo com sucesso!');
                this.app.closeModal();
                this.load();
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

        try {
            const response = await this.app.apiRequest(`/api/agendamentos/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.app.showSuccess('Agendamento cancelado com sucesso!');
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao cancelar agendamento');
            }
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            this.app.showError('Erro de conexão');
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
