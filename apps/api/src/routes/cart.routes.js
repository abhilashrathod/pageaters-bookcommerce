const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/cart.controller');
const validator = require('./../validators/cart.validator');

const cartValidator = require('../middlewares/cartValidator.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/retrieve', permissionValidator(USER_ROLES.USER), cartValidator(), controller.retrieve);

router.post('/add', permissionValidator(USER_ROLES.USER), cartValidator(), requestValidator(validator.cartItemAddPayload), controller.add);
router.post('/add/bundle', permissionValidator(USER_ROLES.USER), cartValidator(), controller.addBundle);
router.post('/add/box', permissionValidator(USER_ROLES.USER), cartValidator(), controller.addBox);
router.post('/add/addOn', permissionValidator(USER_ROLES.USER), cartValidator(), controller.addAddon);

router.put('/update/:id', permissionValidator(USER_ROLES.USER), cartValidator(), controller.update);
router.put('/update/addOn/:id', permissionValidator(USER_ROLES.USER), cartValidator(), controller.updateAddonQuantity);

router.delete('/remove/:id', permissionValidator(USER_ROLES.USER), cartValidator(), controller.remove);
router.delete('/remove/bundle/:bundleId', permissionValidator(USER_ROLES.USER), cartValidator(), controller.removeBundle);
router.delete('/remove/box/:boxId', permissionValidator(USER_ROLES.USER), cartValidator(), controller.removeBox);
router.delete('/remove/addOn/:addOnId', permissionValidator(USER_ROLES.USER), cartValidator(), controller.removeAddon);

router.delete('/empty', permissionValidator(USER_ROLES.USER), cartValidator(), controller.empty); // clears all products from cart
router.delete('/clear', permissionValidator(USER_ROLES.USER), cartValidator(), controller.clear); // clears cookie

// ADMIN
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/:id', permissionValidator(USER_ROLES.ADMIN), controller.view);

module.exports = router;
