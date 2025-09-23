const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');
const { validateCliente, validateId, validatePagination } = require('../middleware/validation');

/**
 * GET /api/clientes - Listar clientes do usuário logado
 * Query params: page, limit, search
 */
router.get('/', validatePagination, ClienteController.index);

/**
 * GET /api/clientes/export - Exportar clientes do usuário (JSON)
 */
router.get('/export', ClienteController.export);

/**
 * POST /api/clientes/import - Importar clientes em massa (JSON)
 */
router.post('/import', ClienteController.import);

/**
 * GET /api/clientes/:id - Buscar cliente específico
 */
router.get('/:id', validateId, ClienteController.show);

/**
 * GET /api/clientes/:id/historico - Buscar cliente com histórico de agendamentos
 */
router.get('/:id/historico', validateId, ClienteController.showWithHistory);

/**
 * POST /api/clientes - Criar novo cliente
 */
router.post('/', validateCliente, ClienteController.create);

/**
 * POST /api/clientes/find-or-create - Buscar ou criar cliente por WhatsApp
 */
router.post('/find-or-create', ClienteController.findOrCreateByWhatsapp);

/**
 * PUT /api/clientes/:id - Atualizar cliente
 */
router.put('/:id', validateId, ClienteController.update);

/**
 * DELETE /api/clientes/:id - Deletar cliente
 */
router.delete('/:id', validateId, ClienteController.delete);

/**
 * GET /api/clientes/estatisticas - Clientes com estatísticas
 * Query params: page, limit
 */
router.get('/estatisticas', validatePagination, ClienteController.getWithStats);

module.exports = router;