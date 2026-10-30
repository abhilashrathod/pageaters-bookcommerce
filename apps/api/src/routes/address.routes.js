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
const { limiters } = require('../middlewares/rateLimit.middleware');

router.get('/', permissionValidator(USER_ROLES.USER), controller.getAllByUser);
router.get('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.getById);

router.post('/', validate(addressCreatePayloadSchema), permissionValidator(USER_ROLES.USER), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.USER), validate(addressUpdatePayloadSchema), controller.update);

router.delete('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.destroy);

// Public: each check spends the courier's API quota, so it has its own stricter limit.
router.get('/check-pincode/:pincode', limiters.pincodeCheck, validate(addressPincodePayloadSchema), controller.checkServiceability);
router.patch('/:id', validate(addressGetPayloadSchema), permissionValidator(USER_ROLES.USER), controller.makeDefault);


module.exports = router;

