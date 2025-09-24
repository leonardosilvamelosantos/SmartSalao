const cron = require('node-cron');
const moment = require('moment-timezone');
const Usuario = require('../models/Usuario');
const Slot = require('../models/Slot');
const NotificationService = require('./NotificationService');
const BackupService = require('./BackupService');

/**
 * Serviço responsável por gerenciar jobs cron
 */
class CronJobService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Iniciar todos os jobs cron
   */
  startJobs() {
    console.log('🚀 Iniciando jobs cron...');

    if (process.env.ENABLE_CRON !== 'false') {
      // Job diário para geração de slots - roda às 02:00 todos os dias
      this.scheduleDailySlotGeneration();

      // Job de lembretes automáticos - roda a cada 30 minutos
      this.scheduleReminderNotifications();

      // Job de limpeza semanal - roda aos domingos às 03:00
      this.scheduleWeeklyCleanup();

      // Job de limpeza de cache expirado - roda diariamente às 04:00
      this.scheduleCacheCleanup();

      // Job de backup automático - roda diariamente às 03:00
      this.scheduleAutomaticBackup();
    } else {
      console.log('⏸️ CRON jobs desabilitados por ENV (ENABLE_CRON=false)');
    }

    console.log('✅ Jobs cron iniciados com sucesso');
  }

  /**
   * Agendar geração diária de slots
   */
  scheduleDailySlotGeneration() {
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Iniciando geração diária de slots...');

      try {
        await this.generateDailySlots();
        console.log('✅ Geração diária de slots concluída');
      } catch (error) {
        console.error('❌ Erro na geração diária de slots:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.push({
      name: 'daily-slot-generation',
      job: job,
      schedule: '0 2 * * *'
    });

    console.log('📅 Job de geração diária de slots agendado para 02:00 (America/Sao_Paulo)');
  }

  /**
   * Agendar lembretes automáticos
   */
  scheduleReminderNotifications() {
    const job = cron.schedule('*/30 * * * *', async () => {
      console.log('🔔 Verificando lembretes automáticos...');

      try {
        await this.sendReminderNotifications();
        console.log('✅ Lembretes verificados');
      } catch (error) {
        console.error('❌ Erro nos lembretes:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.push({
      name: 'reminder-notifications',
      job: job,
      schedule: '*/30 * * * *'
    });

    console.log('📅 Job de lembretes agendado para cada 30 minutos (America/Sao_Paulo)');
  }

  /**
   * Agendar limpeza semanal
   */
  scheduleWeeklyCleanup() {
    const job = cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 Iniciando limpeza semanal...');

      try {
        await this.weeklyCleanup();
        console.log('✅ Limpeza semanal concluída');
      } catch (error) {
        console.error('❌ Erro na limpeza semanal:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.push({
      name: 'weekly-cleanup',
      job: job,
      schedule: '0 3 * * 0'
    });

    console.log('📅 Job de limpeza semanal agendado para domingos às 03:00 (America/Sao_Paulo)');
  }

  /**
   * Agendar limpeza de cache
   */
  scheduleCacheCleanup() {
    const job = cron.schedule('0 4 * * *', async () => {
    // console.log('🗑️ Iniciando limpeza de cache...'); // Otimizado para reduzir spam no console

      try {
        await this.cleanupExpiredCache();
        console.log('✅ Limpeza de cache concluída');
      } catch (error) {
        console.error('❌ Erro na limpeza de cache:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.push({
      name: 'cache-cleanup',
      job: job,
      schedule: '0 4 * * *'
    });

    // console.log('📅 Job de limpeza de cache agendado para 04:00 (America/Sao_Paulo)'); // Otimizado para reduzir spam no console
  }

  /**
   * Agendar backup automático
   */
  scheduleAutomaticBackup() {
    const job = cron.schedule('0 3 * * *', async () => {
    // console.log('💾 Iniciando backup automático...'); // Otimizado para reduzir spam no console

      try {
        await this.performAutomaticBackup();
        console.log('✅ Backup automático concluído');
      } catch (error) {
        console.error('❌ Erro no backup automático:', error);
      }
    }, {
      timezone: "America/Sao_Paulo"
    });

    this.jobs.push({
      name: 'automatic-backup',
      job: job,
      schedule: '0 3 * * *'
    });

    console.log('📅 Job de backup automático agendado para 03:00 (America/Sao_Paulo)');
  }

  /**
   * Gerar slots para todos os usuários (job diário)
   */
  async generateDailySlots() {
    const usuarios = await Usuario.query('SELECT * FROM usuarios', []);

    // console.log(`👥 Processando ${usuarios.length} usuários...`); // Otimizado para reduzir spam no console

    for (const usuario of usuarios) {
      try {
        await this.generateSlotsForUser(usuario);
        console.log(`✅ Slots gerados para usuário ${usuario.id_usuario} (${usuario.nome})`);
      } catch (error) {
        console.error(`❌ Erro ao gerar slots para usuário ${usuario.id_usuario}:`, error);
      }
    }
  }

  /**
   * Gerar slots para um usuário específico
   */
  async generateSlotsForUser(usuario) {
    const configHorarios = usuario.config_horarios ? JSON.parse(usuario.config_horarios) : [];
    const maxAdvanceDays = usuario.max_advance_days || 60;
    const intervaloMin = usuario.intervalo_min || 15;
    const timezone = usuario.timezone || 'America/Sao_Paulo';

    console.log(`🔧 Configurações: maxAdvanceDays=${maxAdvanceDays}, intervalo=${intervaloMin}min, timezone=${timezone}`);

    let totalSlotsCreated = 0;

    // Processar cada dia nos próximos max_advance_days
    for (let dayOffset = 0; dayOffset <= maxAdvanceDays; dayOffset++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + dayOffset);
      currentDate.setHours(0, 0, 0, 0); // Resetar para início do dia

      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 6 = Sábado

      // Verificar se há configuração para este dia da semana
      const dayConfig = configHorarios.find(config => config.dia === dayOfWeek);

      if (dayConfig && dayConfig.inicio && dayConfig.fim) {
        const slotsCreated = await this.generateSlotsForDay(
          usuario.id_usuario,
          currentDate,
          dayConfig,
          intervaloMin,
          timezone
        );
        totalSlotsCreated += slotsCreated;
      }
    }

    return totalSlotsCreated;
  }

  /**
   * Gerar slots para um dia específico
   */
  async generateSlotsForDay(idUsuario, date, dayConfig, intervaloMin, timezone) {
    let slotsCreated = 0;

    // Parse dos horários locais
    const [startHour, startMinute] = dayConfig.inicio.split(':').map(Number);
    const [endHour, endMinute] = dayConfig.fim.split(':').map(Number);

    // Criar data de início no timezone local
    const startDateLocal = new Date(date);
    startDateLocal.setHours(startHour, startMinute, 0, 0);

    // Criar data de fim no timezone local
    const endDateLocal = new Date(date);
    endDateLocal.setHours(endHour, endMinute, 0, 0);

    // Converter para UTC para armazenamento no banco
    const startDateUTC = this.convertLocalToUTC(startDateLocal, timezone);
    const endDateUTC = this.convertLocalToUTC(endDateLocal, timezone);

    // console.log(`📅 Processando dia ${date.toISOString().split('T')[0]}: ${dayConfig.inicio}-${dayConfig.fim} (${timezone})`); // Otimizado para reduzir spam no console

    // Gerar slots dentro do horário de funcionamento
    let currentTimeLocal = new Date(startDateLocal);

    while (currentTimeLocal < endDateLocal) {
      const slotEndLocal = new Date(currentTimeLocal.getTime() + intervaloMin * 60000);

      // Verificar se o slot não ultrapassa o horário de fim
      if (slotEndLocal <= endDateLocal) {
        // Converter horários para UTC
        const slotStartUTC = this.convertLocalToUTC(currentTimeLocal, timezone);
        const slotEndUTC = this.convertLocalToUTC(slotEndLocal, timezone);

        // Verificar se o slot já existe
        const existingSlot = await Slot.query(`
          SELECT id_slot FROM slots
          WHERE id_usuario = ? AND data_agendamento = ? AND status = 'booked'
        `, [idUsuario, slotStartUTC]);

        // Só criar se não existir nenhum slot (mesmo que livre)
        if (existingSlot.length === 0) {
          // Verificar se existe slot livre para não sobrescrever
          const existingFreeSlot = await Slot.query(`
            SELECT id_slot FROM slots
            WHERE id_usuario = ? AND data_agendamento = ? AND status = 'free'
          `, [idUsuario, slotStartUTC]);

          if (existingFreeSlot.length === 0) {
            try {
              await Slot.create({
                id_usuario: idUsuario,
                data_agendamento: slotStartUTC,
                end_at: slotEndUTC,
                status: 'free'
              });
              slotsCreated++;
            } catch (error) {
              console.error(`Erro ao criar slot ${slotStartUTC.toISOString()}:`, error);
            }
          }
        }
      }

      // Avançar para o próximo slot
      currentTimeLocal = new Date(currentTimeLocal.getTime() + intervaloMin * 60000);
    }

    return slotsCreated;
  }

  /**
   * Converter horário local para UTC
   */
  convertLocalToUTC(localDate, timezone) {
    // Usar moment-timezone para conversão precisa
    const localMoment = moment.tz(localDate, timezone);
    return localMoment.utc().toDate();
  }

  /**
   * Converter horário UTC para local
   */
  convertUTCToLocal(utcDate, timezone) {
    // Usar moment-timezone para conversão precisa
    const utcMoment = moment.utc(utcDate);
    return utcMoment.tz(timezone).toDate();
  }

  /**
   * Enviar lembretes automáticos
   */
  async sendReminderNotifications() {
    try {
      const result = await NotificationService.sendReminders();
      return result;
    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
      throw error;
    }
  }

  /**
   * Limpeza semanal - remover slots antigos e livres
   */
  async weeklyCleanup() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Remover slots livres e bloqueados antigos
    const slotsDeleted = await Slot.query(`
      DELETE FROM slots
      WHERE data_agendamento < ?
      AND status IN ('free', 'blocked')
      AND id_agendamento IS NULL
    `, [thirtyDaysAgo]);

    // Remover notificações antigas (mais de 90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const notificationsDeleted = await Slot.query(`
      DELETE FROM notificacoes
      WHERE created_at < ?
    `, [ninetyDaysAgo]);

    console.log(`🗑️ ${slotsDeleted.length} slots antigos removidos`);
    console.log(`🗑️ ${notificationsDeleted.length} notificações antigas removidas`);

    return {
      slotsDeleted: slotsDeleted.length,
      notificationsDeleted: notificationsDeleted.length
    };
  }

  /**
   * Executar backup automático
   */
  async performAutomaticBackup() {
    try {
      const result = await BackupService.scheduledBackup();
      return result;
    } catch (error) {
      console.error('Erro no backup automático:', error);
      throw error;
    }
  }

  /**
   * Limpar cache expirado
   */
  async cleanupExpiredCache() {
    try {
      const result = await Slot.query(`
        DELETE FROM dashboard_cache
        WHERE expires_at < datetime('now')
      `);

    // console.log(`🗑️ ${result.length} registros de cache expirados removidos`); // Otimizado para reduzir spam no console
      return result.length;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return 0;
    }
  }

  /**
   * Parar todos os jobs
   */
  stopJobs() {
    console.log('🛑 Parando jobs cron...');

    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️ Job "${name}" parado`);
    });

    this.jobs = [];
    console.log('✅ Todos os jobs cron parados');
  }

  /**
   * Obter status dos jobs
   */
  getJobStatus() {
    return this.jobs.map(({ name, schedule, job }) => ({
      name,
      schedule,
      running: job.running
    }));
  }

  /**
   * Executar geração manual de slots (para testes)
   */
  async runManualSlotGeneration() {
    console.log('🔄 Executando geração manual de slots...');
    await this.generateDailySlots();
    console.log('✅ Geração manual concluída');
  }
}

module.exports = new CronJobService();
