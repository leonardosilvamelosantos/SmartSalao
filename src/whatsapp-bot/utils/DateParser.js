const moment = require('moment-timezone');

/**
 * Utilitário para interpretação de datas e horários em linguagem natural
 * Suporta expressões como: "amanhã às 14h", "sexta-feira 15h", "hoje de manhã", etc.
 */
class DateParser {

  constructor() {
    this.timezone = 'America/Sao_Paulo';
    this.locale = 'pt-br';
    moment.locale(this.locale);
  }

  /**
   * Interpreta uma string de entrada e retorna data e horário
   * @param {string} input - Texto com data/horário
   * @returns {Object|null} - { date: Date, time: string, confidence: number }
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const normalizedInput = this.normalizeInput(input);

    // Tentar diferentes padrões de interpretação
    const patterns = [
      this.parseRelativeDayWithTime.bind(this),
      this.parseSpecificDayWithTime.bind(this),
      this.parseTimeOnly.bind(this),
      this.parseDateOnly.bind(this)
    ];

    for (const pattern of patterns) {
      const result = pattern(normalizedInput);
      if (result) {
        result.confidence = this.calculateConfidence(result, normalizedInput);
        return result;
      }
    }

    return null;
  }

  /**
   * Normaliza a entrada removendo acentos e convertendo para minúsculo
   */
  normalizeInput(input) {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Interpreta expressões como "amanhã às 14h", "hoje de manhã"
   */
  parseRelativeDayWithTime(input) {
    const relativeDays = {
      'hoje': 0,
      'amanha': 1,
      'depois de amanha': 2,
      'amanha de manha': 1,
      'amanha a tarde': 1,
      'amanha a noite': 1,
      'hoje de manha': 0,
      'hoje a tarde': 0,
      'hoje a noite': 0
    };

    for (const [dayKey, daysOffset] of Object.entries(relativeDays)) {
      if (input.includes(dayKey)) {
        const timeResult = this.extractTime(input);
        if (timeResult) {
          const date = moment().tz(this.timezone).add(daysOffset, 'days');
          return {
            date: date.toDate(),
            time: timeResult.time,
            period: timeResult.period,
            originalInput: input
          };
        }
      }
    }

    return null;
  }

  /**
   * Interpreta expressões como "sexta-feira 15h", "quinta 14:30"
   */
  parseSpecificDayWithTime(input) {
    const weekdays = {
      'domingo': 0,
      'segunda': 1,
      'terca': 2,
      'quarta': 3,
      'quinta': 4,
      'sexta': 5,
      'sabado': 6
    };

    for (const [dayName, dayIndex] of Object.entries(weekdays)) {
      if (input.includes(dayName)) {
        const timeResult = this.extractTime(input);
        if (timeResult) {
          let targetDate = moment().tz(this.timezone);

          // Se o dia da semana já passou esta semana, vai para próxima semana
          const currentDay = targetDate.day();
          let daysToAdd = dayIndex - currentDay;

          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }

          if (daysToAdd === 0 && moment().tz(this.timezone).hour() >= timeResult.hour) {
            // Se é hoje e o horário já passou, vai para próxima semana
            daysToAdd = 7;
          }

          targetDate = targetDate.add(daysToAdd, 'days');

          return {
            date: targetDate.toDate(),
            time: timeResult.time,
            period: timeResult.period,
            originalInput: input
          };
        }
      }
    }

    return null;
  }

  /**
   * Interpreta apenas horários como "14h", "15:30", "9 da manhã"
   */
  parseTimeOnly(input) {
    const timeResult = this.extractTime(input);
    if (timeResult) {
      const date = moment().tz(this.timezone);
      const targetTime = moment().tz(this.timezone)
        .hour(timeResult.hour)
        .minute(timeResult.minute || 0);

      // Se o horário já passou hoje, assume amanhã
      if (targetTime.isBefore(date)) {
        date.add(1, 'day');
      }

      return {
        date: date.toDate(),
        time: timeResult.time,
        period: timeResult.period,
        originalInput: input
      };
    }

    return null;
  }

  /**
   * Interpreta apenas datas como "15/09", "15 de setembro"
   */
  parseDateOnly(input) {
    const dateResult = this.extractDate(input);
    if (dateResult) {
      return {
        date: dateResult.date,
        time: null,
        originalInput: input
      };
    }

    return null;
  }

  /**
   * Extrai horário da string
   */
  extractTime(input) {
    // Padrões de horário
    const patterns = [
      // 14h, 15h30, 9h
      /(?:as|às|a)\s*(\d{1,2})(?:h|:(\d{2}))?\s*(da\s+)?(manha|tarde|noite)?/i,
      // 14:30, 9:45
      /(\d{1,2}):(\d{2})\s*(da\s+)?(manha|tarde|noite)?/i,
      // meio dia, meio-dia
      /(meio.?dia|meio.?dia)/i,
      // uma hora, duas horas
      /(uma?|duas?|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+hora/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return this.parseTimeMatch(match);
      }
    }

    return null;
  }

  /**
   * Processa match de horário
   */
  parseTimeMatch(match) {
    let hour = 0;
    let minute = 0;
    let period = null;

    if (match[1]) {
      // Horário numérico
      hour = parseInt(match[1]);

      if (match[2]) {
        minute = parseInt(match[2]);
      }

      // Ajustar período baseado na palavra chave
      if (match[4]) {
        period = match[4].toLowerCase();
        if (period === 'tarde' && hour < 12) hour += 12;
        if (period === 'noite' && hour < 12) hour += 12;
        if (period === 'manha' && hour > 12) hour -= 12;
      } else {
        // Sem período especificado, assumir baseado no horário
        if (hour >= 1 && hour <= 6) period = 'manha';
        else if (hour >= 7 && hour <= 12) period = 'manha';
        else if (hour >= 13 && hour <= 18) period = 'tarde';
        else if (hour >= 19 || hour === 0) period = 'noite';
      }
    } else if (match[0].includes('meio')) {
      hour = 12;
      minute = 0;
      period = 'tarde';
    }

    // Validar horário
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    return {
      hour,
      minute,
      time: timeString,
      period
    };
  }

  /**
   * Extrai data da string
   */
  extractDate(input) {
    // Padrões de data
    const patterns = [
      // 15/09, 15/09/2024
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/,
      // 15 de setembro, 15 de setembro de 2024
      /(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return this.parseDateMatch(match);
      }
    }

    return null;
  }

  /**
   * Processa match de data
   */
  parseDateMatch(match) {
    let day, month, year;

    if (match[1] && match[2]) {
      // Formato numérico
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = match[3] ? parseInt(match[3]) : moment().tz(this.timezone).year();
    } else {
      // Formato por extenso
      day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      year = match[3] ? parseInt(match[3]) : moment().tz(this.timezone).year();

      const months = {
        'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4,
        'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
        'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
      };

      month = months[monthName];
    }

    if (!month || day < 1 || day > 31) {
      return null;
    }

    const date = moment.tz(`${year}-${month}-${day}`, 'YYYY-M-D', this.timezone);

    if (!date.isValid()) {
      return null;
    }

    return {
      date: date.toDate(),
      day,
      month,
      year
    };
  }

  /**
   * Calcula nível de confiança na interpretação
   */
  calculateConfidence(result, input) {
    let confidence = 0.5; // Base

    // Aumenta confiança se encontrou dia específico
    if (result.date && result.time) confidence += 0.3;
    else if (result.date) confidence += 0.1;
    else if (result.time) confidence += 0.2;

    // Diminui confiança se teve que fazer muitas inferências
    if (result.period && !input.includes(result.period)) confidence -= 0.1;

    // Aumenta confiança se a data está no futuro próximo
    const now = moment().tz(this.timezone);
    const resultMoment = moment(result.date).tz(this.timezone);
    const daysDiff = resultMoment.diff(now, 'days');

    if (daysDiff >= 0 && daysDiff <= 30) confidence += 0.1;
    else if (daysDiff < 0) confidence -= 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Formata data para exibição amigável
   */
  formatFriendly(result) {
    if (!result || !result.date) return 'Data não reconhecida';

    const date = moment(result.date).tz(this.timezone);
    const today = moment().tz(this.timezone);
    const tomorrow = moment().tz(this.timezone).add(1, 'day');

    let dateStr;

    if (date.isSame(today, 'day')) {
      dateStr = 'hoje';
    } else if (date.isSame(tomorrow, 'day')) {
      dateStr = 'amanhã';
    } else {
      dateStr = date.format('dddd, DD/MM');
    }

    if (result.time) {
      return `${dateStr} às ${result.time}`;
    }

    return dateStr;
  }

  /**
   * Valida se a data/horário está dentro do horário comercial
   */
  isBusinessHours(result) {
    if (!result || !result.time) return false;

    const [hour, minute] = result.time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;

    // Horário comercial: 8:00 - 18:00 (8h às 18h)
    const businessStart = 8 * 60;
    const businessEnd = 18 * 60;

    return totalMinutes >= businessStart && totalMinutes <= businessEnd;
  }
}

module.exports = new DateParser();


