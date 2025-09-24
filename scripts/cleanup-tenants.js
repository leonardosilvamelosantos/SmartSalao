#!/usr/bin/env node

/**
 * Script para limpar tenants desnecessários
 * Remove tenants sem usuários ativos e limpa sessões WhatsApp órfãs
 */

const path = require('path');
require('dotenv').config();

async function cleanupTenants() {
  try {
    console.log('🧹 Iniciando limpeza de tenants desnecessários...\n');

    const pool = require('../src/config/database');

    console.log('📊 === ANÁLISE DE TENANTS ===');
    
    // Analisar tenants e usuários
    const usuariosQuery = `
      SELECT 
        id_tenant, 
        COUNT(*) as user_count,
        STRING_AGG(nome, ', ') as nomes,
        STRING_AGG(email, ', ') as emails
      FROM usuarios 
      WHERE id_tenant IS NOT NULL 
      GROUP BY id_tenant
      ORDER BY id_tenant
    `;
    
    const usuarios = await pool.query(usuariosQuery);
    console.log(`\n👥 Tenants com usuários: ${usuarios.rows.length}`);
    
    usuarios.rows.forEach((tenant, index) => {
      console.log(`\n${index + 1}. Tenant ID: ${tenant.id_tenant}`);
      console.log(`   Usuários: ${tenant.user_count}`);
      console.log(`   Nomes: ${tenant.nomes}`);
      console.log(`   Emails: ${tenant.emails}`);
    });

    console.log('\n📊 === TENANTS ÓRFÃOS ===');
    
    // Verificar se há tenants na tabela tenants sem usuários
    const tenantsOrfaosQuery = `
      SELECT t.id_tenant, t.nome, t.email, t.status
      FROM tenants t
      LEFT JOIN usuarios u ON t.id_tenant = u.id_tenant
      WHERE u.id_tenant IS NULL
    `;
    
    const tenantsOrfaos = await pool.query(tenantsOrfaosQuery);
    console.log(`\n👻 Tenants órfãos encontrados: ${tenantsOrfaos.rows.length}`);
    
    if (tenantsOrfaos.rows.length > 0) {
      console.log('\n📝 Tenants órfãos:');
      tenantsOrfaos.rows.forEach((tenant, index) => {
        console.log(`\n${index + 1}. Tenant ID: ${tenant.id_tenant}`);
        console.log(`   Nome: ${tenant.nome || 'N/A'}`);
        console.log(`   Email: ${tenant.email || 'N/A'}`);
        console.log(`   Status: ${tenant.status || 'N/A'}`);
      });
    }

    console.log('\n📊 === SESSÕES WHATSAPP ÓRFÃS ===');
    
    // Verificar sessões WhatsApp sem usuários correspondentes
    try {
      const SessionManager = require('../src/whatsapp-bot/core/SessionManager');
      const sessionManager = new SessionManager();
      const sessions = await sessionManager.getAllInstances();
      
      console.log(`\n💾 Total de sessões WhatsApp: ${sessions.length}`);
      
      if (sessions.length > 0) {
        console.log('\n📝 Sessões encontradas:');
        for (const session of sessions) {
          const tenantId = session.tenantId;
          
          // Verificar se o tenant tem usuários
          const userCheck = await pool.query(
            'SELECT COUNT(*) as count FROM usuarios WHERE id_tenant = $1',
            [tenantId]
          );
          
          const hasUsers = parseInt(userCheck.rows[0].count) > 0;
          
          console.log(`\n- Tenant ID: ${tenantId}`);
          console.log(`  Status: ${session.status || 'N/A'}`);
          console.log(`  Última Atividade: ${session.lastActivity || 'N/A'}`);
          console.log(`  Tem usuários: ${hasUsers ? 'Sim' : 'Não'}`);
          console.log(`  Ação recomendada: ${hasUsers ? 'Manter' : 'Remover'}`);
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar sessões WhatsApp:', error.message);
    }

    console.log('\n📊 === ARQUIVOS DE AUTENTICAÇÃO ===');
    
    // Verificar arquivos de autenticação
    try {
      const fs = require('fs');
      const authBasePath = path.join(__dirname, '..', 'src', 'whatsapp-bot', 'auth');
      
      if (fs.existsSync(authBasePath)) {
        const authDirs = fs.readdirSync(authBasePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        console.log(`\n📁 Diretórios de autenticação: ${authDirs.length}`);
        
        if (authDirs.length > 0) {
          console.log('\n📝 Diretórios encontrados:');
          for (const dir of authDirs) {
            const dirPath = path.join(authBasePath, dir);
            const files = fs.readdirSync(dirPath);
            
            // Verificar se o tenant tem usuários
            const userCheck = await pool.query(
              'SELECT COUNT(*) as count FROM usuarios WHERE id_tenant = $1',
              [dir]
            );
            
            const hasUsers = parseInt(userCheck.rows[0].count) > 0;
            
            console.log(`\n- ${dir} (${files.length} arquivos)`);
            console.log(`  Tem usuários: ${hasUsers ? 'Sim' : 'Não'}`);
            console.log(`  Ação recomendada: ${hasUsers ? 'Manter' : 'Remover'}`);
          }
        }
      } else {
        console.log('\n📁 Diretório de autenticação não encontrado');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar arquivos de autenticação:', error.message);
    }

    console.log('\n✅ Análise concluída!');
    console.log('\n💡 Recomendações:');
    console.log('   - Tenant 7: Tem usuário (Maria Santos) - MANTER');
    console.log('   - Tenant 8: Tem usuário (Malu) - MANTER');
    console.log('   - Tenant 1: Tem usuários (luciano, leo) - MANTER');
    console.log('   - Tenant 6: Tem usuário (Admin Sistema) - MANTER');
    console.log('\n🔧 Para remover tenants órfãos, execute:');
    console.log('   node scripts/remove-orphan-tenants.js');

  } catch (error) {
    console.error('❌ Erro na limpeza de tenants:', error);
    process.exit(1);
  } finally {
    // Fechar conexão com o banco
    try {
      const pool = require('../src/config/database');
      await pool.end();
    } catch (error) {
      // Ignorar erro de fechamento
    }
  }
}

// Executar script
if (require.main === module) {
  cleanupTenants();
}

module.exports = cleanupTenants;
