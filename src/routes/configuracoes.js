const express = require('express');
const router = express.Router();
const ConfiguracaoService = require('../services/ConfiguracaoService');

// GET /api/configuracoes - Buscar configurações do usuário
router.get('/', async (req, res) => {
  try {
    const configService = new ConfiguracaoService();
    const configuracoes = await configService.getConfiguracoes(req.user.id_usuario);
    res.json({ success: true, data: configuracoes });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// PUT /api/configuracoes - Atualizar configurações do usuário
router.put('/', async (req, res) => {
  try {
    const configService = new ConfiguracaoService();
    const configuracoes = await configService.updateConfiguracoes(req.user.id_usuario, req.body);
    res.json({ success: true, data: configuracoes, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = router;
