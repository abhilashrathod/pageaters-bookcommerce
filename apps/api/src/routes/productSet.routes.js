const { Router } = require('express');
const router = new Router();

const { adminProductSetReferencesPayloadSchema, adminProductSetListFilterSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/productSets.controller');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const { demoAdminReadOnly } = require('../middlewares/demoMode.middleware');
const pageLimit = require('../middlewares/pageLimit.middleware');
const validate = require('./../middlewares/validate.middleware');

// Public since Phase 6: the CMS product-set picker and the storefront list active sets (pages of at most 50).
router.get('/', pageLimit, validate(adminProductSetListFilterSchema), controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/slug/:slug', controller.getBySlug);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, validate(adminProductSetReferencesPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, validate(adminProductSetReferencesPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.destroy);

/* FOR STORE */

module.exports = router;

