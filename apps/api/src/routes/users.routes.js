const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/user.controller');

router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), controller.update);
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getAllDetails);

module.exports = router;
