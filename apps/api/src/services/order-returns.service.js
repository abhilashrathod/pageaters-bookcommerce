const mongoose = require('mongoose');
const moment = require('moment');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { restoreInventory } = require('./order-fulfilment.service');
const { sendCancelEmail, sendRequestEmail } = require('./order-notifications.service');

// Shopper requests on a placed order: cancel before shipping, return or replace within 7 days of delivery.
// Each is recorded in `order.requests` with status `open`.

const Order = mongoose.model(models.ORDER);

const { PAID, CONFIRMED, SHIPPED, FULFILLED, CANCELLED, RETURNED, REPLACEMENT } = enums.ORDER_STAGES;
const { RETURN, REPLACE, CANCEL } = enums.ORDER_REQUEST_TYPES;
const RETURN_PERIOD_DAYS = 7;
const BUYER = { path: 'userId', select: 'fullName email contactNo' };

/**
 * Shopper: asks to return or replace a delivered order within 7 days of delivery. The order moves to `returned` or
 * `replacement` and the buyer gets the request e-mail.
 * Legacy (PLAN.md legacy-bugs step): after the period it answers success with ORDER_RETURN_PERIOD_LAPSED (this
 * returns false). Any other `type` still saves an open request and an empty history entry, keeps the stage, then
 * throws a TypeError building the e-mail when `type` is missing (→ 500).
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @param {{ type?: string, reason?: string, comments?: string, books?: string[], bundles?: string[] }} request
 * @returns {Promise<boolean>} true when the request was recorded, false when the return period has lapsed.
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such `fulfilled` order of the user).
 */
const requestReturn = async (userId, uniqueId, { type, comments, reason, books, bundles }) => {
  const order = await Order.findOne({ orderId: uniqueId, userId, orderStatus: FULFILLED }).populate([BUYER, { path: 'deliveryAddress' }]);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const delivered = order.orderHistory.find((entry) => entry.title === FULFILLED);
  const periodStart = moment().subtract(RETURN_PERIOD_DAYS, 'days').toDate().toISOString();
  if (!(delivered.time >= periodStart)) return false;

  const log = {};
  if (type === RETURN) {
    Object.assign(log, {
      title: RETURNED,
      description:
        'Return request is received. Return shipment will be aligned shortly and refund will be done after shipment is reached us.',
      time: new Date().toISOString(),
    });
    order.orderStatus = RETURNED;
  }
  if (type === REPLACE) {
    order.orderStatus = REPLACEMENT;
    Object.assign(log, {
      title: REPLACEMENT,
      description: 'Replacement request is received. A new set of books will be dispatched from our side and pickup will be arranged soon',
      time: new Date().toISOString(),
    });
  }

  order.orderHistory.push(log);
  order.requests.push({
    type,
    date: new Date().toISOString(),
    info: { reason, comments },
    status: enums.ORDER_REQUEST_STATUS.OPEN,
    books,
    bundles,
  });
  await order.save();

  sendRequestEmail(order, type);
  return true;
};

/**
 * Shopper: cancels a paid or confirmed order, records the cancel request, e-mails the buyer (production only) and
 * puts the stock back. No refund is started.
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @param {{ reason?: string, comments?: string }} request
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_CANCEL_INVALID (already shipped), ORDER_INFO_ATTEMPT_FAILED (no such paid/confirmed order
 *   of the user).
 */
const cancelByUser = async (userId, uniqueId, { reason, comments }) => {
  if (await Order.findOne({ orderStatus: SHIPPED, orderId: uniqueId, userId }).populate([BUYER])) {
    throw new AppError('ORDER_CANCEL_INVALID');
  }

  const order = await Order.findOne({ $or: [{ orderStatus: PAID }, { orderStatus: CONFIRMED }], orderId: uniqueId, userId }).populate([
    BUYER,
  ]);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  order.orderStatus = CANCELLED;
  order.orderHistory.push({ title: CANCELLED, description: 'Order cancelled by customer.', time: new Date().toISOString() });
  order.requests.push({
    type: CANCEL,
    date: new Date().toISOString(),
    info: { reason, comments },
    status: enums.ORDER_REQUEST_STATUS.OPEN,
    books: [],
    bundles: [],
  });
  await order.save();

  sendCancelEmail(order);
  await restoreInventory(order);
};

module.exports = { cancelByUser, requestReturn };
