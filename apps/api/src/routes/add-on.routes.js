const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const controller = require('./../controllers/add-on.controller');

router.get('/produtct/:productId', controller.getByProductId);

// ADMIN
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

module.exports = router;

