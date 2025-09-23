/**
 * Serviço de Alertas de Segurança
 * Monitora e registra eventos de segurança críticos
 */
const pool = require('../config/database');

class SecurityAlertService {
  constructor() {
    this.alertThresholds = {
      failedLogins: 5, // 5 tentativas de login falhadas
      unauthorizedAccess: 3, // 3 tentativas de acesso não autorizado
      sqlInjectionAttempts: 1, // 1 tentativa de SQL injection
      rateLimitExceeded: 10 // 10 excedências de rate limit
    };
  }

  /**
   * Registrar evento de segurança
   */
  async logSecurityEvent(eventType, details, req = null) {
    try {
      const eventData = {
        event_type: eventType,
        details: JSON.stringify(details),
        ip_address: req?.ip || 'unknown',
        user_agent: req?.get('User-Agent') || 'unknown',
        tenant_id: req?.user?.tenant_id || null,
        user_id: req?.user?.id || null,
        timestamp: new Date().toISOString()
      };

      // Inserir no banco de dados
      await pool.query(`
        INSERT INTO security_events (
          event_type, details, ip_address, user_agent, 
          tenant_id, user_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        eventData.event_type,
        eventData.details,
        eventData.ip_address,
        eventData.user_agent,
        eventData.tenant_id,
        eventData.user_id,
        eventData.timestamp
      ]);

      // Verificar se deve gerar alerta
      await this.checkAlertThresholds(eventType, eventData);

      console.warn(`🚨 Security Event: ${eventType} - ${JSON.stringify(details)}`);

    } catch (error) {
      console.error('Erro ao registrar evento de segurança:', error);
    }
  }

  /**
   * Verificar se deve gerar alerta baseado em thresholds
   */
  async checkAlertThresholds(eventType, eventData) {
    try {
      const threshold = this.alertThresholds[eventType];
      if (!threshold) return;

      // Contar eventos do mesmo tipo na última hora
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const countResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM security_events 
        WHERE event_type = ? 
        AND ip_address = ? 
        AND timestamp > ?
      `, [eventType, eventData.ip_address, oneHourAgo]);

      const count = parseInt(countResult.rows[0]?.count || 0);

      if (count >= threshold) {
        await this.generateSecurityAlert(eventType, count, eventData);
      }

    } catch (error) {
      console.error('Erro ao verificar thresholds de segurança:', error);
    }
  }

  /**
   * Gerar alerta de segurança
   */
  async generateSecurityAlert(eventType, count, eventData) {
    try {
      const alertData = {
        alert_type: eventType,
        severity: this.getSeverityLevel(eventType),
        count,
        ip_address: eventData.ip_address,
        tenant_id: eventData.tenant_id,
        details: {
          message: this.getAlertMessage(eventType, count),
          first_occurrence: eventData.timestamp,
          threshold_exceeded: true
        },
        status: 'active',
        created_at: new Date().toISOString()
      };

      // Inserir alerta
      await pool.query(`
        INSERT INTO security_alerts (
          alert_type, severity, count, ip_address, tenant_id, 
          details, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertData.alert_type,
        alertData.severity,
        alertData.count,
        alertData.ip_address,
        alertData.tenant_id,
        JSON.stringify(alertData.details),
        alertData.status,
        alertData.created_at
      ]);

      // Log crítico
      console.error(`🚨🚨🚨 SECURITY ALERT: ${eventType} - ${count} occurrences from ${eventData.ip_address}`);

      // Aqui você pode adicionar notificações externas (email, Slack, etc.)
      await this.sendExternalAlert(alertData);

    } catch (error) {
      console.error('Erro ao gerar alerta de segurança:', error);
    }
  }

  /**
   * Obter nível de severidade
   */
  getSeverityLevel(eventType) {
    const severityLevels = {
      sqlInjectionAttempts: 'critical',
      unauthorizedAccess: 'high',
      failedLogins: 'medium',
      rateLimitExceeded: 'low'
    };
    return severityLevels[eventType] || 'medium';
  }

  /**
   * Obter mensagem de alerta
   */
  getAlertMessage(eventType, count) {
    const messages = {
      sqlInjectionAttempts: `Tentativa de SQL injection detectada (${count} ocorrências)`,
      unauthorizedAccess: `Múltiplas tentativas de acesso não autorizado (${count} ocorrências)`,
      failedLogins: `Múltiplas tentativas de login falhadas (${count} ocorrências)`,
      rateLimitExceeded: `Rate limit excedido múltiplas vezes (${count} ocorrências)`
    };
    return messages[eventType] || `Evento de segurança suspeito (${count} ocorrências)`;
  }

  /**
   * Enviar alerta externo (email, Slack, etc.)
   */
  async sendExternalAlert(alertData) {
    try {
      // Notificação por email
      if (process.env.SECURITY_ALERTS_EMAIL) {
        await this.sendEmailAlert(alertData);
      }

      // Notificação por Slack
      if (process.env.SECURITY_ALERTS_SLACK_WEBHOOK) {
        await this.sendSlackAlert(alertData);
      }

      // Notificação por Discord (opcional)
      if (process.env.SECURITY_ALERTS_DISCORD_WEBHOOK) {
        await this.sendDiscordAlert(alertData);
      }

      // Log crítico sempre
      if (alertData.severity === 'critical') {
        console.error(`🔴 CRITICAL ALERT: ${alertData.alert_type} - Immediate attention required!`);
      }

    } catch (error) {
      console.error('Erro ao enviar notificação externa:', error);
    }
  }

  /**
   * Enviar alerta por email
   */
  async sendEmailAlert(alertData) {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const severityEmojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const mailOptions = {
      from: process.env.SMTP_FROM || 'security@agendamento.com',
      to: process.env.SECURITY_ALERTS_EMAIL,
      subject: `${severityEmojis[alertData.severity]} Security Alert: ${alertData.alert_type}`,
      html: this.generateEmailTemplate(alertData)
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email de segurança enviado para ${process.env.SECURITY_ALERTS_EMAIL}`);
  }

  /**
   * Enviar alerta por Slack
   */
  async sendSlackAlert(alertData) {
    const axios = require('axios');
    
    const severityColors = {
      critical: '#ff0000',
      high: '#ff8800',
      medium: '#ffaa00',
      low: '#00aa00'
    };

    const slackMessage = {
      text: `🚨 Security Alert: ${alertData.alert_type}`,
      attachments: [{
        color: severityColors[alertData.severity],
        fields: [
          {
            title: 'Tipo de Alerta',
            value: alertData.alert_type,
            short: true
          },
          {
            title: 'Severidade',
            value: alertData.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Ocorrências',
            value: alertData.count.toString(),
            short: true
          },
          {
            title: 'IP',
            value: alertData.ip_address,
            short: true
          },
          {
            title: 'Tenant ID',
            value: alertData.tenant_id || 'N/A',
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(alertData.created_at).toLocaleString('pt-BR'),
            short: true
          },
          {
            title: 'Detalhes',
            value: alertData.details.message || 'N/A',
            short: false
          }
        ],
        footer: 'Sistema de Agendamento - Security Alert',
        ts: Math.floor(new Date(alertData.created_at).getTime() / 1000)
      }]
    };

    await axios.post(process.env.SECURITY_ALERTS_SLACK_WEBHOOK, slackMessage);
    console.log(`💬 Slack alert enviado para webhook`);
  }

  /**
   * Enviar alerta por Discord
   */
  async sendDiscordAlert(alertData) {
    const axios = require('axios');
    
    const severityEmojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const discordMessage = {
      embeds: [{
        title: `${severityEmojis[alertData.severity]} Security Alert`,
        description: `**Tipo:** ${alertData.alert_type}\n**Severidade:** ${alertData.severity.toUpperCase()}\n**Ocorrências:** ${alertData.count}`,
        color: this.getDiscordColor(alertData.severity),
        fields: [
          {
            name: 'IP Address',
            value: alertData.ip_address,
            inline: true
          },
          {
            name: 'Tenant ID',
            value: alertData.tenant_id || 'N/A',
            inline: true
          },
          {
            name: 'Timestamp',
            value: new Date(alertData.created_at).toLocaleString('pt-BR'),
            inline: true
          }
        ],
        footer: {
          text: 'Sistema de Agendamento - Security Alert'
        },
        timestamp: alertData.created_at
      }]
    };

    await axios.post(process.env.SECURITY_ALERTS_DISCORD_WEBHOOK, discordMessage);
    console.log(`🎮 Discord alert enviado para webhook`);
  }

  /**
   * Gerar template de email
   */
  generateEmailTemplate(alertData) {
    const severityColors = {
      critical: '#ff0000',
      high: '#ff8800',
      medium: '#ffaa00',
      low: '#00aa00'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { background-color: ${severityColors[alertData.severity]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .alert-details { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .critical { border-left: 5px solid #ff0000; }
          .high { border-left: 5px solid #ff8800; }
          .medium { border-left: 5px solid #ffaa00; }
          .low { border-left: 5px solid #00aa00; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Security Alert</h1>
          <h2>${alertData.alert_type}</h2>
        </div>
        <div class="content">
          <div class="alert-details ${alertData.severity}">
            <h3>Detalhes do Alerta</h3>
            <p><strong>Severidade:</strong> ${alertData.severity.toUpperCase()}</p>
            <p><strong>Ocorrências:</strong> ${alertData.count}</p>
            <p><strong>IP Address:</strong> ${alertData.ip_address}</p>
            <p><strong>Tenant ID:</strong> ${alertData.tenant_id || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${new Date(alertData.created_at).toLocaleString('pt-BR')}</p>
            <p><strong>Mensagem:</strong> ${alertData.details.message || 'N/A'}</p>
          </div>
          <p><em>Este é um alerta automático do sistema de segurança.</em></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Obter cor do Discord baseada na severidade
   */
  getDiscordColor(severity) {
    const colors = {
      critical: 0xff0000,
      high: 0xff8800,
      medium: 0xffaa00,
      low: 0x00aa00
    };
    return colors[severity] || 0x00aa00;
  }

  /**
   * Listar alertas ativos
   */
  async getActiveAlerts(limit = 50) {
    try {
      const result = await pool.query(`
        SELECT * FROM security_alerts 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar alertas ativos:', error);
      return [];
    }
  }

  /**
   * Marcar alerta como resolvido
   */
  async resolveAlert(alertId, resolvedBy = 'system') {
    try {
      await pool.query(`
        UPDATE security_alerts 
        SET status = 'resolved', resolved_by = ?, resolved_at = ? 
        WHERE id = ?
      `, [resolvedBy, new Date().toISOString(), alertId]);

      console.log(`✅ Alert ${alertId} resolved by ${resolvedBy}`);
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  }

  /**
   * Registrar tentativa de login falhada
   */
  async logFailedLogin(email, ip, userAgent) {
    await this.logSecurityEvent('failedLogins', {
      email,
      reason: 'invalid_credentials'
    }, { ip, get: () => userAgent });
  }

  /**
   * Registrar tentativa de acesso não autorizado
   */
  async logUnauthorizedAccess(userId, tenantId, resource, ip, userAgent) {
    await this.logSecurityEvent('unauthorizedAccess', {
      user_id: userId,
      tenant_id: tenantId,
      resource,
      reason: 'insufficient_permissions'
    }, { ip, get: () => userAgent });
  }

  /**
   * Registrar tentativa de SQL injection
   */
  async logSQLInjectionAttempt(query, ip, userAgent) {
    await this.logSecurityEvent('sqlInjectionAttempts', {
      malicious_query: query,
      reason: 'sql_injection_pattern_detected'
    }, { ip, get: () => userAgent });
  }

  /**
   * Registrar excedência de rate limit
   */
  async logRateLimitExceeded(tenantId, endpoint, ip, userAgent) {
    await this.logSecurityEvent('rateLimitExceeded', {
      tenant_id: tenantId,
      endpoint,
      reason: 'rate_limit_exceeded'
    }, { ip, get: () => userAgent });
  }
}

module.exports = SecurityAlertService;
