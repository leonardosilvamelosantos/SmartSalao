// Módulo de Usuários
class UsuariosPage {
    constructor() {
        this.data = [];
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        const content = document.getElementById('usuarios-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando usuários...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/usuarios');
            if (response.success) {
                this.data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                this.render();
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar usuários</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    render() {
        const content = document.getElementById('usuarios-content');
        if (!this.data || this.data.length === 0) {
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
                        ${this.data.map(usuario => `
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
                                        <button class="btn btn-outline-primary" onclick="usuariosPage.editar(${usuario.id_usuario})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="usuariosPage.excluir(${usuario.id_usuario})">
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

    novo() {
        this.app.showModal('Novo Usuário', this.getFormHtml());
    }

    editar(id) {
        const usuario = this.data.find(u => u.id_usuario === id);
        if (!usuario) return;
        
        this.app.showModal('Editar Usuário', this.getFormHtml(usuario));
    }

    getFormHtml(usuario = null) {
        return `
            <form id="usuarioForm">
                <div class="mb-3">
                    <label for="nome_usuario" class="form-label">Nome Completo *</label>
                    <input type="text" class="form-control" id="nome_usuario" name="nome_usuario" required value="${usuario?.nome || ''}">
                </div>
                <div class="mb-3">
                    <label for="email_usuario" class="form-label">Email *</label>
                    <input type="email" class="form-control" id="email_usuario" name="email_usuario" required value="${usuario?.email || ''}">
                </div>
                <div class="mb-3">
                    <label for="senha_usuario" class="form-label">Senha ${usuario ? '(deixe em branco para manter)' : '*'}</label>
                    <input type="password" class="form-control" id="senha_usuario" name="senha_usuario" ${usuario ? '' : 'required'}>
                </div>
                <div class="mb-3">
                    <label for="tipo_usuario" class="form-label">Tipo *</label>
                    <select class="form-control" id="tipo_usuario" name="tipo_usuario" required>
                        <option value="barbeiro" ${usuario?.tipo === 'barbeiro' ? 'selected' : ''}>Barbeiro</option>
                        <option value="admin" ${usuario?.tipo === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="whatsapp_usuario" class="form-label">WhatsApp</label>
                    <input type="tel" class="form-control" id="whatsapp_usuario" value="${usuario?.whatsapp || ''}">
                </div>
            </form>
        `;
    }

    async salvar() {
        const form = document.getElementById('usuarioForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!data.nome_usuario || !data.email_usuario || !data.tipo_usuario) {
            alert('Nome, email e tipo são obrigatórios!');
            return;
        }

        const payload = {
            nome: data.nome_usuario,
            email: data.email_usuario,
            tipo: data.tipo_usuario,
            whatsapp: data.whatsapp_usuario
        };

        if (data.senha_usuario) {
            payload.senha = data.senha_usuario;
        }

        try {
            const response = await this.app.apiRequest('/api/usuarios', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                this.app.showSuccess('Usuário salvo com sucesso!');
                this.app.closeModal();
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao salvar usuário');
            }
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            this.app.showError('Erro de conexão');
        }
    }

    async excluir(id) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            const response = await this.app.apiRequest(`/api/usuarios/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.app.showSuccess('Usuário excluído com sucesso!');
                this.load();
            } else {
                this.app.showError(response.message || 'Erro ao excluir usuário');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.app.showError('Erro de conexão');
        }
    }
}

window.usuariosPage = new UsuariosPage();
