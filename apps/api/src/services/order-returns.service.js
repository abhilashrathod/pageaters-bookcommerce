const mongoose = require('mongoose');
const moment = require('moment');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { cancelOrder } = require('./order-cancellation.service');
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
 * `replacement` and the buyer gets the request e-mail. The route validates `type` (return or replace).
 * The period runs from the order's `fulfilled` history entry; an order without one (or with an unreadable time) is
 * treated as past it.
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @param {{ type: string, reason?: string, comments?: string, books?: string[], bundles?: string[] }} request
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such `fulfilled` order of the user), ORDER_RETURN_PERIOD_LAPSED
 *   (400, more than 7 days after delivery; legacy answered it as a 200 success and changed nothing).
 */
const requestReturn = async (userId, uniqueId, { type, comments, reason, books, bundles }) => {
  const order = await Order.findOne({ orderId: uniqueId, userId, orderStatus: FULFILLED }).populate([BUYER, { path: 'deliveryAddress' }]);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const delivered = order.orderHistory.find((entry) => entry.title === FULFILLED);
  const deliveredAt = delivered ? Date.parse(delivered.time) : NaN;
  const periodStart = moment().subtract(RETURN_PERIOD_DAYS, 'days').valueOf();
  if (!(deliveredAt >= periodStart)) throw new AppError('ORDER_RETURN_PERIOD_LAPSED');

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

  await sendRequestEmail(order, type);
};

/**
 * Shopper: cancels a paid or confirmed order, records the cancel request, e-mails the buyer (production only) and
 * puts the stock back (order-cancellation.service.js). Store credit applied to the order is spent and stays spent.
 * No refund is started.
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @param {{ reason?: string, comments?: string }} request
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_CANCEL_INVALID (already shipped), ORDER_INFO_ATTEMPT_FAILED (no such paid/confirmed order
 *   of the user), ORDER_CHANGED_CONFLICT (409, it changed meanwhile).
 */
const cancelByUser = async (userId, uniqueId, { reason, comments }) => {
  if (await Order.exists({ orderStatus: SHIPPED, orderId: uniqueId, userId })) {
    throw new AppError('ORDER_CANCEL_INVALID');
  }

  const order = await Order.findOne({ $or: [{ orderStatus: PAID }, { orderStatus: CONFIRMED }], orderId: uniqueId, userId }).populate([BUYER]);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  await cancelOrder(order, {
    history: { title: CANCELLED, description: 'Order cancelled by customer.', time: new Date().toISOString() },
    request: {
      type: CANCEL,
      date: new Date().toISOString(),
      info: { reason, comments },
      status: enums.ORDER_REQUEST_STATUS.OPEN,
      books: [],
      bundles: [],
    },
    notify: () => sendCancelEmail(order),
  });
};

module.exports = { cancelByUser, requestReturn };
