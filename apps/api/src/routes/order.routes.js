const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/order.controller');
const validator = require('./../validators/order.validator');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/getByUniqueId/:uniqueId', permissionValidator(USER_ROLES.USER), controller.getByUniqueId);
router.get('/list', permissionValidator(USER_ROLES.USER), controller.getAllByUser);

router.post('/attempt', permissionValidator(USER_ROLES.USER), requestValidator(validator.orderAttempt), controller.attempt);
router.post('/create', permissionValidator(USER_ROLES.USER), requestValidator(validator.orderCreate), controller.create);
router.get('/retrieve', permissionValidator(USER_ROLES.USER), controller.retrieve);
router.patch('/credit', permissionValidator(USER_ROLES.USER), controller.applyStoreCredit);

router.post('/create-shipment/:orderId', permissionValidator(USER_ROLES.USER), controller.createShipmentForDelhivery); // TODO: add payload validator
router.post('/return/:uniqueId', permissionValidator(USER_ROLES.USER), controller.returnRequest); // TODO: add payload validator
router.post('/cancel/:uniqueId', permissionValidator(USER_ROLES.USER), controller.cancelRequest); // TODO: add payload validator


/**
 *  ADMIN ROUTES
 *  ***************************************************************************************************/

// ADMIN: Order fetching
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/getById/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.get('/search', permissionValidator(USER_ROLES.ADMIN), controller.search);

// ADMIN: forward order
router.post('/ship', permissionValidator(USER_ROLES.ADMIN), controller.ship);
router.patch('/ship/:id/complete', permissionValidator(USER_ROLES.ADMIN), controller.completeShipment);

// ADMIN: for returns and replacements
router.patch('/return/:id/shipment/:requestId', permissionValidator(USER_ROLES.ADMIN), controller.alignReturnShipment);
router.patch('/return/:id/shipment/:requestId/close', permissionValidator(USER_ROLES.ADMIN), controller.closeReturnRequest);
router.patch('/replace/:id/shipment/:requestId/close', permissionValidator(USER_ROLES.ADMIN), controller.closeReplaceRequest);

/**
 *  WEBHOOKS
 *  ***************************************************************************************************/

router.post('/confirm', controller.verifyAndConfirm);
router.post('/refund/processed', controller.completeRefund);


module.exports = router;

