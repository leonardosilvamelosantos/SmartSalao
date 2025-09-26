const BaseModel = require('../models/BaseModel');

class ConfiguracaoService {
  constructor() {
    this.configuracaoModel = new BaseModel('configuracoes', 'id_configuracao');
  }

  async getConfiguracoes(userId) {
    try {
      // Buscar configurações do usuário ou criar padrões
      let configuracoes = await this.configuracaoModel.findBy({ id_usuario: userId });
      
      if (!configuracoes || configuracoes.length === 0) {
        // Criar configurações padrão se não existirem
        configuracoes = await this.createDefaultConfiguracoes(userId);
      } else {
        configuracoes = configuracoes[0];
        // Converter dias_funcionamento de JSON string para array
        if (configuracoes.dias_funcionamento && typeof configuracoes.dias_funcionamento === 'string') {
          try {
            configuracoes.dias_funcionamento = JSON.parse(configuracoes.dias_funcionamento);
          } catch (e) {
            configuracoes.dias_funcionamento = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
          }
        }
      }

      return configuracoes;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Retornar configurações padrão em caso de erro
      return await this.createDefaultConfiguracoes(userId);
    }
  }

  async updateConfiguracoes(userId, data) {
    try {
      // Verificar se configurações existem
      const existingConfig = await this.configuracaoModel.findBy({ id_usuario: userId });
      
      const configData = {
        id_usuario: userId,
        nome_estabelecimento: data.nome_estabelecimento || '',
        cnpj: data.cnpj || '',
        endereco: data.endereco || '',
        cep: data.cep || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        bairro: data.bairro || '',
        telefone: data.telefone || '',
        whatsapp: data.whatsapp || '',
        email_contato: data.email_contato || '',
        horario_abertura: data.horario_abertura || '08:00',
        horario_fechamento: data.horario_fechamento || '18:00',
        dias_funcionamento: JSON.stringify(data.dias_funcionamento || ['segunda', 'terca', 'quarta', 'quinta', 'sexta']),
        intervalo_agendamento: data.intervalo_agendamento || 30,
        notificar_agendamentos: data.notificar_agendamentos ? 1 : 0,
        notificar_cancelamentos: data.notificar_cancelamentos ? 1 : 0,
        lembrete_cliente: data.lembrete_cliente ? 1 : 0,
        horas_lembrete: data.horas_lembrete || 24,
        metodo_pagamento_padrao: data.metodo_pagamento_padrao || 'dinheiro',
        aceitar_pix: data.aceitar_pix ? 1 : 0,
        auto_confirm_whatsapp: data.auto_confirm_whatsapp ? 1 : 0
        // updated_at será definido automaticamente pelo BaseModel
      };

      if (existingConfig && existingConfig.length > 0) {
        // Atualizar configurações existentes
        await this.configuracaoModel.update(existingConfig[0].id_configuracao, configData);
      } else {
        // Criar novas configurações
        await this.configuracaoModel.create(configData);
      }

      // Se há alteração de senha
      if (data.senha_atual && data.nova_senha) {
        await this.updatePassword(userId, data.senha_atual, data.nova_senha);
      }

      // Se logout de todos os dispositivos
      if (data.logout_todos_dispositivos) {
        await this.logoutAllDevices(userId);
      }

      return await this.getConfiguracoes(userId);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  async createDefaultConfiguracoes(userId) {
    const defaultConfig = {
      id_usuario: userId,
      nome_estabelecimento: 'Meu Estabelecimento',
      cnpj: '',
      endereco: '',
      cep: '',
      cidade: '',
      estado: '',
      bairro: '',
      telefone: '',
      whatsapp: '',
      email_contato: '',
      horario_abertura: '08:00',
      horario_fechamento: '18:00',
      dias_funcionamento: JSON.stringify(['segunda', 'terca', 'quarta', 'quinta', 'sexta']),
      intervalo_agendamento: 30,
      notificar_agendamentos: 1,
      notificar_cancelamentos: 1,
      lembrete_cliente: 1,
      horas_lembrete: 24,
      metodo_pagamento_padrao: 'dinheiro',
      aceitar_pix: 0,
      auto_confirm_whatsapp: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const id = await this.configuracaoModel.create(defaultConfig);
      const result = { id_configuracao: id, ...defaultConfig };
      // Converter dias_funcionamento para array na resposta
      result.dias_funcionamento = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
      return result;
    } catch (error) {
      console.error('Erro ao criar configurações padrão:', error);
      // Retornar configurações padrão sem salvar no banco
      return {
        id_configuracao: null,
        id_usuario: userId,
        nome_estabelecimento: 'Meu Estabelecimento',
        cnpj: '',
        endereco: '',
        cep: '',
        cidade: '',
        estado: '',
        bairro: '',
        telefone: '',
        whatsapp: '',
        email_contato: '',
        horario_abertura: '08:00',
        horario_fechamento: '18:00',
        dias_funcionamento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
        intervalo_agendamento: 30,
        notificar_agendamentos: true,
        notificar_cancelamentos: true,
        lembrete_cliente: true,
        horas_lembrete: 24,
        metodo_pagamento_padrao: 'dinheiro',
        aceitar_pix: false
      };
    }
  }

  async updatePassword(userId, senhaAtual, novaSenha) {
    try {
      const bcrypt = require('bcrypt');
      const usuarioModel = new BaseModel('usuarios', 'id_usuario');
      
      // Buscar usuário
      const usuario = await usuarioModel.findBy({ id_usuario: userId });
      if (!usuario || usuario.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, usuario[0].senha);
      if (!senhaValida) {
        throw new Error('Senha atual incorreta');
      }

      // Criptografar nova senha
      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await usuarioModel.update(userId, { 
        senha: senhaCriptografada,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  }

  async logoutAllDevices(userId) {
    try {
      // Aqui você implementaria a lógica para invalidar todos os tokens
      // Por enquanto, apenas logamos a ação
      console.log(`Logout de todos os dispositivos para usuário ${userId}`);
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout de todos os dispositivos:', error);
      throw error;
    }
  }
}

module.exports = ConfiguracaoService;
