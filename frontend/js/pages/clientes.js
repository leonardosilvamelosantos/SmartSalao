// Módulo de Clientes
class ClientesPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        const content = document.getElementById('clientes-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando clientes...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/clientes');
            if (response.success) {
                this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                this.render();
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar clientes</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    render() {
        const content = document.getElementById('clientes-content');
        if (!this.data || this.data.length === 0) {
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
                        ${this.data.map(cliente => `
                            <tr>
                                <td>${cliente.nome}</td>
                                <td>${cliente.whatsapp || 'Não informado'}</td>
                                <td>${cliente.ultimo_agendamento || 'Nunca'}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="clientesPage.editar(${cliente.id_cliente})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="clientesPage.verHistorico(${cliente.id_cliente})">
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

    novo() {
        this.app.showModal('Novo Cliente', this.getFormHtml());
    }

    editar(id) {
        const cliente = this.data.find(c => c.id_cliente === id);
        if (!cliente) return;
        
        this.app.showModal('Editar Cliente', this.getFormHtml(cliente));
    }

    getFormHtml(cliente = null) {
        return `
            <form id="clienteForm">
                <div class="mb-3">
                    <label for="nome_cliente" class="form-label">Nome Completo *</label>
                    <input type="text" class="form-control" id="nome_cliente" required value="${cliente?.nome || ''}">
                </div>
                <div class="mb-3">
                    <label for="email_cliente" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email_cliente" value="${cliente?.email || ''}">
                </div>
                <div class="mb-3">
                    <label for="whatsapp_cliente" class="form-label">WhatsApp *</label>
                    <input type="tel" class="form-control" id="whatsapp_cliente" required value="${cliente?.whatsapp || ''}">
                </div>
                <div class="mb-3">
                    <label for="observacoes_cliente" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes_cliente" rows="3">${cliente?.observacoes || ''}</textarea>
                </div>
            </form>
        `;
    }

    async salvar() {
        const form = document.getElementById('clienteForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!data.nome_cliente || !data.whatsapp_cliente) {
            alert('Nome e WhatsApp são obrigatórios!');
            return;
        }

        try {
            const response = await this.app.apiRequest('/api/clientes', {
                method: 'POST',
                body: JSON.stringify({
                    nome: data.nome_cliente,
                    email: data.email_cliente,
                    whatsapp: data.whatsapp_cliente,
                    observacoes: data.observacoes_cliente
                })
            });

            if (response.success) {
                this.app.showSuccess('Cliente salvo com sucesso!');
                this.app.closeModal();
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao salvar cliente');
            }
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            this.app.showError('Erro de conexão');
        }
    }

    verHistorico(id) {
        console.log('Ver histórico do cliente:', id);
        // TODO: Implementar histórico
    }
}

// Instância global
window.clientesPage = new ClientesPage();
