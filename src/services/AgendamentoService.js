const BaseModel = require('../models/BaseModel');
const AgendamentoValidationService = require('./AgendamentoValidationService');

class AgendamentoService {
  constructor() {
    this.agendamentoModel = new BaseModel('agendamentos', 'id_agendamento');
    this.clienteModel = new BaseModel('clientes', 'id_cliente');
    this.servicoModel = new BaseModel('servicos', 'id_servico');
    this.validationService = new AgendamentoValidationService();
  }

  /**
   * Criar novo agendamento
   * @param {number} userId - ID do usuário
   * @param {Object} agendamentoData - Dados do agendamento
   * @returns {Object} - Resultado da operação
   */
  async criarAgendamento(userId, agendamentoData) {
    try {
      // Validar dados obrigatórios
      if (!agendamentoData.id_cliente && !agendamentoData.nome_cliente_manual) {
        return { success: false, message: 'ID do cliente ou nome do cliente é obrigatório' };
      }
      
      if (!agendamentoData.id_servico) {
        return { success: false, message: 'ID do serviço é obrigatório' };
      }
      
      if (!agendamentoData.start_at) {
        return { success: false, message: 'Data/hora de início é obrigatória' };
      }
      
      const { id_cliente, id_servico, data_agendamento, start_at, observacoes, nome_cliente_manual, telefone_cliente_manual } = agendamentoData;

      // Buscar dados do serviço para obter duração
      const servico = await this.servicoModel.findById(id_servico);
      if (!servico) {
        return { success: false, message: 'Serviço não encontrado' };
      }

      // Determinar se é cliente cadastrado ou manual
      let clienteId = id_cliente;
      let clienteNome = null;

      if (id_cliente) {
        // Cliente cadastrado - buscar dados
        const cliente = await this.clienteModel.findById(id_cliente);
        if (!cliente || cliente.id_usuario !== userId) {
          return { success: false, message: 'Cliente não encontrado ou não pertence ao usuário' };
        }
        clienteNome = cliente.nome;
      } else if (nome_cliente_manual) {
        // Cliente manual - verificar se já existe ou criar novo
        const whatsappCliente = telefone_cliente_manual || `m${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 2)}`;
        
        // Tentar encontrar cliente existente primeiro
        let clienteExistente = null;
        if (telefone_cliente_manual) {
          const clientes = await this.clienteModel.query(
            'SELECT * FROM clientes WHERE id_usuario = $1 AND whatsapp = $2',
            [userId, telefone_cliente_manual]
          );
          clienteExistente = clientes[0] || null;
        }
        
        if (clienteExistente) {
          clienteId = clienteExistente.id_cliente;
          clienteNome = clienteExistente.nome;
          console.log(`✅ Cliente manual encontrado: ${clienteNome} (ID: ${clienteId})`);
        } else {
          // Criar novo cliente manual
          const clienteManual = {
            id_usuario: userId,
            nome: nome_cliente_manual,
            whatsapp: whatsappCliente,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('👤 Criando cliente manual:', clienteManual);
          
          try {
            clienteId = await this.clienteModel.create(clienteManual);
            clienteNome = nome_cliente_manual;
            console.log(`✅ Cliente manual criado com sucesso: ${nome_cliente_manual} (ID: ${clienteId})`);
          } catch (error) {
            console.error('❌ Erro ao criar cliente manual:', error);
            return { success: false, message: 'Erro ao criar cliente: ' + error.message };
          }
        }
      } else {
        return { success: false, message: 'Dados do cliente não fornecidos' };
      }

      // Validar agendamento
      const validacao = await this.validationService.validateAgendamento(userId, {
        data_agendamento: start_at || data_agendamento,
        duracao_min: servico.duracao_min
      });

      if (!validacao.valid) {
        return { success: false, message: validacao.error };
      }

      // Calcular end_at
      const startAt = new Date(start_at || data_agendamento);
      const end_at = new Date(startAt.getTime() + servico.duracao_min * 60000);

      // Garantir que clienteId seja um número
      const clienteIdFinal = typeof clienteId === 'object' ? clienteId.id_cliente : clienteId;
      
      // Verificar configurações de auto confirmação
      let statusInicial = 'pending';
      try {
        const ConfiguracaoService = require('./ConfiguracaoService');
        const configService = new ConfiguracaoService();
        const configuracoes = await configService.getConfiguracoes(userId);
        
        if (configuracoes && configuracoes.auto_confirm_whatsapp) {
          statusInicial = 'confirmed';
        }
      } catch (error) {
        // Em caso de erro, manter como pending
      }

      const novoAgendamento = {
        id_usuario: userId,
        id_cliente: clienteIdFinal,
        id_servico,
        start_at: startAt.toISOString(),
        end_at: end_at.toISOString(),
        status: statusInicial,
        observacoes: observacoes || ''
      };

      const id = await this.agendamentoModel.create(novoAgendamento);
      
      // Buscar agendamento criado com dados relacionados
      const agendamentoId = id.id_agendamento || id;
      const agendamentoCompleto = await this.buscarAgendamentoCompleto(agendamentoId);

      if (!agendamentoCompleto) {
        return { 
          success: false, 
          message: 'Agendamento criado mas erro ao buscar dados completos'
        };
      }

      return { 
        success: true, 
        message: 'Agendamento criado com sucesso',
        data: agendamentoCompleto
      };
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar agendamentos do usuário
   * @param {number} userId - ID do usuário
   * @param {Object} filtros - Filtros de busca
   * @returns {Object} - Lista de agendamentos
   */
  async buscarAgendamentos(userId, filtros = {}) {
    try {
      const { data_inicio, data_fim, status, cliente_id } = filtros;
      
      let where = 'a.id_usuario = $1';
      const params = [userId];
      let p = 2;

      if (data_inicio) {
        where += ` AND a.start_at >= $${p++}`;
        params.push(data_inicio);
      }

      if (data_fim) {
        where += ` AND a.start_at <= $${p++}`;
        params.push(data_fim);
      }

      if (status) {
        where += ` AND a.status = $${p++}`;
        params.push(status);
      }

      if (cliente_id) {
        where += ` AND a.id_cliente = $${p++}`;
        params.push(cliente_id);
      }

      const agendamentos = await this.agendamentoModel.query(`
        SELECT 
          a.*,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          s.nome_servico,
          s.duracao_min,
          s.valor
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE ${where}
        ORDER BY a.start_at ASC
      `, params);

      return { success: true, data: agendamentos };
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar agendamento completo por ID
   * @param {number} id - ID do agendamento
   * @returns {Object} - Agendamento com dados relacionados
   */
  async buscarAgendamentoCompleto(id) {
    try {
      const agendamentos = await this.agendamentoModel.query(`
        SELECT 
          a.*,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          s.nome_servico,
          s.duracao_min,
          s.valor,
          s.descricao as servico_descricao
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_agendamento = $1
      `, [id]);

      return agendamentos[0] || null;
    } catch (error) {
      console.error('Erro ao buscar agendamento completo:', error);
      return null;
    }
  }

  /**
   * Atualizar agendamento
   * @param {number} id - ID do agendamento
   * @param {number} userId - ID do usuário
   * @param {Object} dadosAtualizacao - Dados para atualizar
   * @returns {Object} - Resultado da operação
   */
  async atualizarAgendamento(id, userId, dadosAtualizacao) {
    try {
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      if (!agendamento || agendamento.id_usuario !== userId) {
        return { success: false, message: 'Agendamento não encontrado' };
      }

      // Se está alterando horário, validar
      if (dadosAtualizacao.data_agendamento) {
        const servico = await this.servicoModel.findById(agendamento.id_servico);
        const validacao = await this.validationService.validateAgendamento(userId, {
          data_agendamento: dadosAtualizacao.data_agendamento,
          duracao_min: servico.duracao_min
        });

        if (!validacao.valid) {
          return { success: false, message: validacao.error };
        }

        // Recalcular end_at
        const end_at = new Date(new Date(dadosAtualizacao.data_agendamento).getTime() + servico.duracao_min * 60000);
        dadosAtualizacao.end_at = end_at.toISOString();
      }

      dadosAtualizacao.updated_at = new Date().toISOString();

      await this.agendamentoModel.update(id, dadosAtualizacao);
      
      const agendamentoAtualizado = await this.buscarAgendamentoCompleto(id);

      return { 
        success: true, 
        message: 'Agendamento atualizado com sucesso',
        data: agendamentoAtualizado
      };
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Cancelar agendamento
   * @param {number} id - ID do agendamento
   * @param {number} userId - ID do usuário
   * @returns {Object} - Resultado da operação
   */
  async cancelarAgendamento(id, userId) {
    try {
      console.log(`🗑️ Cancelando agendamento ID: ${id} para usuário: ${userId}`);
      
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      console.log(`🔍 Agendamento encontrado:`, agendamento);
      
      if (!agendamento || agendamento.id_usuario !== userId) {
        console.log(`❌ Agendamento não encontrado ou não pertence ao usuário`);
        return { success: false, message: 'Agendamento não encontrado' };
      }

      // Verificar se pode ser cancelado
      if (agendamento.status === 'cancelled') {
        console.log(`⚠️ Agendamento já foi cancelado`);
        return { success: false, message: 'Agendamento já foi cancelado' };
      }

      console.log(`✅ Atualizando status para 'cancelled'`);
      await this.agendamentoModel.update(id, {
        status: 'cancelled'
      });

      console.log(`✅ Agendamento cancelado com sucesso`);
      return { success: true, message: 'Agendamento cancelado com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao cancelar agendamento:', error);
      console.error('Stack trace:', error.stack);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Excluir agendamento permanentemente
   * @param {number} id - ID do agendamento
   * @param {number} userId - ID do usuário
   * @returns {Object} - Resultado da operação
   */
  async excluirAgendamento(id, userId) {
    try {
      console.log(`🗑️ Excluindo permanentemente agendamento ID: ${id} para usuário: ${userId}`);
      
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      console.log(`🔍 Agendamento encontrado:`, agendamento);
      
      if (!agendamento || agendamento.id_usuario !== userId) {
        console.log(`❌ Agendamento não encontrado ou não pertence ao usuário`);
        return { success: false, message: 'Agendamento não encontrado' };
      }

      console.log(`✅ Excluindo agendamento permanentemente`);
      await this.agendamentoModel.delete(id);

      console.log(`✅ Agendamento excluído permanentemente`);
      return { success: true, message: 'Agendamento excluído permanentemente' };
    } catch (error) {
      console.error('❌ Erro ao excluir agendamento:', error);
      console.error('Stack trace:', error.stack);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Confirmar agendamento
   * @param {number} id - ID do agendamento
   * @param {number} userId - ID do usuário
   * @returns {Object} - Resultado da operação
   */
  async confirmarAgendamento(id, userId) {
    try {
      console.log(`✅ Confirmando agendamento ID: ${id} para usuário: ${userId}`);
      
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      console.log(`🔍 Agendamento encontrado:`, agendamento);
      
      if (!agendamento || agendamento.id_usuario !== userId) {
        console.log(`❌ Agendamento não encontrado ou não pertence ao usuário`);
        return { success: false, message: 'Agendamento não encontrado' };
      }

      console.log(`✅ Atualizando status para 'confirmed'`);
      await this.agendamentoModel.update(id, {
        status: 'confirmed'
      });

      console.log(`✅ Agendamento confirmado com sucesso`);
      return { success: true, message: 'Agendamento confirmado com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao confirmar agendamento:', error);
      console.error('Stack trace:', error.stack);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Gerar slots disponíveis
   * @param {number} userId - ID do usuário
   * @param {string} data - Data no formato YYYY-MM-DD
   * @returns {Object} - Slots disponíveis
   */
  async gerarSlotsDisponiveis(userId, data) {
    try {
      const slots = await this.validationService.gerarSlotsDisponiveis(userId, data);
      return { success: true, data: slots };
    } catch (error) {
      console.error('Erro ao gerar slots disponíveis:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
}

module.exports = AgendamentoService;
