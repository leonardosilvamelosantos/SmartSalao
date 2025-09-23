const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ServicoController = require('../controllers/ServicoController');
const servicoController = new ServicoController();
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

  await servicoController.index(req, res);
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

  await servicoController.show(req, res);
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

  await servicoController.showWithUsuario(req, res);
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

    // Verificar existência da coluna id_tenant
    const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='servicos' AND column_name='id_tenant'");
    const hasTenantCol = col.rows.length > 0;

    const cols = ['id_usuario', 'nome_servico', 'duracao_min', 'valor', 'ativo'];
    const vals = [
      idUsuario,
      req.body.nome_servico,
      parseInt(req.body.duracao_min),
      parseFloat(req.body.valor),
      req.body.ativo !== undefined ? !!req.body.ativo : true
    ];
    if (hasTenantCol) {
      cols.unshift('id_tenant');
      vals.unshift(idTenant);
    }
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const insertSql = `INSERT INTO servicos (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const insertResult = await pool.query(insertSql, vals);

    res.status(201).json({
      success: true,
      message: 'Serviço criado com sucesso',
      data: insertResult.rows[0]
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

  await servicoController.update(req, res);
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

  await servicoController.getAvailable(req, res);
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

  await servicoController.getPopular(req, res);
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

  await servicoController.getWithStats(req, res);
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
    // Verificar existência da coluna id_tenant
    const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='servicos' AND column_name='id_tenant'");
    const hasTenantCol = col.rows.length > 0;
    const checkSql = hasTenantCol ?
      'SELECT id_servico FROM servicos WHERE id_servico = $1 AND id_usuario = $2 AND (id_tenant = $3 OR id_tenant IS NULL)' :
      'SELECT id_servico FROM servicos WHERE id_servico = $1 AND id_usuario = $2';
    const checkParams = hasTenantCol ? [id, idUsuario, idTenant] : [id, idUsuario];
    const checkService = await pool.query(checkSql, checkParams);

    if (checkService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou não pertence ao usuário'
      });
    }

    // Atualizar serviço
    const updateSql = hasTenantCol ?
      'UPDATE servicos SET nome_servico = $1, duracao_min = $2, valor = $3, ativo = $4 WHERE id_servico = $5 AND id_usuario = $6 AND (id_tenant = $7 OR id_tenant IS NULL) RETURNING *' :
      'UPDATE servicos SET nome_servico = $1, duracao_min = $2, valor = $3, ativo = $4 WHERE id_servico = $5 AND id_usuario = $6 RETURNING *';
    const updateParams = hasTenantCol ? [
      req.body.nome_servico,
      parseInt(req.body.duracao_min),
      parseFloat(req.body.valor),
      req.body.ativo !== undefined ? !!req.body.ativo : true,
      id,
      idUsuario,
      idTenant
    ] : [
      req.body.nome_servico,
      parseInt(req.body.duracao_min),
      parseFloat(req.body.valor),
      req.body.ativo !== undefined ? !!req.body.ativo : true,
      id,
      idUsuario
    ];
    const updateResult = await pool.query(updateSql, updateParams);

    if (updateResult.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao atualizar serviço'
      });
    }

    // Retornar serviço atualizado
    const updatedService = updateResult;

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
    // Verificar existência da coluna id_tenant em agendamentos
    const colA = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agendamentos' AND column_name='id_tenant'");
    const hasTenantAg = colA.rows.length > 0;
    const agSql = hasTenantAg ?
      'SELECT COUNT(*) as c FROM agendamentos WHERE id_servico = $1 AND (id_tenant = $2 OR id_tenant IS NULL)' :
      'SELECT COUNT(*) as c FROM agendamentos WHERE id_servico = $1';
    const agRes = await pool.query(agSql, hasTenantAg ? [id, idTenant] : [id]);
    if (parseInt(agRes.rows?.[0]?.c || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar serviço com agendamentos vinculados'
      });
    }

    // Tentar deletar o serviço diretamente
    const delSql = hasTenantCol ?
      'DELETE FROM servicos WHERE id_servico = $1 AND id_usuario = $2 AND (id_tenant = $3 OR id_tenant IS NULL)' :
      'DELETE FROM servicos WHERE id_servico = $1 AND id_usuario = $2';
    const deleteResult = await pool.query(delSql, hasTenantCol ? [id, idUsuario, idTenant] : [id, idUsuario]);

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
    const col = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='servicos' AND column_name='id_tenant'");
    const hasTenantCol = col.rows.length > 0;
    const checkSql = hasTenantCol ?
      'SELECT id_servico, ativo FROM servicos WHERE id_servico = $1 AND id_usuario = $2 AND (id_tenant = $3 OR id_tenant IS NULL)' :
      'SELECT id_servico, ativo FROM servicos WHERE id_servico = $1 AND id_usuario = $2';
    const checkService = await pool.query(checkSql, hasTenantCol ? [id, idUsuario, idTenant] : [id, idUsuario]);

    if (checkService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou não pertence ao usuário'
      });
    }

    const currentStatus = checkService.rows[0].ativo;
    const newStatus = currentStatus ? 0 : 1;

    // Atualizar status
    const updSql = hasTenantCol ?
      'UPDATE servicos SET ativo = $1 WHERE id_servico = $2 AND id_usuario = $3 AND (id_tenant = $4 OR id_tenant IS NULL)' :
      'UPDATE servicos SET ativo = $1 WHERE id_servico = $2 AND id_usuario = $3';
    const updateResult = await pool.query(updSql, hasTenantCol ? [newStatus ? true : false, id, idUsuario, idTenant] : [newStatus ? true : false, id, idUsuario]);

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