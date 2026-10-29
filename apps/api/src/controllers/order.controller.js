const { get } = require('lodash');

const { enums } = require('../constants');
const { AppError, handleControllerError } = require('../helpers/appError.helper');
const orderAnalytics = require('../services/order-analytics.service');
const orderCheckout = require('../services/order-checkout.service');
const orderLifecycle = require('../services/order-lifecycle.service');
const orderPayment = require('../services/order-payment.service');
const orderPricing = require('../services/order-pricing.service');
const orderQueries = require('../services/order-queries.service');
const orderReturns = require('../services/order-returns.service');
const orderShipping = require('../services/order-shipping.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).
// The order services are split by responsibility: pricing, checkout, payment (Razorpay + webhooks), fulfilment
// (stock, cart, store credit), lifecycle (admin transitions), returns (shopper requests), shipping (Delhivery),
// queries, analytics and notifications.

const userIdOf = (req) => get(req, 'user.userId', '');
const cartIdOf = (req) => req.cookies[enums.TOKEN_ID.CART_COOKIE];
// Razorpay signs the raw body; the legacy check re-serialises the parsed body, which matches for JSON Razorpay sends.
const webhookEvent = (req) => ({
  rawBody: JSON.stringify(req.body),
  signature: req.get('x-razorpay-signature'),
  payload: req.allParams().payload,
});

/* SHOPPER: checkout ****************************************************************************************/

module.exports.attempt = async (req, res) => {
  try {
    const { address } = req.allParams();
    await orderCheckout.attemptOrder(userIdOf(req), cartIdOf(req), address);
    return res.ok({ message: 'ORDER_ADDRESS_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const { method, instructions, giftOptions } = req.allParams();
    const data = await orderCheckout.placeOrder(userIdOf(req), cartIdOf(req), { method, instructions, giftOptions });
    return res.ok({ message: 'ORDER_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// The legacy controller defined `retrieve` twice with identical bodies (the second export won); this is that one.
module.exports.retrieve = async (req, res) => {
  try {
    const data = await orderCheckout.getPendingOrder(userIdOf(req));
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.applyStoreCredit = async (req, res) => {
  try {
    const { uniqueId, amount } = req.allParams();
    await orderPricing.applyStoreCredit(userIdOf(req), uniqueId, amount);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* SHOPPER: orders and requests *****************************************************************************/

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { uniqueId } = req.allParams();
    const data = await orderQueries.getUserOrder(userIdOf(req), uniqueId);
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getAllByUser = async (req, res) => {
  try {
    const data = await orderQueries.listUserOrders(userIdOf(req));
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.returnRequest = async (req, res) => {
  try {
    const { uniqueId, type, comments, reason, books, bundles } = req.allParams();
    const recorded = await orderReturns.requestReturn(userIdOf(req), uniqueId, { type, comments, reason, books, bundles });
    if (!recorded) return res.ok('ORDER_RETURN_PERIOD_LAPSED');
    return res.ok({ message: 'ORDER_RETURN_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.cancelRequest = async (req, res) => {
  try {
    const { uniqueId, reason, comments } = req.allParams();
    await orderReturns.cancelByUser(userIdOf(req), uniqueId, { reason, comments });
    return res.ok({ message: 'ORDER_CANCEL_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// Legacy (PLAN.md security step): routed with the USER guard, so any shopper can ship any paid order.
module.exports.createShipmentForDelhivery = async (req, res) => {
  try {
    const { orderId, dimensions } = req.allParams();
    const data = await orderShipping.createDelhiveryShipment(orderId, dimensions);
    return res.ok({ message: 'SHIPMENT_CREATE_SUCCESS', data });
  } catch (e) {
    // Expected refusals answer through AppError; only log an unexpected Delhivery failure.
    if (!(e instanceof AppError)) console.error('Delhivery shipment failed', e);
    return handleControllerError(res, e);
  }
};

/* ADMIN: queries *******************************************************************************************/

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, status } = req.allParams();
    const data = await orderQueries.listOrders({ page, limit, status });
    return res.ok({ message: 'CART_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await orderQueries.getOrderById(id);
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await orderQueries.searchOrders(q);
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* ADMIN: lifecycle *****************************************************************************************/

module.exports.ship = async (req, res) => {
  try {
    const { orderId, shipmentTrackingId } = req.allParams();
    const data = await orderLifecycle.shipOrder(orderId, shipmentTrackingId);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.completeShipment = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await orderLifecycle.completeShipment(id);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.cancelByAdmin = async (req, res) => {
  try {
    const { uniqueId, userId, reason, notify } = req.allParams();
    await orderLifecycle.cancelByAdmin({ uniqueId, userId, reason, notify });
    return res.ok({ message: 'ORDER_CANCEL_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.alignReturnShipment = async (req, res) => {
  try {
    const { id, requestId, shipment } = req.allParams();
    await orderShipping.alignReturnShipment(id, requestId, shipment);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.closeReturnRequest = async (req, res) => {
  try {
    const { id, requestId } = req.allParams();
    await orderLifecycle.closeReturnRequest(id, requestId);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.closeReplaceRequest = async (req, res) => {
  try {
    const { id, requestId } = req.allParams();
    await orderLifecycle.closeReplaceRequest(id, requestId);
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* WEBHOOKS (Razorpay): always `{ status: 'ok' }` unless something throws ************************************/

module.exports.verifyAndConfirm = async (req, res) => {
  try {
    await orderPayment.confirmPayment(webhookEvent(req));
    return res.json({ status: 'ok' });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.completeRefund = async (req, res) => {
  try {
    await orderPayment.recordRefund(webhookEvent(req));
    return res.json({ status: 'ok' });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* ADMIN: analytics *****************************************************************************************/

module.exports.getAnalyticsBestSelling = async (req, res) => {
  try {
    const { startDate, endDate } = req.allParams();
    const data = await orderAnalytics.bestSellingBooks({ startDate, endDate });
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getAnalyticsRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.allParams();
    const data = await orderAnalytics.revenue({ startDate, endDate });
    return res.ok({ message: 'ORDER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
