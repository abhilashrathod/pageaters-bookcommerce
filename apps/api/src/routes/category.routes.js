const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const pageLimit = require('./../middlewares/pageLimit.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const { demoAdminReadOnly } = require('../middlewares/demoMode.middleware');
const controller = require('./../controllers/category.controller');

router.get('/', pageLimit, controller.getAll);
router.get('/:id/products', pageLimit, controller.getAllProducts);
router.get('/:id/overview', pageLimit, controller.getOverviewProducts);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search/:q', controller.search);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.destroy);

module.exports = router;

