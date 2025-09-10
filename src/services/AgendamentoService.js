const BaseModel = require('../models/BaseModel');
const AgendamentoValidationService = require('./AgendamentoValidationService');

class AgendamentoService {
  constructor() {
    this.agendamentoModel = new BaseModel('agendamentos');
    this.clienteModel = new BaseModel('clientes');
    this.servicoModel = new BaseModel('servicos');
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
      const { id_cliente, id_servico, start_at, observacoes } = agendamentoData;

      // Buscar dados do serviço para obter duração
      const servico = await this.servicoModel.findById(id_servico);
      if (!servico) {
        return { success: false, message: 'Serviço não encontrado' };
      }

      // Validar agendamento
      const validacao = await this.validationService.validateAgendamento(userId, {
        start_at,
        duracao_min: servico.duracao_min
      });

      if (!validacao.valid) {
        return { success: false, message: validacao.error };
      }

      // Calcular end_at
      const end_at = new Date(new Date(start_at).getTime() + servico.duracao_min * 60000);

      // Criar agendamento
      const novoAgendamento = {
        id_usuario: userId,
        id_cliente,
        id_servico,
        start_at,
        end_at: end_at.toISOString(),
        status: 'pending',
        observacoes: observacoes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const id = await this.agendamentoModel.create(novoAgendamento);
      
      // Buscar agendamento criado com dados relacionados
      const agendamentoCompleto = await this.buscarAgendamentoCompleto(id);

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
      
      let where = 'a.id_usuario = ?';
      const params = [userId];

      if (data_inicio) {
        where += ' AND a.start_at >= ?';
        params.push(data_inicio);
      }

      if (data_fim) {
        where += ' AND a.start_at <= ?';
        params.push(data_fim);
      }

      if (status) {
        where += ' AND a.status = ?';
        params.push(status);
      }

      if (cliente_id) {
        where += ' AND a.id_cliente = ?';
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
          c.email as cliente_email,
          s.nome_servico,
          s.duracao_min,
          s.valor,
          s.descricao as servico_descricao
        FROM agendamentos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN servicos s ON a.id_servico = s.id_servico
        WHERE a.id_agendamento = ?
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
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      if (!agendamento || agendamento.id_usuario !== userId) {
        return { success: false, message: 'Agendamento não encontrado' };
      }

      // Verificar se pode ser cancelado
      if (agendamento.status === 'cancelled') {
        return { success: false, message: 'Agendamento já foi cancelado' };
      }

      await this.agendamentoModel.update(id, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      });

      return { success: true, message: 'Agendamento cancelado com sucesso' };
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
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
      // Verificar se agendamento pertence ao usuário
      const agendamento = await this.agendamentoModel.findById(id);
      if (!agendamento || agendamento.id_usuario !== userId) {
        return { success: false, message: 'Agendamento não encontrado' };
      }

      await this.agendamentoModel.update(id, {
        status: 'confirmed',
        updated_at: new Date().toISOString()
      });

      return { success: true, message: 'Agendamento confirmado com sucesso' };
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
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
