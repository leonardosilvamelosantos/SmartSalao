#!/usr/bin/env node

const SecurityAlertService = require('../src/services/SecurityAlertService');
const pool = require('../src/config/database');

async function checkSecurity() {
  console.log('🔒 Verificando status de segurança...');
  
  try {
    const securityAlert = new SecurityAlertService();
    
    // Verificar alertas ativos
    const activeAlerts = await securityAlert.getActiveAlerts(10);
    
    if (activeAlerts.length > 0) {
      console.log('🚨 ALERTAS ATIVOS:');
      activeAlerts.forEach(alert => {
        console.log(`- ${alert.alert_type} (${alert.severity}): ${alert.count} ocorrências`);
      });
    } else {
      console.log('✅ Nenhum alerta de segurança ativo');
    }
    
    // Verificar configurações críticas
    const criticalChecks = [
      {
        name: 'Rate Limiting',
        check: process.env.ENABLE_RATE_LIMITING === 'true',
        critical: true
      },
      {
        name: 'Security Alerts',
        check: process.env.ENABLE_SECURITY_ALERTS === 'true',
        critical: true
      },
      {
        name: 'Production Mode',
        check: process.env.NODE_ENV === 'production',
        critical: true
      }
    ];
    
    console.log('\n🔍 Verificações de configuração:');
    criticalChecks.forEach(check => {
      const status = check.check ? '✅' : '❌';
      const critical = check.critical ? ' (CRÍTICO)' : '';
      console.log(`${status} ${check.name}${critical}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na verificação de segurança:', error.message);
    process.exit(1);
  }
}

checkSecurity();
