const { Router } = require('express');
const router = new Router();

const { addOnGroupsParamsSchema, adminAddOnFieldsPayloadSchema } = require('@pageaters/shared');
const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');
const controller = require('./../controllers/add-on.controller');

router.get('/produtct/:productId', validate(addOnGroupsParamsSchema), controller.getByProductId);

// ADMIN
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.post('/', permissionValidator(USER_ROLES.ADMIN), validate(adminAddOnFieldsPayloadSchema), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminAddOnFieldsPayloadSchema), controller.update);
router.delete('/:id', permissionValidator(USER_ROLES.ADMIN), controller.destroy);

module.exports = router;
