#!/usr/bin/env node

/**
 * Script para remover o tenant 7 que está causando problemas
 * Remove usuário, sessões WhatsApp e arquivos de autenticação
 */

const path = require('path');
require('dotenv').config();

async function removeTenant7() {
  try {
    console.log('🗑️ Removendo tenant 7 que está causando problemas...\n');

    const pool = require('../src/config/database');

    console.log('📊 === VERIFICAÇÃO PRÉVIA ===');
    
    // Verificar usuário do tenant 7
    const userQuery = `
      SELECT id_usuario, nome, email, whatsapp, tipo, ativo
      FROM usuarios 
      WHERE id_tenant = 7
    `;
    
    const user = await pool.query(userQuery);
    console.log(`\n👤 Usuário encontrado no tenant 7: ${user.rows.length}`);
    
    if (user.rows.length > 0) {
      const usuario = user.rows[0];
      console.log(`   Nome: ${usuario.nome}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   WhatsApp: ${usuario.whatsapp}`);
      console.log(`   Tipo: ${usuario.tipo}`);
      console.log(`   Ativo: ${usuario.ativo ? 'Sim' : 'Não'}`);
    }

    console.log('\n📊 === REMOVENDO DADOS DO TENANT 7 ===');
    
    // Remover agendamentos do tenant 7
    try {
      const agendamentosQuery = `
        DELETE FROM agendamentos 
        WHERE id_usuario IN (
          SELECT id_usuario FROM usuarios WHERE id_tenant = 7
        )
      `;
      const agendamentosResult = await pool.query(agendamentosQuery);
      console.log(`✅ Agendamentos removidos: ${agendamentosResult.rowCount}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover agendamentos: ${error.message}`);
    }

    // Remover serviços do tenant 7
    try {
      const servicosQuery = `
        DELETE FROM servicos 
        WHERE id_usuario IN (
          SELECT id_usuario FROM usuarios WHERE id_tenant = 7
        )
      `;
      const servicosResult = await pool.query(servicosQuery);
      console.log(`✅ Serviços removidos: ${servicosResult.rowCount}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover serviços: ${error.message}`);
    }

    // Remover clientes do tenant 7
    try {
      const clientesQuery = `
        DELETE FROM clientes 
        WHERE id_usuario IN (
          SELECT id_usuario FROM usuarios WHERE id_tenant = 7
        )
      `;
      const clientesResult = await pool.query(clientesQuery);
      console.log(`✅ Clientes removidos: ${clientesResult.rowCount}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover clientes: ${error.message}`);
    }

    // Remover usuário do tenant 7
    try {
      const usuarioQuery = `
        DELETE FROM usuarios WHERE id_tenant = 7
      `;
      const usuarioResult = await pool.query(usuarioQuery);
      console.log(`✅ Usuário removido: ${usuarioResult.rowCount}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover usuário: ${error.message}`);
    }

    console.log('\n📊 === REMOVENDO SESSÕES WHATSAPP ===');
    
    // Remover sessões WhatsApp do tenant 7
    try {
      const SessionManager = require('../src/whatsapp-bot/core/SessionManager');
      const sessionManager = new SessionManager();
      
      // Verificar se há sessão para o tenant 7
      const sessions = await sessionManager.getAllInstances();
      const tenant7Session = sessions.find(s => s.tenantId === '7');
      
      if (tenant7Session) {
        console.log('🔍 Sessão WhatsApp encontrada para tenant 7');
        console.log(`   Status: ${tenant7Session.status}`);
        console.log(`   Última Atividade: ${tenant7Session.lastActivity}`);
        
        // Remover sessão
        await sessionManager.removeInstance('7');
        console.log('✅ Sessão WhatsApp removida');
      } else {
        console.log('ℹ️ Nenhuma sessão WhatsApp encontrada para tenant 7');
      }
    } catch (error) {
      console.log(`⚠️ Erro ao remover sessão WhatsApp: ${error.message}`);
    }

    console.log('\n📊 === REMOVENDO ARQUIVOS DE AUTENTICAÇÃO ===');
    
    // Remover arquivos de autenticação do tenant 7
    try {
      const fs = require('fs');
      const authBasePath = path.join(__dirname, '..', 'src', 'whatsapp-bot', 'auth');
      const tenant7AuthPath = path.join(authBasePath, '7');
      
      if (fs.existsSync(tenant7AuthPath)) {
        fs.rmSync(tenant7AuthPath, { recursive: true, force: true });
        console.log('✅ Arquivos de autenticação removidos');
      } else {
        console.log('ℹ️ Nenhum arquivo de autenticação encontrado para tenant 7');
      }
    } catch (error) {
      console.log(`⚠️ Erro ao remover arquivos de autenticação: ${error.message}`);
    }

    console.log('\n📊 === VERIFICAÇÃO PÓS-REMOVAÇÃO ===');
    
    // Verificar se o tenant 7 foi completamente removido
    const finalCheck = await pool.query(userQuery);
    console.log(`\n👤 Usuários restantes no tenant 7: ${finalCheck.rows.length}`);
    
    if (finalCheck.rows.length === 0) {
      console.log('✅ Tenant 7 removido com sucesso!');
    } else {
      console.log('⚠️ Ainda há usuários no tenant 7');
    }

    console.log('\n✅ Limpeza do tenant 7 concluída!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Reinicie o servidor: npm start');
    console.log('   2. Verifique se os erros de credenciais expiradas pararam');
    console.log('   3. Configure novos tenants se necessário');

  } catch (error) {
    console.error('❌ Erro ao remover tenant 7:', error);
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
  removeTenant7();
}

module.exports = removeTenant7;
