const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/stockAlert.controller');
// const validator = require('./../validators/auth.validator');


// for Users
router.get('/:product', permissionValidator(USER_ROLES.USER), controller.checkSubscription);
router.post('/', permissionValidator(USER_ROLES.USER), controller.subscribe);
router.delete('/:product', permissionValidator(USER_ROLES.USER), controller.unsubscribe);

// For Admin
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/:product/users', permissionValidator(USER_ROLES.ADMIN), controller.getAllUsersByProduct);
router.post('/:product/users', permissionValidator(USER_ROLES.ADMIN), controller.sendAllUsersByProduct);


module.exports = router;

