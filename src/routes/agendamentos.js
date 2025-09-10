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
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.buscarAgendamentos(req.user.id, req.query);
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
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.criarAgendamento(req.user.id, req.body);
    
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
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.confirmarAgendamento(id, req.user.id);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao confirmar agendamento:', error);
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
 * DELETE /api/agendamentos/:id - Deletar agendamento
 */
router.delete('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const agendamentoService = new AgendamentoService();
    const resultado = await agendamentoService.cancelarAgendamento(id, req.user.id);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = router;