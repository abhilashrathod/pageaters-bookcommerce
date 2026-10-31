const { Router } = require('express');
const router = new Router();

const { adminCollectionReferencesPayloadSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const pageLimit = require('./../middlewares/pageLimit.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');
const controller = require('./../controllers/collection.controller');

router.get('/', pageLimit, controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search/:q', controller.search);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminCollectionReferencesPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminCollectionReferencesPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

module.exports = router;

