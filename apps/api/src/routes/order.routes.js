const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/order.controller');
const {
  adminOrderCancelPayloadSchema,
  adminOrderShipPayloadSchema,
  adminReturnShipmentRequestSchema,
  adminShipmentCreateRequestSchema,
  orderAttemptPayloadSchema,
  orderCancelPayloadSchema,
  orderCreatePayloadSchema,
  orderReturnPayloadSchema,
  orderStoreCreditPayloadSchema,
} = require('@pageaters/shared');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('../middlewares/validate.middleware');

router.get('/getByUniqueId/:uniqueId', permissionValidator(USER_ROLES.USER), controller.getByUniqueId);
router.get('/list', permissionValidator(USER_ROLES.USER), controller.getAllByUser);

router.post('/attempt', permissionValidator(USER_ROLES.USER), validate(orderAttemptPayloadSchema), controller.attempt);
router.post('/create', permissionValidator(USER_ROLES.USER), validate(orderCreatePayloadSchema), controller.create);
router.get('/retrieve', permissionValidator(USER_ROLES.USER), controller.retrieve);
router.patch('/credit', permissionValidator(USER_ROLES.USER), validate(orderStoreCreditPayloadSchema), controller.applyStoreCredit);

router.post('/return/:uniqueId', permissionValidator(USER_ROLES.USER), validate(orderReturnPayloadSchema), controller.returnRequest);
router.post('/cancel/:uniqueId', permissionValidator(USER_ROLES.USER), validate(orderCancelPayloadSchema), controller.cancelRequest);

/**
 *  ADMIN ROUTES
 *  ***************************************************************************************************/

// ADMIN: Order fetching
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/getById/:id', permissionValidator(USER_ROLES.ADMIN), controller.getById);
router.get('/search', permissionValidator(USER_ROLES.ADMIN), controller.search);

// ADMIN: forward order (create-shipment was guarded only as USER with no owner filter: any shopper could ship any
// paid order)
router.post(
  '/create-shipment/:orderId',
  permissionValidator(USER_ROLES.ADMIN),
  validate(adminShipmentCreateRequestSchema),
  controller.createShipmentForDelhivery,
);
router.post('/ship', permissionValidator(USER_ROLES.ADMIN), validate(adminOrderShipPayloadSchema), controller.ship);
router.patch('/ship/:id/complete', permissionValidator(USER_ROLES.ADMIN), controller.completeShipment);

// ADMIN: for returns and replacements
router.patch(
  '/return/:id/shipment/:requestId',
  permissionValidator(USER_ROLES.ADMIN),
  validate(adminReturnShipmentRequestSchema),
  controller.alignReturnShipment,
);
router.patch('/return/:id/shipment/:requestId/close', permissionValidator(USER_ROLES.ADMIN), controller.closeReturnRequest);
router.patch('/replace/:id/shipment/:requestId/close', permissionValidator(USER_ROLES.ADMIN), controller.closeReplaceRequest);
router.post('/admin-cancel/:id', permissionValidator(USER_ROLES.ADMIN), validate(adminOrderCancelPayloadSchema), controller.cancelByAdmin);

/**
 *  WEBHOOKS
 *  ***************************************************************************************************/

// Public by design: Razorpay calls them, and each verifies the signature over the raw body (req.rawBody, app.js).
router.post('/confirm', controller.verifyAndConfirm);
router.post('/refund/processed', controller.completeRefund);

/**
 *  ANALYTICS
 *  ***************************************************************************************************/


router.get('/analytics/best-selling', permissionValidator(USER_ROLES.ADMIN), controller.getAnalyticsBestSelling);
router.get('/analytics/revenue', permissionValidator(USER_ROLES.ADMIN), controller.getAnalyticsRevenue);

module.exports = router;

