#!/usr/bin/env node

/**
 * Script para listar todos os tenants existentes no sistema
 * Permite identificar quais tenants podem ser removidos
 */

const path = require('path');
require('dotenv').config();

// Configurar caminho para os módulos
process.env.NODE_PATH = path.join(__dirname, '..', 'src');
require('module')._initPaths();

async function listAllTenants() {
  try {
    console.log('🔍 Listando todos os tenants existentes...\n');

    // Importar serviços necessários
    const TenantProvisioningService = require('../src/services/TenantProvisioningService');
    const pool = require('../src/config/database');

    const tenantService = new TenantProvisioningService();

    console.log('📊 === TENANTS NO BANCO DE DADOS ===');
    
    // Listar tenants da tabela tenants
    try {
      const tenants = await tenantService.listTenants();
      console.log(`\n📋 Total de tenants na tabela 'tenants': ${tenants.length}`);
      
      if (tenants.length > 0) {
        console.log('\n📝 Detalhes dos tenants:');
        tenants.forEach((tenant, index) => {
          console.log(`\n${index + 1}. Tenant ID: ${tenant.id_tenant}`);
          console.log(`   Nome: ${tenant.nome || 'N/A'}`);
          console.log(`   Email: ${tenant.email || 'N/A'}`);
          console.log(`   Telefone: ${tenant.telefone || 'N/A'}`);
          console.log(`   Schema: ${tenant.schema_name || 'N/A'}`);
          console.log(`   Plano: ${tenant.plano || 'N/A'}`);
          console.log(`   Status: ${tenant.status || 'N/A'}`);
          console.log(`   Data Criação: ${tenant.data_criacao || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar tenants da tabela tenants:', error.message);
    }

    console.log('\n📊 === USUÁRIOS COM TENANT ID ===');
    
    // Listar usuários com id_tenant
    try {
      const usuariosQuery = `
        SELECT 
          id_usuario, 
          id_tenant, 
          nome, 
          email, 
          whatsapp, 
          tipo, 
          ativo, 
          created_at
        FROM usuarios 
        WHERE id_tenant IS NOT NULL 
        ORDER BY id_tenant, id_usuario
      `;
      
      const usuarios = await pool.query(usuariosQuery);
      console.log(`\n👥 Total de usuários com tenant ID: ${usuarios.rows.length}`);
      
      if (usuarios.rows.length > 0) {
        console.log('\n📝 Detalhes dos usuários:');
        usuarios.rows.forEach((usuario, index) => {
          console.log(`\n${index + 1}. Usuário ID: ${usuario.id_usuario}`);
          console.log(`   Tenant ID: ${usuario.id_tenant}`);
          console.log(`   Nome: ${usuario.nome || 'N/A'}`);
          console.log(`   Email: ${usuario.email || 'N/A'}`);
          console.log(`   WhatsApp: ${usuario.whatsapp || 'N/A'}`);
          console.log(`   Tipo: ${usuario.tipo || 'N/A'}`);
          console.log(`   Ativo: ${usuario.ativo ? 'Sim' : 'Não'}`);
          console.log(`   Criado em: ${usuario.created_at || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar usuários:', error.message);
    }

    console.log('\n📊 === CONEXÕES WHATSAPP ATIVAS ===');
    console.log('⚠️ Seção de conexões WhatsApp temporariamente desabilitada');

    console.log('\n📊 === SESSÕES WHATSAPP ===');
    
    // Listar sessões WhatsApp
    try {
      const SessionManager = require('../src/whatsapp-bot/core/SessionManager');
      const sessionManager = new SessionManager();
      const sessions = await sessionManager.getAllInstances();
      
      console.log(`\n💾 Total de sessões WhatsApp: ${sessions.length}`);
      
      if (sessions.length > 0) {
        console.log('\n📝 Detalhes das sessões:');
        sessions.forEach((session, index) => {
          console.log(`\n${index + 1}. Tenant ID: ${session.tenantId}`);
          console.log(`   Status: ${session.status || 'N/A'}`);
          console.log(`   Última Atividade: ${session.lastActivity || 'N/A'}`);
          console.log(`   Criado em: ${session.createdAt || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar sessões WhatsApp:', error.message);
    }

    console.log('\n📊 === ARQUIVOS DE AUTENTICAÇÃO ===');
    
    // Listar arquivos de autenticação
    try {
      const fs = require('fs');
      const path = require('path');
      const authBasePath = path.join(__dirname, '..', 'src', 'whatsapp-bot', 'auth');
      
      if (fs.existsSync(authBasePath)) {
        const authDirs = fs.readdirSync(authBasePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        console.log(`\n📁 Total de diretórios de autenticação: ${authDirs.length}`);
        
        if (authDirs.length > 0) {
          console.log('\n📝 Diretórios encontrados:');
          authDirs.forEach((dir, index) => {
            const dirPath = path.join(authBasePath, dir);
            const files = fs.readdirSync(dirPath);
            console.log(`\n${index + 1}. ${dir} (${files.length} arquivos)`);
          });
        }
      } else {
        console.log('\n📁 Diretório de autenticação não encontrado');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar arquivos de autenticação:', error.message);
    }

    console.log('\n✅ Listagem concluída!');
    console.log('\n💡 Recomendações:');
    console.log('   - Tenants sem usuários ativos podem ser removidos');
    console.log('   - Sessões WhatsApp inativas podem ser limpas');
    console.log('   - Arquivos de autenticação órfãos podem ser removidos');
    console.log('   - Use o dashboard para gerenciar conexões WhatsApp');

  } catch (error) {
    console.error('❌ Erro ao listar tenants:', error);
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
  listAllTenants();
}

module.exports = listAllTenants;
