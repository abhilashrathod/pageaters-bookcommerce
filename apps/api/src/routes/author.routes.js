const { Router } = require('express');
const router = new Router();

const { adminAuthorBooksPayloadSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const pageLimit = require('./../middlewares/pageLimit.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const { demoAdminReadOnly } = require('../middlewares/demoMode.middleware');
const validate = require('./../middlewares/validate.middleware');
const controller = require('./../controllers/author.controller');

router.get('/', pageLimit, controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search', controller.search);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, validate(adminAuthorBooksPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, validate(adminAuthorBooksPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), demoAdminReadOnly, controller.destroy);

module.exports = router;

