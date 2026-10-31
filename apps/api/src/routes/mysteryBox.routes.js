const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/mysteryBox.controller');
const pageLimit = require('./../middlewares/pageLimit.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const { demoAdminReadOnly } = require('../middlewares/demoMode.middleware');

router.get('/', pageLimit, controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.destroy);

module.exports = router;

