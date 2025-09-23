// Módulo de Clientes
class ClientesPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        console.log('🔄 Página de clientes: Carregando...');
        
        // Verificar se os dados já foram carregados em background
        if (window.clientesData && window.clientesData.length > 0) {
            console.log('✅ Página de clientes: Usando dados já carregados');
            this.data = window.clientesData;
            this.render();
            return;
        }
        
        // Se não há dados em cache, carregar agora
        console.log('🔄 Página de clientes: Carregando dados da API...');
        const content = document.getElementById('clientes-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando clientes...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/clientes');
            if (response.success) {
                this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                window.clientesData = this.data; // Armazenar em cache global
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
            <!-- Tabela responsiva com scroll horizontal -->
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead class="table-dark">
                        <tr>
                            <th class="text-nowrap">Nome</th>
                            <th class="text-nowrap d-none d-md-table-cell">WhatsApp</th>
                            <th class="text-nowrap d-none d-lg-table-cell">Último Agendamento</th>
                            <th class="text-nowrap text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.map(cliente => `
                            <tr>
                                <td>
                                    <div class="d-flex flex-column">
                                        <span class="fw-medium text-truncate" style="max-width: 200px;" title="${cliente.nome}">${cliente.nome}</span>
                                        <!-- Informações extras em mobile -->
                                        <div class="d-md-none small text-muted mt-1">
                                            <div class="d-flex align-items-center">
                                                <i class="bi bi-whatsapp me-1"></i>
                                                <span class="text-truncate" style="max-width: 150px;" title="${cliente.whatsapp || 'Não informado'}">${cliente.whatsapp || 'Não informado'}</span>
                                            </div>
                                            <div class="d-flex align-items-center mt-1">
                                                <i class="bi bi-calendar-event me-1"></i>
                                                <span>${cliente.ultimo_agendamento || 'Nunca'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="d-none d-md-table-cell">
                                    <span class="text-truncate d-block" style="max-width: 150px;" title="${cliente.whatsapp || 'Não informado'}">
                                        ${cliente.whatsapp || 'Não informado'}
                                    </span>
                                </td>
                                <td class="d-none d-lg-table-cell">
                                    <span class="text-truncate d-block" style="max-width: 120px;" title="${cliente.ultimo_agendamento || 'Nunca'}">
                                        ${cliente.ultimo_agendamento || 'Nunca'}
                                    </span>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-primary btn-sm" onclick="clientesPage.editar(${cliente.id_cliente})" title="Editar">
                                            <i class="bi bi-pencil"></i>
                                            <span class="d-none d-xl-inline ms-1">Editar</span>
                                        </button>
                                        <button class="btn btn-outline-info btn-sm" onclick="clientesPage.verHistorico(${cliente.id_cliente})" title="Histórico">
                                            <i class="bi bi-clock-history"></i>
                                            <span class="d-none d-xl-inline ms-1">Histórico</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Informações adicionais em mobile -->
            <div class="d-md-none mt-3">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    <small>Toque em um cliente para ver mais detalhes ou use os botões de ação.</small>
                </div>
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
                    <input type="text" class="form-control" id="nome_cliente" name="nome_cliente" required value="${cliente?.nome || ''}">
                </div>
                <div class="mb-3">
                    <label for="email_cliente" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email_cliente" name="email_cliente" value="${cliente?.email || ''}">
                </div>
                <div class="mb-3">
                    <label for="whatsapp_cliente" class="form-label">WhatsApp *</label>
                    <input type="tel" class="form-control" id="whatsapp_cliente" name="whatsapp_cliente" required value="${cliente?.whatsapp || ''}">
                </div>
                <div class="mb-3">
                    <label for="observacoes_cliente" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes_cliente" name="observacoes_cliente" rows="3">${cliente?.observacoes || ''}</textarea>
                </div>
            </form>
        `;
    }

    async salvar() {
        const form = document.getElementById('clienteForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Debug: mostrar dados coletados
        console.log('Dados do formulário de cliente (página):', data);
        
        // Validar campos obrigatórios com mais detalhes
        const camposObrigatorios = [
            { campo: 'nome_cliente', valor: data.nome_cliente, nome: 'Nome Completo' },
            { campo: 'whatsapp_cliente', valor: data.whatsapp_cliente, nome: 'WhatsApp' }
        ];

        const camposVazios = camposObrigatorios.filter(campo => !campo.valor || campo.valor.trim() === '');
        
        if (camposVazios.length > 0) {
            const camposFaltando = camposVazios.map(campo => campo.nome).join(', ');
            alert(`Preencha os seguintes campos obrigatórios: ${camposFaltando}`);
            return;
        }

        // Validar WhatsApp
        if (data.whatsapp_cliente && !this.validarTelefone(data.whatsapp_cliente)) {
            alert('WhatsApp inválido! Use apenas números.');
            return;
        }

        // Validar email se fornecido
        if (data.email_cliente && !this.validarEmail(data.email_cliente)) {
            alert('Email inválido!');
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

    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    validarTelefone(telefone) {
        // Remove todos os caracteres não numéricos
        const numeros = telefone.replace(/\D/g, '');
        // Telefone deve ter:
        // - 10 dígitos: DDD + 8 dígitos (celular antigo)
        // - 11 dígitos: DDD + 9 dígitos (celular novo)
        // - 12 dígitos: DDD + 8 dígitos (fixo com 9)
        // - 13 dígitos: Código do país + DDD + 9 dígitos
        return numeros.length >= 10 && numeros.length <= 13;
    }
}

// Instância global
window.clientesPage = new ClientesPage();
