const { Router } = require('express');
const router = new Router();

const { adminDealReferencesPayloadSchema, dealListFilterSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const pageLimit = require('./../middlewares/pageLimit.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');

const controller = require('./../controllers/storeDeal.contoller');

router.get('/', validate(dealListFilterSchema), pageLimit, controller.getAll);
router.get('/unique/:id', controller.getByUniqueId);

// ADMIN
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminDealReferencesPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminDealReferencesPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

module.exports = router;
