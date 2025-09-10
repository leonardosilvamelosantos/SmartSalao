// Módulo de Configurações
class ConfiguracoesPage {
    constructor() {
        this.data = {};
    }

    get app() {
        return window.barbeirosApp;
    }

    async load() {
        const content = document.getElementById('configuracoes-content');
        if (!content) return;
        content.innerHTML = '<div class="text-center"><i class="bi bi-arrow-clockwise" style="font-size: 3rem;"></i><p class="mt-2">Carregando configurações...</p></div>';

        try {
            const response = await this.app.apiRequest('/api/configuracoes');
            if (response.success) {
                this.data = response.data || {};
                this.render();
            } else {
                content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i><p class="mt-2">Erro ao carregar configurações</p></div>';
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            content.innerHTML = '<div class="text-center text-muted"><i class="bi bi-wifi-off" style="font-size: 3rem;"></i><p class="mt-2">Erro de conexão</p></div>';
        }
    }

    render() {
        const content = document.getElementById('configuracoes-content');
        if (!content) return;

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-gear me-2"></i>Configurações da Conta
                            </h5>
                        </div>
                        <div class="card-body">
                            <form id="configuracoesForm">
                                <!-- Informações do Estabelecimento -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-shop me-2"></i>Informações do Estabelecimento
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="nome_estabelecimento" class="form-label">Nome do Estabelecimento *</label>
                                        <input type="text" class="form-control" id="nome_estabelecimento" 
                                               value="${this.data.nome_estabelecimento || ''}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="cnpj" class="form-label">CNPJ</label>
                                        <input type="text" class="form-control" id="cnpj" 
                                               value="${this.data.cnpj || ''}" placeholder="00.000.000/0000-00">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-8 mb-3">
                                        <label for="endereco" class="form-label">Endereço Completo *</label>
                                        <input type="text" class="form-control" id="endereco" 
                                               value="${this.data.endereco || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="cep" class="form-label">CEP</label>
                                        <input type="text" class="form-control" id="cep" 
                                               value="${this.data.cep || ''}" placeholder="00000-000">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label for="cidade" class="form-label">Cidade *</label>
                                        <input type="text" class="form-control" id="cidade" 
                                               value="${this.data.cidade || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="estado" class="form-label">Estado *</label>
                                        <select class="form-control" id="estado" required>
                                            <option value="">Selecione...</option>
                                            <option value="AC" ${this.data.estado === 'AC' ? 'selected' : ''}>Acre</option>
                                            <option value="AL" ${this.data.estado === 'AL' ? 'selected' : ''}>Alagoas</option>
                                            <option value="AP" ${this.data.estado === 'AP' ? 'selected' : ''}>Amapá</option>
                                            <option value="AM" ${this.data.estado === 'AM' ? 'selected' : ''}>Amazonas</option>
                                            <option value="BA" ${this.data.estado === 'BA' ? 'selected' : ''}>Bahia</option>
                                            <option value="CE" ${this.data.estado === 'CE' ? 'selected' : ''}>Ceará</option>
                                            <option value="DF" ${this.data.estado === 'DF' ? 'selected' : ''}>Distrito Federal</option>
                                            <option value="ES" ${this.data.estado === 'ES' ? 'selected' : ''}>Espírito Santo</option>
                                            <option value="GO" ${this.data.estado === 'GO' ? 'selected' : ''}>Goiás</option>
                                            <option value="MA" ${this.data.estado === 'MA' ? 'selected' : ''}>Maranhão</option>
                                            <option value="MT" ${this.data.estado === 'MT' ? 'selected' : ''}>Mato Grosso</option>
                                            <option value="MS" ${this.data.estado === 'MS' ? 'selected' : ''}>Mato Grosso do Sul</option>
                                            <option value="MG" ${this.data.estado === 'MG' ? 'selected' : ''}>Minas Gerais</option>
                                            <option value="PA" ${this.data.estado === 'PA' ? 'selected' : ''}>Pará</option>
                                            <option value="PB" ${this.data.estado === 'PB' ? 'selected' : ''}>Paraíba</option>
                                            <option value="PR" ${this.data.estado === 'PR' ? 'selected' : ''}>Paraná</option>
                                            <option value="PE" ${this.data.estado === 'PE' ? 'selected' : ''}>Pernambuco</option>
                                            <option value="PI" ${this.data.estado === 'PI' ? 'selected' : ''}>Piauí</option>
                                            <option value="RJ" ${this.data.estado === 'RJ' ? 'selected' : ''}>Rio de Janeiro</option>
                                            <option value="RN" ${this.data.estado === 'RN' ? 'selected' : ''}>Rio Grande do Norte</option>
                                            <option value="RS" ${this.data.estado === 'RS' ? 'selected' : ''}>Rio Grande do Sul</option>
                                            <option value="RO" ${this.data.estado === 'RO' ? 'selected' : ''}>Rondônia</option>
                                            <option value="RR" ${this.data.estado === 'RR' ? 'selected' : ''}>Roraima</option>
                                            <option value="SC" ${this.data.estado === 'SC' ? 'selected' : ''}>Santa Catarina</option>
                                            <option value="SP" ${this.data.estado === 'SP' ? 'selected' : ''}>São Paulo</option>
                                            <option value="SE" ${this.data.estado === 'SE' ? 'selected' : ''}>Sergipe</option>
                                            <option value="TO" ${this.data.estado === 'TO' ? 'selected' : ''}>Tocantins</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="bairro" class="form-label">Bairro</label>
                                        <input type="text" class="form-control" id="bairro" 
                                               value="${this.data.bairro || ''}">
                                    </div>
                                </div>

                                <!-- Contato -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-telephone me-2"></i>Informações de Contato
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label for="telefone" class="form-label">Telefone Principal *</label>
                                        <input type="tel" class="form-control" id="telefone" 
                                               value="${this.data.telefone || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="whatsapp" class="form-label">WhatsApp</label>
                                        <input type="tel" class="form-control" id="whatsapp" 
                                               value="${this.data.whatsapp || ''}">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="email_contato" class="form-label">Email de Contato *</label>
                                        <input type="email" class="form-control" id="email_contato" 
                                               value="${this.data.email_contato || ''}" required>
                                    </div>
                                </div>

                                <!-- Horário de Funcionamento -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-clock me-2"></i>Horário de Funcionamento
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="horario_abertura" class="form-label">Horário de Abertura *</label>
                                        <input type="time" class="form-control" id="horario_abertura" 
                                               value="${this.data.horario_abertura || '08:00'}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="horario_fechamento" class="form-label">Horário de Fechamento *</label>
                                        <input type="time" class="form-control" id="horario_fechamento" 
                                               value="${this.data.horario_fechamento || '18:00'}" required>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="dias_funcionamento" class="form-label">Dias de Funcionamento *</label>
                                        <div class="form-check-group">
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="segunda" value="segunda" 
                                                       ${this.data.dias_funcionamento?.includes('segunda') ? 'checked' : ''}>
                                                <label class="form-check-label" for="segunda">Seg</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="terca" value="terca" 
                                                       ${this.data.dias_funcionamento?.includes('terca') ? 'checked' : ''}>
                                                <label class="form-check-label" for="terca">Ter</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="quarta" value="quarta" 
                                                       ${this.data.dias_funcionamento?.includes('quarta') ? 'checked' : ''}>
                                                <label class="form-check-label" for="quarta">Qua</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="quinta" value="quinta" 
                                                       ${this.data.dias_funcionamento?.includes('quinta') ? 'checked' : ''}>
                                                <label class="form-check-label" for="quinta">Qui</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="sexta" value="sexta" 
                                                       ${this.data.dias_funcionamento?.includes('sexta') ? 'checked' : ''}>
                                                <label class="form-check-label" for="sexta">Sex</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="sabado" value="sabado" 
                                                       ${this.data.dias_funcionamento?.includes('sabado') ? 'checked' : ''}>
                                                <label class="form-check-label" for="sabado">Sáb</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" id="domingo" value="domingo" 
                                                       ${this.data.dias_funcionamento?.includes('domingo') ? 'checked' : ''}>
                                                <label class="form-check-label" for="domingo">Dom</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="intervalo_agendamento" class="form-label">Intervalo entre Agendamentos (min)</label>
                                        <select class="form-control" id="intervalo_agendamento">
                                            <option value="15" ${this.data.intervalo_agendamento === 15 ? 'selected' : ''}>15 minutos</option>
                                            <option value="30" ${this.data.intervalo_agendamento === 30 ? 'selected' : ''}>30 minutos</option>
                                            <option value="45" ${this.data.intervalo_agendamento === 45 ? 'selected' : ''}>45 minutos</option>
                                            <option value="60" ${this.data.intervalo_agendamento === 60 ? 'selected' : ''}>1 hora</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Configurações de Notificação -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-bell me-2"></i>Configurações de Notificação
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="notificar_agendamentos" 
                                                   ${this.data.notificar_agendamentos ? 'checked' : ''}>
                                            <label class="form-check-label" for="notificar_agendamentos">
                                                Notificar novos agendamentos
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="notificar_cancelamentos" 
                                                   ${this.data.notificar_cancelamentos ? 'checked' : ''}>
                                            <label class="form-check-label" for="notificar_cancelamentos">
                                                Notificar cancelamentos
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="lembrete_cliente" 
                                                   ${this.data.lembrete_cliente ? 'checked' : ''}>
                                            <label class="form-check-label" for="lembrete_cliente">
                                                Enviar lembretes para clientes
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="horas_lembrete" class="form-label">Horas antes do agendamento</label>
                                        <select class="form-control" id="horas_lembrete">
                                            <option value="1" ${this.data.horas_lembrete === 1 ? 'selected' : ''}>1 hora</option>
                                            <option value="2" ${this.data.horas_lembrete === 2 ? 'selected' : ''}>2 horas</option>
                                            <option value="4" ${this.data.horas_lembrete === 4 ? 'selected' : ''}>4 horas</option>
                                            <option value="24" ${this.data.horas_lembrete === 24 ? 'selected' : ''}>1 dia</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Configurações de Pagamento -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-credit-card me-2"></i>Configurações de Pagamento
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="metodo_pagamento_padrao" class="form-label">Método de Pagamento Padrão</label>
                                        <select class="form-control" id="metodo_pagamento_padrao">
                                            <option value="dinheiro" ${this.data.metodo_pagamento_padrao === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                                            <option value="pix" ${this.data.metodo_pagamento_padrao === 'pix' ? 'selected' : ''}>PIX</option>
                                            <option value="cartao_debito" ${this.data.metodo_pagamento_padrao === 'cartao_debito' ? 'selected' : ''}>Cartão de Débito</option>
                                            <option value="cartao_credito" ${this.data.metodo_pagamento_padrao === 'cartao_credito' ? 'selected' : ''}>Cartão de Crédito</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="aceitar_pix" 
                                                   ${this.data.aceitar_pix ? 'checked' : ''}>
                                            <label class="form-check-label" for="aceitar_pix">
                                                Aceitar PIX
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Configurações de Segurança -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-shield-lock me-2"></i>Configurações de Segurança
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="senha_atual" class="form-label">Senha Atual</label>
                                        <input type="password" class="form-control" id="senha_atual" placeholder="Digite sua senha atual">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="nova_senha" class="form-label">Nova Senha</label>
                                        <input type="password" class="form-control" id="nova_senha" placeholder="Digite a nova senha">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="confirmar_senha" class="form-label">Confirmar Nova Senha</label>
                                        <input type="password" class="form-control" id="confirmar_senha" placeholder="Confirme a nova senha">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="logout_todos_dispositivos" 
                                                   ${this.data.logout_todos_dispositivos ? 'checked' : ''}>
                                            <label class="form-check-label" for="logout_todos_dispositivos">
                                                Fazer logout de todos os dispositivos
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Botões de Ação -->
                                <div class="row">
                                    <div class="col-12">
                                        <hr>
                                        <div class="d-flex justify-content-between">
                                            <button type="button" class="btn btn-outline-secondary" onclick="configuracoesPage.cancelar()">
                                                <i class="bi bi-x-circle me-1"></i>Cancelar
                                            </button>
                                            <button type="button" class="btn btn-primary" onclick="configuracoesPage.salvar()">
                                                <i class="bi bi-check-circle me-1"></i>Salvar Configurações
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }

    async salvar() {
        const form = document.getElementById('configuracoesForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validar campos obrigatórios
        if (!data.nome_estabelecimento || !data.endereco || !data.cidade || !data.estado || 
            !data.telefone || !data.email_contato || !data.horario_abertura || !data.horario_fechamento) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        // Validar senha se fornecida
        if (data.nova_senha && data.nova_senha !== data.confirmar_senha) {
            alert('As senhas não coincidem!');
            return;
        }

        // Coletar dias de funcionamento
        const diasFuncionamento = [];
        ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].forEach(dia => {
            if (document.getElementById(dia).checked) {
                diasFuncionamento.push(dia);
            }
        });

        const payload = {
            nome_estabelecimento: data.nome_estabelecimento,
            cnpj: data.cnpj,
            endereco: data.endereco,
            cep: data.cep,
            cidade: data.cidade,
            estado: data.estado,
            bairro: data.bairro,
            telefone: data.telefone,
            whatsapp: data.whatsapp,
            email_contato: data.email_contato,
            horario_abertura: data.horario_abertura,
            horario_fechamento: data.horario_fechamento,
            dias_funcionamento: diasFuncionamento,
            intervalo_agendamento: parseInt(data.intervalo_agendamento),
            notificar_agendamentos: document.getElementById('notificar_agendamentos').checked,
            notificar_cancelamentos: document.getElementById('notificar_cancelamentos').checked,
            lembrete_cliente: document.getElementById('lembrete_cliente').checked,
            horas_lembrete: parseInt(data.horas_lembrete),
            metodo_pagamento_padrao: data.metodo_pagamento_padrao,
            aceitar_pix: document.getElementById('aceitar_pix').checked,
            logout_todos_dispositivos: document.getElementById('logout_todos_dispositivos').checked
        };

        // Adicionar senha se fornecida
        if (data.senha_atual && data.nova_senha) {
            payload.senha_atual = data.senha_atual;
            payload.nova_senha = data.nova_senha;
        }

        try {
            const response = await this.app.apiRequest('/api/configuracoes', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                this.app.showSuccess('Configurações salvas com sucesso!');
                this.load(); // Recarregar dados
            } else {
                this.app.showError(response.message || 'Erro ao salvar configurações');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.app.showError('Erro de conexão');
        }
    }

    cancelar() {
        this.load(); // Recarregar dados originais
    }
}

window.configuracoesPage = new ConfiguracoesPage();
