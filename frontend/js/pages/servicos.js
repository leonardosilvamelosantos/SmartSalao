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

        try {
            const response = await this.app.apiRequest('/api/servicos');
            console.log('📊 Resposta da API de serviços:', response);
            
            if (response.success) {
                this.data = response.data || [];
                window.servicosData = this.data; // Armazenar em cache global
                console.log('✅ Dados de serviços carregados:', this.data.length, 'itens');
                this.render();
            } else {
                console.error('❌ Erro na API de serviços:', response.message);
                this.app.showError('Erro ao carregar serviços: ' + (response.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar serviços:', error);
            this.app.showError('Erro de conexão ao carregar serviços');
        }
    }

    render() {
        console.log('🔄 Renderizando serviços:', this.data?.length || 0, 'itens');
        
        // Atualizar métricas
        if (typeof atualizarMetricasServicos === 'function') {
            atualizarMetricasServicos(this.data);
        }
        
        // Renderizar na tabela
        if (typeof renderizarServicosTabela === 'function') {
            renderizarServicosTabela(this.data);
        } else {
            console.warn('⚠️ Função renderizarServicosTabela não encontrada');
        }
        
        // Armazenar dados globalmente para uso posterior
        window.servicosData = this.data || [];
        console.log('✅ Serviços renderizados e armazenados globalmente');
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
            window.notificationManager?.showWarning('Nome, duração e valor são obrigatórios!');
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
        const confirmed = await window.notificationManager?.confirmDelete('este serviço');
        if (!confirmed) return;

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
