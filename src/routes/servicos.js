const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ServicoController = require('../controllers/ServicoController');
const { validateServico, validateId, validatePagination } = require('../middleware/validation');
const { requireOwnership } = require('../middleware/auth');
const { checkLimits } = require('../middleware/tenant');

/**
 * GET /api/servicos - Listar serviços
 * Query params: page, limit, id_usuario, search
 */
router.get('/', validatePagination, async (req, res) => {
  // Verificar se é para filtrar por usuário específico
  const { id_usuario } = req.query;
  const userId = req.user?.id;

  if (id_usuario && parseInt(id_usuario) !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode ver serviços do seu usuário'
    });
  }

  // Se não especificou usuário, usar o usuário logado
  if (!id_usuario) {
    req.query.id_usuario = userId;
  }

  await ServicoController.index(req, res);
});

/**
 * GET /api/servicos/:id - Buscar serviço específico
 */
router.get('/:id', validateId, async (req, res) => {
  const servico = await require('../models/Servico').findById(req.params.id);

  if (servico && servico.id_usuario !== req.user?.id) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode acessar seus próprios serviços'
    });
  }

  await ServicoController.show(req, res);
});

/**
 * GET /api/servicos/:id/detalhes - Buscar serviço com dados do usuário
 */
router.get('/:id/detalhes', validateId, async (req, res) => {
  const servico = await require('../models/Servico').findById(req.params.id);

  if (servico && servico.id_usuario !== req.user?.id) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode acessar seus próprios serviços'
    });
  }

  await ServicoController.showWithUsuario(req, res);
});


// (removido) endpoint de teste /api/servicos/test

/**
 * POST /api/servicos - Criar novo serviço
 */
router.post('/', checkLimits('servicos'), async (req, res) => {
  try {
    // Garantir que o serviço seja criado para o usuário logado
    const idUsuario = req.user?.id || 1;
    const idTenant = req.user?.tenant_id || req.tenant?.id || null;

    // Validação básica
    if (!req.body.nome_servico || !req.body.duracao_min || !req.body.valor) {
      return res.status(400).json({
        success: false,
        message: 'Nome, duração e valor são obrigatórios'
      });
    }

    const pool = require('../config/database');

    // Criar serviço
    const insertResult = await pool.query(`
      INSERT INTO servicos (id_tenant, id_usuario, nome_servico, duracao_min, valor, ativo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      idTenant,
      idUsuario,
      req.body.nome_servico,
      parseInt(req.body.duracao_min),
      parseFloat(req.body.valor),
      req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : 1
    ]);

    if (insertResult.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao criar serviço'
      });
    }

    // Retornar serviço criado
    const serviceResult = await pool.query(`
      SELECT * FROM servicos
      WHERE id_usuario = ? AND nome_servico = ? AND (id_tenant IS ? OR id_tenant = ?)
      ORDER BY id_servico DESC LIMIT 1
    `, [idUsuario, req.body.nome_servico, null, idTenant]);

    if (serviceResult.rows.length === 0) {
      return res.status(201).json({
        success: true,
        message: 'Serviço criado com sucesso',
        data: {
          id_usuario: idUsuario,
          nome_servico: req.body.nome_servico,
          duracao_min: parseInt(req.body.duracao_min),
          valor: parseFloat(req.body.valor),
          ativo: req.body.ativo !== undefined ? req.body.ativo : true
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Serviço criado com sucesso',
      data: serviceResult.rows[0]
    });

  } catch (err) {
    console.error('Erro ao criar serviço:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: err.message
    });
  }
});

/**
 * PUT /api/servicos/:id - Atualizar serviço
 */
router.put('/:id', validateId, requireOwnership('service'), async (req, res) => {
  // Verificar se o serviço pertence ao usuário
  const servico = await require('../models/Servico').findById(req.params.id);

  if (!servico) {
    return res.status(404).json({
      success: false,
      message: 'Serviço não encontrado'
    });
  }

  if (servico.id_usuario !== req.user?.id) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode editar seus próprios serviços'
    });
  }

  await ServicoController.update(req, res);
});


/**
 * GET /api/servicos/usuario/:id_usuario/disponiveis - Serviços disponíveis em período
 * Query params: start_date, end_date
 */
router.get('/usuario/:id_usuario/disponiveis', async (req, res) => {
  const { id_usuario } = req.params;
  const userId = req.user?.id;

  if (parseInt(id_usuario) !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode ver serviços do seu usuário'
    });
  }

  await ServicoController.getAvailable(req, res);
});

/**
 * GET /api/servicos/usuario/:id_usuario/populares - Serviços mais populares
 * Query params: limit
 */
router.get('/usuario/:id_usuario/populares', async (req, res) => {
  const { id_usuario } = req.params;
  const userId = req.user?.id;

  if (parseInt(id_usuario) !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode ver serviços do seu usuário'
    });
  }

  await ServicoController.getPopular(req, res);
});

/**
 * GET /api/servicos/usuario/:id_usuario/estatisticas - Serviços com estatísticas
 */
router.get('/usuario/:id_usuario/estatisticas', async (req, res) => {
  const { id_usuario } = req.params;
  const userId = req.user?.id;

  if (parseInt(id_usuario) !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Você só pode ver estatísticas do seu usuário'
    });
  }

  await ServicoController.getWithStats(req, res);
});

/**
 * PUT /api/servicos/:id - Atualizar serviço
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idUsuario = req.user?.id || 1;
    const idTenant = req.user?.tenant_id || req.tenant?.id || null;

    console.log('PUT /api/servicos/:', id);
    console.log('Body:', req.body);

    // Validação básica
    if (!req.body.nome_servico || !req.body.duracao_min || !req.body.valor) {
      return res.status(400).json({
        success: false,
        message: 'Nome, duração e valor são obrigatórios'
      });
    }

    const pool = require('../config/database');

    // Verificar se o serviço existe e pertence ao usuário
    const checkService = await pool.query(
      'SELECT id_servico FROM servicos WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [id, idUsuario, null, idTenant]
    );

    if (checkService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou não pertence ao usuário'
      });
    }

    // Atualizar serviço
    const updateResult = await pool.query(
      'UPDATE servicos SET nome_servico = ?, duracao_min = ?, valor = ?, ativo = ? WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [
        req.body.nome_servico,
        parseInt(req.body.duracao_min),
        parseFloat(req.body.valor),
        req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : 1,
        id,
        idUsuario,
        null,
        idTenant
      ]
    );

    if (updateResult.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao atualizar serviço'
      });
    }

    // Retornar serviço atualizado
    const updatedService = await pool.query(
      'SELECT * FROM servicos WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [id, idUsuario, null, idTenant]
    );

    res.json({
      success: true,
      message: 'Serviço atualizado com sucesso',
      data: updatedService.rows[0]
    });

  } catch (err) {
    console.error('Erro ao atualizar serviço:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: err.message
    });
  }
});

/**
 * DELETE /api/servicos/:id - Deletar serviço
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = require('../config/database');
    const idUsuario = req.user?.id || 1;
    const idTenant = req.user?.tenant_id || req.tenant?.id || null;

    // Validar se há agendamentos vinculados ao serviço
    const agRes = await pool.query(
      "SELECT COUNT(*) as c FROM agendamentos WHERE id_servico = ? AND (id_tenant IS ? OR id_tenant = ?)",
      [id, null, idTenant]
    );
    if (parseInt(agRes.rows?.[0]?.c || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar serviço com agendamentos vinculados'
      });
    }

    // Tentar deletar o serviço diretamente
    const deleteResult = await pool.query(
      'DELETE FROM servicos WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [id, idUsuario, null, idTenant]
    );

    if (deleteResult.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou já foi deletado'
      });
    }

    res.json({
      success: true,
      message: 'Serviço deletado com sucesso'
    });

  } catch (err) {
    console.error('Erro ao deletar serviço:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: err.message
    });
  }
});

/**
 * PATCH /api/servicos/:id/status - Toggle status ativo/inativo
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const idUsuario = req.user?.id || 1;
    const idTenant = req.user?.tenant_id || req.tenant?.id || null;

    const pool = require('../config/database');

    // Verificar se o serviço existe e pertence ao usuário
    const checkService = await pool.query(
      'SELECT id_servico, ativo FROM servicos WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [id, idUsuario, null, idTenant]
    );

    if (checkService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou não pertence ao usuário'
      });
    }

    const currentStatus = checkService.rows[0].ativo;
    const newStatus = currentStatus ? 0 : 1;

    // Atualizar status
    const updateResult = await pool.query(
      'UPDATE servicos SET ativo = ? WHERE id_servico = ? AND id_usuario = ? AND (id_tenant IS ? OR id_tenant = ?)',
      [newStatus, id, idUsuario, null, idTenant]
    );

    if (updateResult.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao atualizar status do serviço'
      });
    }

    res.json({
      success: true,
      message: `Serviço ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      data: {
        id_servico: id,
        ativo: newStatus ? true : false
      }
    });

  } catch (err) {
    console.error('Erro ao alterar status do serviço:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: err.message
    });
  }
});

module.exports = router;