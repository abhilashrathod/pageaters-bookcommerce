const { Router } = require('express');
const router = new Router();

const { adminBookReferencesPayloadSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');

const controller = require('./../controllers/storeBook.controller');

router.get('/', controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search', controller.search);

// ADMIN
router.get('/get/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminBookReferencesPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminBookReferencesPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);


module.exports = router;

