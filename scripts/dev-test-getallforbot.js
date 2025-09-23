#!/usr/bin/env node
(async () => {
  try {
    const ServicoController = require('../src/controllers/ServicoController');
    const services = await ServicoController.getAllForBot();
    console.log('Total serviços retornados:', Array.isArray(services) ? services.length : 'N/A');
    console.log(JSON.stringify(services, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Erro ao chamar getAllForBot:', e);
    process.exit(1);
  }
})();

