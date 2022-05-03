const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/productSets.controller');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');

router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

/* FOR STORE */

module.exports = router;

