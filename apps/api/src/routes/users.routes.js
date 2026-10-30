const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/user.controller');

router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/search', permissionValidator(USER_ROLES.ADMIN), controller.search);
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getAllDetails);

module.exports = router;
