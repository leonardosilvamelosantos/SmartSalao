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
      console.log('🔍 [DEBUG] AgendamentoService.criarAgendamento chamado com dados:', agendamentoData);
      
      const { id_cliente, id_servico, start_at, observacoes, nome_cliente_manual, telefone_cliente_manual } = agendamentoData;

      // Buscar dados do serviço para obter duração
      console.log('🔍 Buscando serviço ID:', id_servico);
      const servico = await this.servicoModel.findById(id_servico);
      if (!servico) {
        console.log('❌ Serviço não encontrado para ID:', id_servico);
        return { success: false, message: 'Serviço não encontrado' };
      }
      console.log('✅ Serviço encontrado:', servico);

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
            email: '',
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
      console.log('🔍 Validando agendamento...');
      const validacao = await this.validationService.validateAgendamento(userId, {
        start_at,
        duracao_min: servico.duracao_min
      });

      console.log('🔍 Resultado da validação:', validacao);
      if (!validacao.valid) {
        console.log('❌ Validação falhou:', validacao.error);
        return { success: false, message: validacao.error };
      }
      console.log('✅ Validação passou');

      // Calcular end_at
      const end_at = new Date(new Date(start_at).getTime() + servico.duracao_min * 60000);

      // Garantir que clienteId seja um número
      const clienteIdFinal = typeof clienteId === 'object' ? clienteId.id_cliente : clienteId;
      
      // Criar agendamento
      console.log('📅 Dados do agendamento:', {
        start_at: start_at,
        end_at: end_at.toISOString(),
        start_at_parsed: new Date(start_at),
        start_at_local: new Date(start_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        cliente_id: clienteIdFinal,
        cliente_nome: clienteNome
      });
      
      // Verificar configurações de auto confirmação
      let statusInicial = 'pending';
      try {
        const ConfiguracaoService = require('./ConfiguracaoService');
        const configService = new ConfiguracaoService();
        const configuracoes = await configService.getConfiguracoes(userId);
        
        if (configuracoes && configuracoes.auto_confirm_whatsapp) {
          console.log('🤖 Auto confirmação ativa - agendamento será confirmado automaticamente');
          statusInicial = 'confirmed';
        } else {
          console.log('⏳ Auto confirmação inativa - agendamento ficará pendente');
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar configurações de auto confirmação:', error.message);
        // Em caso de erro, manter como pending
      }

      const novoAgendamento = {
        id_usuario: userId,
        id_cliente: clienteIdFinal,
        id_servico,
        start_at,
        end_at: end_at.toISOString(),
        status: statusInicial,
        observacoes: observacoes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Criando agendamento no banco de dados...');
      const id = await this.agendamentoModel.create(novoAgendamento);
      console.log('✅ Agendamento criado com ID:', id);
      
      // Buscar agendamento criado com dados relacionados
      console.log('🔍 Buscando agendamento completo...');
      const agendamentoCompleto = await this.buscarAgendamentoCompleto(id);
      console.log('✅ Agendamento completo encontrado:', agendamentoCompleto);

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
    // Log reduzido para evitar spam
    // console.log('🔍 [DEBUG] AgendamentoService.buscarAgendamentos chamado');
      
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

      // Log reduzido
      // console.log('🔍 [DEBUG] Query WHERE:', where);

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

      // Log reduzido
      // console.log('🔍 [DEBUG] Resultado da query:', agendamentos.length, 'agendamentos');

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
      console.log(`🔍 Buscando agendamento completo ID: ${id}`);
      
      const agendamentos = await this.agendamentoModel.query(`
        SELECT 
          a.*,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          c.email as cliente_email,
          s.nome_servico,
          s.duracao_min,
          s.valor,
          s.descricao as servico_descricao
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_agendamento = $1
      `, [id]);

      console.log(`🔍 Resultado da busca:`, agendamentos);
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
      if (dadosAtualizacao.start_at) {
        const servico = await this.servicoModel.findById(agendamento.id_servico);
        const validacao = await this.validationService.validateAgendamento(userId, {
          start_at: dadosAtualizacao.start_at,
          duracao_min: servico.duracao_min
        });

        if (!validacao.valid) {
          return { success: false, message: validacao.error };
        }

        // Recalcular end_at
        const end_at = new Date(new Date(dadosAtualizacao.start_at).getTime() + servico.duracao_min * 60000);
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
