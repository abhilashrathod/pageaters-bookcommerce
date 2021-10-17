const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/order.controller');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

// router.get('/', permissionValidator(USER_ROLES.USER), controller.getAllByUser);
// router.get('/:uniqueId', permissionValidator(USER_ROLES.USER), controller.getById);

router.post('/', permissionValidator(USER_ROLES.USER), controller.create);

// router.patch('/:id', permissionValidator(USER_ROLES.USER), controller.update);
// router.delete('/:id', permissionValidator(USER_ROLES.USER), controller.destroy);

// router.get('/check-pincode/:pincode', controller.checkServiceability);


module.exports = router;

