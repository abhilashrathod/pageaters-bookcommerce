const { Router } = require('express');
const router = new Router();

const { adminAuthorBooksPayloadSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');
const controller = require('./../controllers/author.controller');

router.get('/', controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search', controller.search);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminAuthorBooksPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminAuthorBooksPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

module.exports = router;

