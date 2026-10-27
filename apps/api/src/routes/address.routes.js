const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/address.controller');
const validator = require('./../validators/address.validator');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/', permissionValidator(USER_ROLES.USER), controller.getAllByUser);
router.get('/:id', requestValidator(validator.getPayload), permissionValidator(USER_ROLES.USER), controller.getById);

router.post('/', requestValidator(validator.createPayload), permissionValidator(USER_ROLES.USER), controller.create);
router.put('/:id', permissionValidator(USER_ROLES.USER), controller.update);

router.delete('/:id', requestValidator(validator.getPayload), permissionValidator(USER_ROLES.USER), controller.destroy);

router.get('/check-pincode/:pincode', requestValidator(validator.pincodePayload), controller.checkServiceability);
router.patch('/:id', requestValidator(validator.getPayload), permissionValidator(USER_ROLES.USER), controller.makeDefault);


module.exports = router;

