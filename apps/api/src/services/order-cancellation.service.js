const { enums } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { restoreInventory } = require('./order-fulfilment.service');
const { transitionOrder } = require('./order-transition.service');

// What a cancel does, by the shopper (order-returns.service.js) or an admin (order-lifecycle.service.js): one
// conditional update (order-transition.service.js) moves the order to `cancelled`, the stock goes back, then the buyer
// is e-mailed, which never fails the cancel. Store credit works like a coupon: once applied to an order it is spent,
// so a cancel never gives it back. No refund is started.

const { CANCELLED } = enums.ORDER_STAGES;

/**
 * Cancels an order in the stage it was read in (see the module header).
 * @param {object} order The order as read.
 * @param {{ history: object, request?: object, notify: () => Promise<void> }} change `notify` sends the e-mail.
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_CHANGED_CONFLICT (409) when the order changed since it was read.
 */
const cancelOrder = async (order, { history, request, notify }) => {
  await transitionOrder(order, { set: { orderStatus: CANCELLED }, history, push: request ? { requests: request } : {} });

  await restoreInventory(order);
  try {
    await notify();
  } catch (e) {
    logger.error({ err: e }, `Cancelled order ${order.orderId}: the cancellation e-mail could not be sent`);
  }
};

module.exports = { cancelOrder };
