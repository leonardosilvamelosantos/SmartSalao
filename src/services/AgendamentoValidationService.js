const BaseModel = require('../models/BaseModel');

class AgendamentoValidationService {
  constructor() {
    // Tabela 'configuracoes' é opcional; fallsback para defaults se não existir
    this.configuracaoModel = new BaseModel('configuracoes', 'id_configuracao');
    this.agendamentoModel = new BaseModel('agendamentos', 'id_agendamento');
  }

  /**
   * Validar se um agendamento pode ser criado
   * @param {number} userId - ID do usuário
   * @param {Object} agendamentoData - Dados do agendamento
   * @returns {Object} - Resultado da validação
   */
  async validateAgendamento(userId, agendamentoData) {
    try {
      // Buscar configurações do usuário
      const configuracoes = await this.getConfiguracoesUsuario(userId);
      
      if (!configuracoes) {
        return { valid: false, error: 'Configurações não encontradas' };
      }

      const { data_agendamento, duracao_min } = agendamentoData;
      
      const dataAgendamento = new Date(data_agendamento);
      
      const diaSemana = this.getDiaSemana(dataAgendamento);
      
      const horario = this.formatarHorario(dataAgendamento);

      // Validar dia da semana
      if (!this.validarDiaSemana(diaSemana, configuracoes.dias_funcionamento)) {
        return { 
          valid: false, 
          error: `Agendamentos não são permitidos aos ${this.getNomeDiaSemana(diaSemana)}s` 
        };
      }

      // Validar horário de funcionamento
      if (!this.validarHorarioFuncionamento(horario, configuracoes)) {
        return { 
          valid: false, 
          error: `Horário fora do funcionamento (${configuracoes.horario_abertura} - ${configuracoes.horario_fechamento})` 
        };
      }

      // Validar intervalo de agendamento
      if (!this.validarIntervalo(horario, configuracoes.intervalo_agendamento)) {
        return { 
          valid: false, 
          error: `Horário deve ser múltiplo de ${configuracoes.intervalo_agendamento} minutos` 
        };
      }

      // Validar se horário não está no passado
      if (dataAgendamento < new Date()) {
        return { valid: false, error: 'Não é possível agendar no passado' };
      }

      // Validar conflitos de horário
      const conflito = await this.verificarConflito(userId, data_agendamento, duracao_min);
      if (conflito) {
        return { valid: false, error: 'Já existe um agendamento neste horário' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Erro na validação do agendamento:', error);
      return { valid: false, error: 'Erro interno na validação' };
    }
  }

  /**
   * Gerar slots disponíveis para uma data específica
   * @param {number} userId - ID do usuário
   * @param {string} data - Data no formato YYYY-MM-DD
   * @returns {Array} - Array de slots disponíveis
   */
  async gerarSlotsDisponiveis(userId, data) {
    try {
      const configuracoes = await this.getConfiguracoesUsuario(userId);
      if (!configuracoes) {
        return [];
      }

      const dataAgendamento = new Date(data);
      const diaSemana = this.getDiaSemana(dataAgendamento);
      
      // Verificar se é dia de funcionamento
      if (!this.validarDiaSemana(diaSemana, configuracoes.dias_funcionamento)) {
        return [];
      }

      const slots = [];
      const inicio = this.parseTime(configuracoes.horario_abertura);
      const fim = this.parseTime(configuracoes.horario_fechamento);
      const intervalo = configuracoes.intervalo_agendamento;

      // Gerar slots baseados no intervalo
      for (let hora = inicio; hora < fim; hora += intervalo) {
        const slotTime = this.formatTime(hora);
        // Construir data com timezone local do servidor (evita ISO com TZ diferente)
        const [yy, mm, dd] = data.split('-').map(Number);
        const slotDateTime = new Date(yy, mm - 1, dd, Math.floor(hora / 60), hora % 60, 0, 0);

        // Verificar se slot não está no passado (considerando minutos)
        const agora = new Date();
        if (slotDateTime > agora) {
          // Verificar se slot está disponível
          const disponivel = await this.verificarSlotDisponivel(userId, slotDateTime);
          if (disponivel) {
            slots.push({
              horario: slotTime,
              datetime: slotDateTime.toISOString(),
              disponivel: true
            });
          }
        }
      }

      return slots;
    } catch (error) {
      console.error('Erro ao gerar slots disponíveis:', error);
      return [];
    }
  }

  /**
   * Buscar configurações do usuário
   */
  async getConfiguracoesUsuario(userId) {
    try {
      // Checar existência da tabela configuracoes no Postgres
      const pool = require('../config/database');
      let hasTable = true;
      try {
        const t = await pool.query("SELECT to_regclass('public.configuracoes') as exists");
        hasTable = !!t.rows?.[0]?.exists;
      } catch {
        hasTable = false;
      }

      const configs = hasTable ? await this.configuracaoModel.findBy({ id_usuario: userId }) : [];
      if (!configs || configs.length === 0) {
        // Fallback: configurações padrão quando não houver registro
        const defaultConfig = {
          id_usuario: userId,
          dias_funcionamento: ['segunda','terca','quarta','quinta','sexta','sabado'],
          horario_abertura: '08:00',
          horario_fechamento: '18:00',
          intervalo_agendamento: 15
        };
        return defaultConfig;
      }

      const config = configs[0];
      // Converter dias_funcionamento de JSON string para array
      if (config.dias_funcionamento && typeof config.dias_funcionamento === 'string') {
        try {
          config.dias_funcionamento = JSON.parse(config.dias_funcionamento);
        } catch (e) {
          config.dias_funcionamento = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        }
      }

      // Garantir defaults mínimos
      return {
        dias_funcionamento: ['segunda','terca','quarta','quinta','sexta','sabado'],
        horario_abertura: '08:00',
        horario_fechamento: '18:00',
        intervalo_agendamento: 15,
        ...config
      };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Em caso de erro, retornar defaults para não quebrar o fluxo
      return {
        dias_funcionamento: ['segunda','terca','quarta','quinta','sexta','sabado'],
        horario_abertura: '08:00',
        horario_fechamento: '18:00',
        intervalo_agendamento: 15
      };
    }
  }

  /**
   * Validar dia da semana
   */
  validarDiaSemana(diaSemana, diasFuncionamento) {
    return diasFuncionamento.includes(diaSemana);
  }

  /**
   * Validar horário de funcionamento
   */
  validarHorarioFuncionamento(horario, configuracoes) {
    const horarioAgendamento = this.parseTime(horario);
    const inicio = this.parseTime(configuracoes.horario_abertura);
    const fim = this.parseTime(configuracoes.horario_fechamento);
    
    // Incluir o horário de fechamento (18:00) como válido
    return horarioAgendamento >= inicio && horarioAgendamento <= fim;
  }

  /**
   * Validar intervalo de agendamento
   */
  validarIntervalo(horario, intervalo) {
    const [hora, minuto] = horario.split(':').map(Number);
    const totalMinutos = hora * 60 + minuto;
    
    // Usar o intervalo configurado pelo usuário
    const isValid = totalMinutos % intervalo === 0;
    
    console.log(`🔍 Validação de intervalo: ${horario} (${totalMinutos} min) % ${intervalo} = ${totalMinutos % intervalo} -> ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
    return isValid;
  }

  /**
   * Verificar conflito de horário
   */
  async verificarConflito(userId, data_agendamento, duracao_min) {
    try {
      const end_at = new Date(new Date(data_agendamento).getTime() + duracao_min * 60000);
      
      const conflitos = await this.agendamentoModel.query(`
        SELECT COUNT(*) as count FROM agendamentos 
        WHERE id_usuario = ? 
        AND status IN ('confirmed', 'pending')
        AND (
          (start_at < ? AND end_at > ?) OR
          (start_at < ? AND end_at > ?) OR
          (start_at >= ? AND end_at <= ?)
        )
      `, [userId, data_agendamento, data_agendamento, end_at, end_at, data_agendamento, end_at]);

      const count = parseInt(conflitos[0]?.count || 0);
      
      return count > 0;
    } catch (error) {
      console.error('Erro ao verificar conflito:', error);
      return true; // Em caso de erro, considerar como conflito
    }
  }

  /**
   * Verificar se slot está disponível
   */
  async verificarSlotDisponivel(userId, datetime) {
    try {
      const conflitos = await this.agendamentoModel.query(`
        SELECT COUNT(*) as count FROM agendamentos 
        WHERE id_usuario = ? 
        AND status IN ('confirmed', 'pending')
        AND start_at = ?
      `, [userId, datetime.toISOString()]);

      return parseInt(conflitos[0]?.count || 0) === 0;
    } catch (error) {
      console.error('Erro ao verificar slot disponível:', error);
      return false;
    }
  }

  /**
   * Utilitários
   */
  getDiaSemana(date) {
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return dias[date.getDay()];
  }

  getNomeDiaSemana(diaSemana) {
    const nomes = {
      'segunda': 'Segunda-feira',
      'terca': 'Terça-feira', 
      'quarta': 'Quarta-feira',
      'quinta': 'Quinta-feira',
      'sexta': 'Sexta-feira',
      'sabado': 'Sábado',
      'domingo': 'Domingo'
    };
    return nomes[diaSemana] || diaSemana;
  }

  formatarHorario(date) {
    try {
      // Converter para timezone do Brasil (America/Sao_Paulo) para validação
      const options = { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      return date.toLocaleTimeString('pt-BR', options);
    } catch (error) {
      console.error('Erro ao formatar horário:', error);
      // Fallback: usar horário local
      const hora = date.getHours().toString().padStart(2, '0');
      const minuto = date.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minuto}`;
    }
  }

  parseTime(timeString) {
    const [hora, minuto] = timeString.split(':').map(Number);
    return hora * 60 + minuto;
  }

  formatTime(minutes) {
    const hora = Math.floor(minutes / 60);
    const minuto = minutes % 60;
    return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
  }
}

module.exports = AgendamentoValidationService;
