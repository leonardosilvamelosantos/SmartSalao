// Módulo de Serviços
class ServicosPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        console.log('🔄 Página de serviços: Carregando...');
        
        // Verificar se os dados já foram carregados em background
        if (window.servicosData && window.servicosData.length > 0) {
            console.log('✅ Página de serviços: Usando dados já carregados');
            this.data = window.servicosData;
            this.render();
            return;
        }
        
        // Se não há dados em cache, carregar agora
        console.log('🔄 Página de serviços: Carregando dados da API...');
        const content = document.getElementById('servicos-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando serviços...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/servicos');
            if (response.success) {
                this.data = response.data || [];
                window.servicosData = this.data; // Armazenar em cache global
                this.render();
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar serviços</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    render() {
        const content = document.getElementById('servicos-content');
        if (!this.data || this.data.length === 0) {
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wrench" style="font-size: 3rem;"></i><p class="mt-2">Nenhum serviço cadastrado</p></div>';
            return;
        }

        const html = `
            <div class="row">
                ${this.data.map(servico => `
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
                                    <button class="btn btn-outline-primary btn-sm" onclick="servicosPage.editar(${servico.id_servico})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="servicosPage.excluir(${servico.id_servico})">
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

    novo() {
        this.app.showModal('Novo Serviço', this.getFormHtml());
    }

    editar(id) {
        const servico = this.data.find(s => s.id_servico === id);
        if (!servico) return;
        
        this.app.showModal('Editar Serviço', this.getFormHtml(servico));
    }

    getFormHtml(servico = null) {
        return `
            <form id="servicoForm">
                <div class="mb-3">
                    <label for="nome_servico" class="form-label">Nome do Serviço *</label>
                    <input type="text" class="form-control" id="nome_servico" name="nome_servico" required value="${servico?.nome_servico || ''}">
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="duracao_servico" class="form-label">Duração (minutos) *</label>
                        <input type="number" class="form-control" id="duracao_servico" name="duracao_servico" required value="${servico?.duracao_min || ''}" min="5" max="480">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="valor_servico" class="form-label">Valor (R$) *</label>
                        <input type="number" class="form-control" id="valor_servico" name="valor_servico" required value="${servico?.valor || ''}" min="0" step="0.01">
                    </div>
                </div>
                <div class="mb-3">
                    <label for="descricao_servico" class="form-label">Descrição</label>
                    <textarea class="form-control" id="descricao_servico" name="descricao_servico" rows="3">${servico?.descricao || ''}</textarea>
                </div>
                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="ativo_servico" name="ativo_servico" ${servico?.ativo ? 'checked' : ''}>
                        <label class="form-check-label" for="ativo_servico">Serviço ativo</label>
                    </div>
                </div>
            </form>
        `;
    }

    async salvar() {
        const form = document.getElementById('servicoForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!data.nome_servico || !data.duracao_servico || !data.valor_servico) {
            alert('Nome, duração e valor são obrigatórios!');
            return;
        }

        try {
            const response = await this.app.apiRequest('/api/servicos', {
                method: 'POST',
                body: JSON.stringify({
                    nome_servico: data.nome_servico,
                    duracao_min: parseInt(data.duracao_servico),
                    valor: parseFloat(data.valor_servico),
                    descricao: data.descricao_servico,
                    ativo: document.getElementById('ativo_servico').checked
                })
            });

            if (response.success) {
                this.app.showSuccess('Serviço salvo com sucesso!');
                this.app.closeModal();
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao salvar serviço');
            }
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            this.app.showError('Erro de conexão');
        }
    }

    async excluir(id) {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

        try {
            const response = await this.app.apiRequest(`/api/servicos/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.app.showSuccess('Serviço excluído com sucesso!');
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao excluir serviço');
            }
        } catch (error) {
            console.error('Erro ao excluir serviço:', error);
            this.app.showError('Erro de conexão');
        }
    }
}

window.servicosPage = new ServicosPage();
