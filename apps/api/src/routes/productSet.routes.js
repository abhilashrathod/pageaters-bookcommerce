const { Router } = require('express');
const router = new Router();

const { adminProductSetReferencesPayloadSchema, adminProductSetListFilterSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/productSets.controller');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');

router.get('/', permissionValidator(USER_ROLES.ADMIN), validate(adminProductSetListFilterSchema), controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/slug/:slug', controller.getBySlug);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminProductSetReferencesPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminProductSetReferencesPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

/* FOR STORE */

module.exports = router;

