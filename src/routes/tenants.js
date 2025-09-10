const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/TenantController');
const { validateTenant, validateId, validatePagination } = require('../middleware/validation');

// GET /api/tenants - Listar tenants
router.get('/', validatePagination, TenantController.index);

// GET /api/tenants/:id - Buscar tenant por ID
router.get('/:id', validateId, TenantController.show);

// GET /api/tenants/domain/:dominio - Buscar tenant por domínio
router.get('/domain/:dominio', TenantController.findByDomain);

// POST /api/tenants - Criar tenant
router.post('/', validateTenant, TenantController.create);

// PUT /api/tenants/:id - Atualizar tenant
router.put('/:id', validateId, validateTenant, TenantController.update);

// DELETE /api/tenants/:id - Deletar tenant
router.delete('/:id', validateId, TenantController.delete);

module.exports = router;
