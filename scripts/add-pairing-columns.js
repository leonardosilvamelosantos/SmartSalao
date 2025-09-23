/**
 * Script para adicionar colunas de Pairing Code à tabela existente
 */

const pool = require('../src/config/database');

async function addPairingColumns() {
  try {
    console.log('🔧 Adicionando colunas de Pairing Code à tabela whatsapp_instances...\n');

    // Verificar se as colunas já existem
    const tableInfo = await pool.query('PRAGMA table_info(whatsapp_instances)');
    const existingColumns = tableInfo.rows.map(col => col.name);
    
    console.log('📋 Colunas existentes:', existingColumns);

    // Adicionar colunas se não existirem
    const columnsToAdd = [
      { name: 'pairing_code', type: 'TEXT' },
      { name: 'phone_number', type: 'TEXT' },
      { name: 'connection_method', type: 'TEXT DEFAULT "qr"' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adicionando coluna ${column.name}...`);
        await pool.query(`ALTER TABLE whatsapp_instances ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
      } else {
        console.log(`⚠️ Coluna ${column.name} já existe`);
      }
    }

    // Verificar resultado final
    console.log('\n🔍 Verificando estrutura final da tabela...');
    const finalTableInfo = await pool.query('PRAGMA table_info(whatsapp_instances)');
    console.log('📋 Colunas finais:');
    finalTableInfo.rows.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });

    console.log('\n🎉 Colunas de Pairing Code adicionadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addPairingColumns()
    .then(() => {
      console.log('\n🏁 Script concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = addPairingColumns;
