const Cliente = require('./src/models/Cliente');

async function testClientCreate() {
  try {
    console.log('Testando criação de cliente...');

    const clienteData = {
      id_usuario: 1,
      nome: 'Leozin o brabo',
      email: 'ls@ls.com',
      whatsapp: '+553598225422'
    };

    const cliente = await Cliente.create(clienteData);
    console.log('✅ Cliente criado:', cliente);

  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
  }
}

testClientCreate();
