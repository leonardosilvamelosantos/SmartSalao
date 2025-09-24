const express = require('express');
const router = express.Router();
const AgendamentoService = require('../services/AgendamentoService');
const { validateId, validatePagination } = require('../middleware/validation');

/**
 * GET /api/agendamentos - Listar agendamentos do usuário logado
 * Query params: data_inicio, data_fim, status, cliente_id
 */
router.get('/', async (req, res) => {
  try {
    // Log reduzido para evitar spam
    // console.log('🔍 [DEBUG] GET /api/agendamentos chamado');
    
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.buscarAgendamentos(req.user.id, req.query);
    
    // Log reduzido
    // console.log('🔍 [DEBUG] Resultado final:', resultado.success, resultado.data?.length || 0, 'agendamentos');
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/agendamentos/slots/:data - Gerar slots disponíveis para uma data
 */
router.get('/slots/:data', async (req, res) => {
  try {
    const { data } = req.params;
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.gerarSlotsDisponiveis(req.user.id, data);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao gerar slots:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/agendamentos/auto-confirm-status - Verificar status do auto agendamento
 */
router.get('/auto-confirm-status', async (req, res) => {
  try {
    const ConfiguracaoService = require('../services/ConfiguracaoService');
    const configService = new ConfiguracaoService();
    const configuracoes = await configService.getConfiguracoes(req.user.id);
    
    const autoConfirmAtivo = !!(configuracoes && configuracoes.auto_confirm_whatsapp);
    
    res.json({
      success: true,
      data: {
        auto_confirm_whatsapp: autoConfirmAtivo,
        configuracoes: configuracoes
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status do auto agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /api/agendamentos/auto-confirm - Ativar/desativar auto agendamento
 */
router.patch('/auto-confirm', async (req, res) => {
  try {
    const { ativo } = req.body;
    
    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetro "ativo" deve ser true ou false' 
      });
    }
    
    const ConfiguracaoService = require('../services/ConfiguracaoService');
    const configService = new ConfiguracaoService();
    
    // Atualizar configuração
    const resultado = await configService.updateConfiguracoes(req.user.id, {
      auto_confirm_whatsapp: ativo ? 1 : 0
    });
    
    if (resultado.success) {
      res.json({
        success: true,
        message: ativo ? 'Auto agendamento ativado' : 'Auto agendamento desativado',
        data: { auto_confirm_whatsapp: ativo }
      });
    } else {
      res.status(400).json(resultado);
    }
  } catch (error) {
    console.error('Erro ao alterar auto agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/agendamentos/:id - Buscar agendamento específico
 */
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const agendamentoService = new AgendamentoService();
    const agendamento = await agendamentoService.buscarAgendamentoCompleto(id);
    
    if (!agendamento) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }

    // Verificar se agendamento pertence ao usuário
    if (agendamento.id_usuario !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    res.json({ success: true, data: agendamento });
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/agendamentos - Criar novo agendamento
 */
router.post('/', async (req, res) => {
  try {
    // Log reduzido para evitar spam
    // console.log('🔍 [DEBUG] POST /api/agendamentos chamado');
    
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.criarAgendamento(req.user.id, req.body);
    
    // Log reduzido
    // console.log('🔍 [DEBUG] Resultado da criação:', resultado);
    
    if (resultado.success) {
      res.status(201).json(resultado);
    } else {
      res.status(400).json(resultado);
    }
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/agendamentos/:id - Atualizar agendamento
 */
router.put('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.atualizarAgendamento(id, req.user.id, req.body);
    
    if (resultado.success) {
      res.json(resultado);
    } else {
      res.status(400).json(resultado);
    }
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /api/agendamentos/:id/confirmar - Confirmar agendamento
 */
router.patch('/:id/confirmar', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // console.log(`✅ Rota PATCH /api/agendamentos/${id}/confirmar chamada para usuário: ${userId}`); // Otimizado - log removido para reduzir spam
    
    if (!userId) {
      console.log(`❌ Usuário não autenticado`);
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.confirmarAgendamento(id, userId);
    
    console.log(`📤 Resultado da confirmação:`, resultado);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao confirmar agendamento:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /api/agendamentos/:id/cancelar - Cancelar agendamento
 */
router.patch('/:id/cancelar', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.cancelarAgendamento(id, req.user.id);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/agendamentos/:id/permanent - Excluir agendamento permanentemente
 */
router.delete('/:id/permanent', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log(`🗑️ Rota DELETE /api/agendamentos/${id}/permanent chamada para usuário: ${userId}`);
    
    if (!userId) {
      console.log(`❌ Usuário não autenticado`);
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.excluirAgendamento(id, userId);
    
    console.log(`📤 Resultado da exclusão permanente:`, resultado);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao excluir agendamento permanentemente:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/agendamentos/:id - Cancelar agendamento (soft delete)
 */
router.delete('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log(`🗑️ Rota DELETE /api/agendamentos/${id} chamada para usuário: ${userId}`);
    
    if (!userId) {
      console.log(`❌ Usuário não autenticado`);
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.cancelarAgendamento(id, userId);
    
    console.log(`📤 Resultado do cancelamento:`, resultado);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao cancelar agendamento:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = router;