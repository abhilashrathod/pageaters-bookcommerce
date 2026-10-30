const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/address.controller');
const {
  addressCreatePayloadSchema,
  addressGetPayloadSchema,
  addressPincodePayloadSchema,
  addressUpdatePayloadSchema,
} = require('@pageaters/shared');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('../middlewares/validate.middleware');

router.get('/', permissionValidator(USER_ROLES.USER), controller.getAllByUser);
router.get('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.getById);

router.post('/', validate(addressCreatePayloadSchema), permissionValidator(USER_ROLES.USER), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.USER), validate(addressUpdatePayloadSchema), controller.update);

router.delete('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.destroy);

router.get('/check-pincode/:pincode', validate(addressPincodePayloadSchema), controller.checkServiceability);
router.patch('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.makeDefault);


module.exports = router;

