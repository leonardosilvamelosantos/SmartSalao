const express = require('express');
const router = express.Router();
const ConfiguracaoService = require('../services/ConfiguracaoService');

// GET /api/configuracoes - Buscar configurações do usuário
router.get('/', async (req, res) => {
  try {
    const configService = new ConfiguracaoService();
    const userId = req.user.id || req.user.id_usuario;
    const configuracoes = await configService.getConfiguracoes(userId);
    res.json({ success: true, data: configuracoes });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// PUT /api/configuracoes - Atualizar configurações do usuário
router.put('/', async (req, res) => {
  try {
    console.log('🔧 PUT /api/configuracoes - Iniciando atualização');
    console.log('👤 Usuário:', req.user);
    console.log('📝 Dados recebidos:', req.body);
    
    const configService = new ConfiguracaoService();
    // Usar req.user.id em vez de req.user.id_usuario
    const userId = req.user.id || req.user.id_usuario;
    console.log('🔍 UserId extraído:', userId);
    const configuracoes = await configService.updateConfiguracoes(userId, req.body);
    
    res.json({ success: true, data: configuracoes, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = router;
