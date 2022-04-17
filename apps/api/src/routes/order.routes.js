const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/order.controller');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/getByUniqueId/:uniqueId', permissionValidator(USER_ROLES.USER), controller.getByUniqueId);
router.get('/list', permissionValidator(USER_ROLES.USER), controller.getAllByUser);

router.post('/create', permissionValidator(USER_ROLES.USER), controller.create);
router.post('/attempt', permissionValidator(USER_ROLES.USER), controller.attempt);
router.get('/retrieve', permissionValidator(USER_ROLES.USER), controller.retrieve);

router.post('/return/:uniqueId', permissionValidator(USER_ROLES.USER), controller.returnRequest);
router.post('/cancel/:uniqueId', permissionValidator(USER_ROLES.USER), controller.cancelRequest);


/**
 *  ADMIN ROUTES // TODO: Add middleware
 *  ***************************************************************************************************/


router.get('/', controller.getAll);
router.get('/getById/:id', controller.getById);

// ADMIN: forward order
router.post('/ship', controller.ship);
router.patch('/ship/:id/complete', controller.completeShipment);

// ADMIN: for returns and replacements
router.patch('/return/:id/shipment/:requestId', controller.alignReturnShipment);
router.patch('/return/:id/shipment/:requestId/close', controller.closeReturnRequest);
router.patch('/replace/:id/shipment/:requestId/close', controller.closeReplaceRequest);

// webhooks
router.post('/confirm', controller.verifyAndConfirm);
router.post('/refund/processed', controller.completeRefund);


module.exports = router;

