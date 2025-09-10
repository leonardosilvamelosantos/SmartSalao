const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { validateUsuario, validateId, validatePagination } = require('../middleware/validation');
const { isolateTenant, checkLimits } = require('../middleware/tenant');

// Aplicar middleware de isolamento de tenant a todas as rotas
router.use(isolateTenant);

// GET /api/usuarios - Listar usuários
router.get('/', validatePagination, UsuarioController.index);

// GET /api/usuarios/:id - Buscar usuário
router.get('/:id', validateId, UsuarioController.show);

// GET /api/usuarios/:id/detalhes - Buscar usuário com serviços e estatísticas
router.get('/:id/detalhes', validateId, UsuarioController.showWithDetails);

// POST /api/usuarios - Criar usuário
router.post('/', checkLimits('usuarios'), validateUsuario, UsuarioController.create);

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', validateId, validateUsuario, UsuarioController.update);

// PUT /api/usuarios/:id/horarios - Atualizar configuração de horários
router.put('/:id/horarios', validateId, UsuarioController.updateHorarios);

// POST /api/usuarios/:id/regenerate-slots - Regenerar slots
router.post('/:id/regenerate-slots', validateId, UsuarioController.regenerateSlots);

// DELETE /api/usuarios/:id - Deletar usuário
router.delete('/:id', validateId, UsuarioController.delete);

module.exports = router;
