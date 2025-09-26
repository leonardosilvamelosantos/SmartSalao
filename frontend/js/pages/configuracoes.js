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
                                        <input type="text" class="form-control" id="nome_estabelecimento" name="nome_estabelecimento"
                                               value="${this.data.nome_estabelecimento || ''}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="cnpj" class="form-label">CNPJ</label>
                                        <input type="text" class="form-control" id="cnpj" name="cnpj"
                                               value="${this.data.cnpj || ''}" placeholder="00.000.000/0000-00">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-8 mb-3">
                                        <label for="endereco" class="form-label">Endereço Completo *</label>
                                        <input type="text" class="form-control" id="endereco" name="endereco"
                                               value="${this.data.endereco || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="cep" class="form-label">CEP</label>
                                        <input type="text" class="form-control" id="cep" name="cep"
                                               value="${this.data.cep || ''}" placeholder="00000-000">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label for="cidade" class="form-label">Cidade *</label>
                                        <input type="text" class="form-control" id="cidade" name="cidade"
                                               value="${this.data.cidade || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="estado" class="form-label">Estado *</label>
                                        <select class="form-control" id="estado" name="estado" required>
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
                                        <input type="text" class="form-control" id="bairro" name="bairro"
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
                                        <input type="tel" class="form-control" id="telefone" name="telefone"
                                               value="${this.data.telefone || ''}" required>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="whatsapp" class="form-label">WhatsApp</label>
                                        <input type="tel" class="form-control" id="whatsapp" name="whatsapp"
                                               value="${this.data.whatsapp || ''}">
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label for="email_contato" class="form-label">Email de Contato *</label>
                                        <input type="email" class="form-control" id="email_contato" name="email_contato"
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
                                        <input type="time" class="form-control" id="horario_abertura" name="horario_abertura"
                                               value="${this.data.horario_abertura || '08:00'}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="horario_fechamento" class="form-label">Horário de Fechamento *</label>
                                        <input type="time" class="form-control" id="horario_fechamento" name="horario_fechamento"
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
                                        <select class="form-control" id="intervalo_agendamento" name="intervalo_agendamento">
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

                                <!-- Confirmação Automática (WhatsApp) -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="bi bi-whatsapp me-2"></i>Confirmação Automática (WhatsApp)
                                        </h6>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-12 mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="auto_confirm_whatsapp" ${this.data.auto_confirm_whatsapp ? 'checked' : ''}>
                                            <label class="form-check-label" for="auto_confirm_whatsapp">
                                                Confirmar automaticamente agendamentos feitos via WhatsApp
                                            </label>
                                        </div>
                                        <small class="text-muted">Quando ativado, agendamentos recebidos pelo bot serão confirmados e registrados automaticamente.</small>
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
                                        <select class="form-control" id="horas_lembrete" name="horas_lembrete">
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
                                        <select class="form-control" id="metodo_pagamento_padrao" name="metodo_pagamento_padrao">
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
                                        <input type="password" class="form-control" id="senha_atual" name="senha_atual" placeholder="Digite sua senha atual">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="nova_senha" class="form-label">Nova Senha</label>
                                        <input type="password" class="form-control" id="nova_senha" name="nova_senha" placeholder="Digite a nova senha">
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="confirmar_senha" class="form-label">Confirmar Nova Senha</label>
                                        <input type="password" class="form-control" id="confirmar_senha" name="confirmar_senha" placeholder="Confirme a nova senha">
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
        
        // Debug: verificar se o formulário existe
        if (!form) {
            console.error('Formulário configuracoesForm não encontrado!');
            window.notificationManager?.showError('Erro: Formulário não encontrado. Recarregue a página e tente novamente.');
            return;
        }
        
        console.log('Formulário encontrado:', form);
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Debug: verificar se o FormData está coletando os dados
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: "${value}"`);
        }

        // Debug: mostrar dados coletados
        console.log('Dados do formulário de configurações:', data);
        
        // Debug: verificar elementos individuais
        const elementos = [
            'nome_estabelecimento', 'cnpj', 'endereco', 'cep', 'cidade', 'estado', 'bairro',
            'telefone', 'whatsapp', 'email_contato', 'horario_abertura', 'horario_fechamento',
            'intervalo_agendamento'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            console.log(`Elemento ${id}:`, {
                existe: !!elemento,
                valor: elemento ? elemento.value : 'NÃO ENCONTRADO',
                tipo: elemento ? elemento.type : 'N/A',
                required: elemento ? elemento.required : 'N/A',
                name: elemento ? elemento.name : 'N/A'
            });
        });

        // Validar campos obrigatórios com mais detalhes
        const camposObrigatorios = [
            { campo: 'nome_estabelecimento', valor: data.nome_estabelecimento, nome: 'Nome do Estabelecimento' },
            { campo: 'endereco', valor: data.endereco, nome: 'Endereço' },
            { campo: 'cidade', valor: data.cidade, nome: 'Cidade' },
            { campo: 'estado', valor: data.estado, nome: 'Estado' },
            { campo: 'telefone', valor: data.telefone, nome: 'Telefone Principal' },
            { campo: 'email_contato', valor: data.email_contato, nome: 'Email de Contato' },
            { campo: 'horario_abertura', valor: data.horario_abertura, nome: 'Horário de Abertura' },
            { campo: 'horario_fechamento', valor: data.horario_fechamento, nome: 'Horário de Fechamento' }
        ];

        // Debug: mostrar cada campo obrigatório
        console.log('Verificando campos obrigatórios:');
        camposObrigatorios.forEach(campo => {
            console.log(`${campo.nome}: "${campo.valor}" (vazio: ${!campo.valor || campo.valor.trim() === ''})`);
        });

        const camposVazios = camposObrigatorios.filter(campo => !campo.valor || campo.valor.trim() === '');
        
        if (camposVazios.length > 0) {
            const camposFaltando = camposVazios.map(campo => campo.nome).join(', ');
            console.error('Campos vazios encontrados:', camposFaltando);
            window.notificationManager?.showWarning(`Preencha os seguintes campos obrigatórios: ${camposFaltando}`);
            return;
        }

        // Coletar dias de funcionamento
        const diasFuncionamento = [];
        ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].forEach(dia => {
            const checkbox = document.getElementById(dia);
            console.log(`Checkbox ${dia}:`, {
                existe: !!checkbox,
                checked: checkbox ? checkbox.checked : false,
                valor: checkbox ? checkbox.value : 'N/A'
            });
            if (checkbox && checkbox.checked) {
                diasFuncionamento.push(dia);
            }
        });
        
        console.log('Dias de funcionamento selecionados:', diasFuncionamento);

        // Verificar se pelo menos um dia foi selecionado
        if (diasFuncionamento.length === 0) {
            window.notificationManager?.showWarning('Selecione pelo menos um dia de funcionamento!');
            return;
        }

        // Validar email se fornecido
        if (data.email_contato && !this.validarEmail(data.email_contato)) {
            window.notificationManager?.showWarning('Email de contato inválido!');
            return;
        }

        // Validar telefone se fornecido
        if (data.telefone) {
            console.log('Validando telefone:', data.telefone);
            const numeros = data.telefone.replace(/\D/g, '');
            console.log('Números extraídos:', numeros, 'Tamanho:', numeros.length);
            if (!this.validarTelefone(data.telefone)) {
                window.notificationManager?.showWarning('Telefone principal inválido! Use apenas números.');
                return;
            }
        }

        // Validar WhatsApp se fornecido
        if (data.whatsapp && !this.validarTelefone(data.whatsapp)) {
            window.notificationManager?.showWarning('WhatsApp inválido! Use apenas números.');
            return;
        }

        // Validar CNPJ se fornecido
        if (data.cnpj && !this.validarCNPJ(data.cnpj)) {
            window.notificationManager?.showWarning('CNPJ inválido!');
            return;
        }

        // Validar CEP se fornecido
        if (data.cep && !this.validarCEP(data.cep)) {
            window.notificationManager?.showWarning('CEP inválido! Use o formato 00000-000.');
            return;
        }

        // Validar horários
        if (data.horario_abertura && data.horario_fechamento) {
            const abertura = new Date(`2000-01-01T${data.horario_abertura}`);
            const fechamento = new Date(`2000-01-01T${data.horario_fechamento}`);
            
            if (abertura >= fechamento) {
                window.notificationManager?.showWarning('Horário de abertura deve ser anterior ao horário de fechamento!');
                return;
            }
        }

        // Validar senha se fornecida
        if (data.nova_senha) {
            if (data.nova_senha !== data.confirmar_senha) {
                window.notificationManager?.showWarning('As senhas não coincidem!');
                return;
            }
            
            if (data.nova_senha.length < 6) {
                window.notificationManager?.showWarning('A nova senha deve ter pelo menos 6 caracteres!');
                return;
            }
            
            if (!data.senha_atual) {
                window.notificationManager?.showWarning('Digite a senha atual para alterar a senha!');
                return;
            }
        }

        // Debug: mostrar todos os dados coletados
        console.log('Dados completos do formulário:', {
            nome_estabelecimento: data.nome_estabelecimento,
            endereco: data.endereco,
            cidade: data.cidade,
            estado: data.estado,
            telefone: data.telefone,
            email_contato: data.email_contato,
            horario_abertura: data.horario_abertura,
            horario_fechamento: data.horario_fechamento,
            dias_funcionamento: diasFuncionamento,
            intervalo_agendamento: data.intervalo_agendamento,
            horas_lembrete: data.horas_lembrete,
            metodo_pagamento_padrao: data.metodo_pagamento_padrao
        });
        
        // Debug: verificar selects
        const selects = ['estado', 'intervalo_agendamento', 'horas_lembrete', 'metodo_pagamento_padrao'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            console.log(`Select ${id}:`, {
                existe: !!select,
                valor: select ? select.value : 'NÃO ENCONTRADO',
                opcoes: select ? Array.from(select.options).map(opt => ({ valor: opt.value, texto: opt.text, selected: opt.selected })) : 'N/A'
            });
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
            intervalo_agendamento: parseInt(data.intervalo_agendamento) || 30,
            notificar_agendamentos: this.getCheckboxValue('notificar_agendamentos'),
            notificar_cancelamentos: this.getCheckboxValue('notificar_cancelamentos'),
            lembrete_cliente: this.getCheckboxValue('lembrete_cliente'),
            horas_lembrete: parseInt(data.horas_lembrete) || 1,
            metodo_pagamento_padrao: data.metodo_pagamento_padrao || 'dinheiro',
            aceitar_pix: this.getCheckboxValue('aceitar_pix'),
            auto_confirm_whatsapp: this.getCheckboxValue('auto_confirm_whatsapp'),
            logout_todos_dispositivos: this.getCheckboxValue('logout_todos_dispositivos')
        };

        // Debug: verificar campos de senha
        const senhaAtual = document.getElementById('senha_atual');
        const novaSenha = document.getElementById('nova_senha');
        const confirmarSenha = document.getElementById('confirmar_senha');
        
        console.log('Campos de senha:', {
            senha_atual: {
                existe: !!senhaAtual,
                valor: senhaAtual ? senhaAtual.value : 'NÃO ENCONTRADO'
            },
            nova_senha: {
                existe: !!novaSenha,
                valor: novaSenha ? novaSenha.value : 'NÃO ENCONTRADO'
            },
            confirmar_senha: {
                existe: !!confirmarSenha,
                valor: confirmarSenha ? confirmarSenha.value : 'NÃO ENCONTRADO'
            }
        });
        
        // Debug: verificar se os dados estão sendo coletados corretamente
        console.log('Dados do FormData:', data);
        console.log('Campos obrigatórios verificados:', camposObrigatorios);
        
        // Debug: verificar se o formulário está sendo renderizado corretamente
        console.log('Formulário renderizado:', form.innerHTML.substring(0, 200) + '...');
        
        // Debug: verificar se há algum problema com a coleta de dados
        if (Object.keys(data).length === 0) {
            console.error('Nenhum dado foi coletado do formulário!');
            alert('Erro: Nenhum dado foi coletado do formulário. Verifique se os campos estão preenchidos corretamente.');
            return;
        }
        
        // Debug: verificar se os campos obrigatórios estão sendo coletados
        const camposObrigatoriosColetados = camposObrigatorios.map(campo => ({
            ...campo,
            coletado: data[campo.campo] !== undefined
        }));
        
        console.log('Campos obrigatórios coletados:', camposObrigatoriosColetados);
        
        // Debug: verificar se há algum problema com a coleta de dados específicos
        const camposProblema = camposObrigatoriosColetados.filter(campo => !campo.coletado);
        if (camposProblema.length > 0) {
            console.error('Campos não coletados:', camposProblema);
            alert(`Erro: Os seguintes campos não foram coletados: ${camposProblema.map(c => c.nome).join(', ')}`);
            return;
        }
        
        // Debug: verificar se os valores estão sendo coletados corretamente
        console.log('Valores coletados dos campos obrigatórios:');
        camposObrigatorios.forEach(campo => {
            console.log(`${campo.nome}: "${data[campo.campo]}" (tipo: ${typeof data[campo.campo]})`);
        });
        
        // Debug: verificar se há algum problema com a coleta de dados específicos
        const camposVazios2 = camposObrigatorios.filter(campo => !data[campo.campo] || data[campo.campo].trim() === '');
        if (camposVazios2.length > 0) {
            console.error('Campos vazios encontrados:', camposVazios2);
            const camposFaltando = camposVazios2.map(campo => campo.nome).join(', ');
            window.notificationManager?.showWarning(`Preencha os seguintes campos obrigatórios: ${camposFaltando}`);
            return;
        }
        
        // Adicionar senha se fornecida
        if (data.senha_atual && data.nova_senha) {
            payload.senha_atual = data.senha_atual;
            payload.nova_senha = data.nova_senha;
        }

        // Debug: mostrar payload final
        console.log('Payload final:', payload);

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

    validarCNPJ(cnpj) {
        // Remove todos os caracteres não numéricos
        const numeros = cnpj.replace(/\D/g, '');
        
        // CNPJ deve ter 14 dígitos
        if (numeros.length !== 14) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(numeros)) return false;
        
        // Validação básica do CNPJ (algoritmo simplificado)
        let soma = 0;
        let peso = 2;
        
        // Calcular primeiro dígito verificador
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        const resto = soma % 11;
        const digito1 = resto < 2 ? 0 : 11 - resto;
        
        if (parseInt(numeros.charAt(12)) !== digito1) return false;
        
        // Calcular segundo dígito verificador
        soma = 0;
        peso = 2;
        
        for (let i = 12; i >= 0; i--) {
            soma += parseInt(numeros.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        const resto2 = soma % 11;
        const digito2 = resto2 < 2 ? 0 : 11 - resto2;
        
        return parseInt(numeros.charAt(13)) === digito2;
    }

    validarCEP(cep) {
        // Remove todos os caracteres não numéricos
        const numeros = cep.replace(/\D/g, '');
        // CEP deve ter 8 dígitos
        return numeros.length === 8;
    }

    getCheckboxValue(id) {
        const checkbox = document.getElementById(id);
        console.log(`Checkbox ${id}:`, {
            existe: !!checkbox,
            checked: checkbox ? checkbox.checked : false
        });
        return checkbox ? checkbox.checked : false;
    }
}

window.configuracoesPage = new ConfiguracoesPage();
