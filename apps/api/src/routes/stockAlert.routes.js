const { Router } = require('express');
const router = new Router();

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/stockAlert.controller');
// const validator = require('./../validators/auth.validator');


// For Admin
router.get('/', controller.getAll);
router.get('/:product/users', controller.getAllUsersByProduct);
router.post('/:product/users', controller.sendAllUsersByProduct);

// for Users
router.get('/:product', permissionValidator(), controller.checkSubscription);
router.post('/', permissionValidator(), controller.subscribe);
router.delete('/:product', permissionValidator(), controller.unsubscribe);

module.exports = router;

