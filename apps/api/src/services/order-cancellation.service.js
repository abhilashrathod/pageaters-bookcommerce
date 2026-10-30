const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { STORE_CREDIT_RETURN, finishStoreCreditReturn, givesStoreCreditBack, restoreInventory } = require('./order-fulfilment.service');
const { transitionOrder } = require('./order-transition.service');

// What a cancel does, by the shopper (order-returns.service.js) or an admin (order-lifecycle.service.js): one
// conditional update (order-transition.service.js) moves the order to `cancelled` and, when it spent store credit,
// starts giving it back (`storeCreditReturn: 'pending'`); the stock goes back; the credit return runs
// (order-fulfilment finishStoreCreditReturn); then the buyer is e-mailed, which never fails the cancel.
//
// A return cut short (a failed step after the update) is logged with the order and its return state and answers 500;
// the order stays cancelled with `storeCreditReturn` `pending` or `crediting`. An admin cancelling the order again
// finishes it (only the return runs), and so does any later refund event for the order. (The shopper's cancel route
// would too, but the storefront offers Cancel only for paid, confirmed or shipped orders.) The credit is given back
// once per order, even when the order is also refunded (order-refunds.service.js).

const Order = mongoose.model(models.ORDER);

const { CANCELLED } = enums.ORDER_STAGES;
const CANCEL_RETURN = { label: 'Cancelled order', retry: 'an admin cancel or a refund event' };

/** The lookup clause for a cancelled order whose store credit return is unfinished, which a repeated cancel finishes. */
const unfinishedCancel = () => ({
  orderStatus: CANCELLED,
  // Server-built operator: trusted, so sanitizeFilter (Phase 4 7a) keeps it.
  storeCreditReturn: mongoose.trusted({ $in: [STORE_CREDIT_RETURN.PENDING, STORE_CREDIT_RETURN.CREDITING] }),
});

/** Finishes the store credit return a previous cancel left unfinished; rejects like finishStoreCreditReturn. */
const finishCancelledReturn = (order) => finishStoreCreditReturn(order, CANCEL_RETURN);

// Logs a cancelled order whose credit return is still unfinished, with its state as stored (best effort).
const logUnfinishedReturn = async (order, err) => {
  const current = await Order.findById(order._id)
    .select('storeCreditReturn')
    .catch(() => null);
  const state = current ? current.storeCreditReturn : 'unknown (could not be read)';
  logger.error(
    { err },
    `Cancelled order ${order.orderId} is cancelled, but its store credit return is left ${state}; an admin cancel or a refund event finishes it`,
  );
};

/**
 * Cancels an order in the stage it was read in (see the module header).
 * @param {object} order The order as read.
 * @param {{ history: object, request?: object, notify: () => Promise<void> }} change `notify` sends the e-mail.
 * @returns {Promise<void>} Rejects when the credit return failed (the order stays cancelled).
 * @throws {AppError} ORDER_CHANGED_CONFLICT (409) when the order changed since it was read.
 */
const cancelOrder = async (order, { history, request, notify }) => {
  const returnsCredit = givesStoreCreditBack(order);
  const set = { orderStatus: CANCELLED };
  if (returnsCredit) set.storeCreditReturn = STORE_CREDIT_RETURN.PENDING;
  await transitionOrder(order, {
    set,
    history,
    push: request ? { requests: request } : {},
    // No return started yet (a concurrent full refund may start one): the order's credit is given back once.
    filter: returnsCredit ? { storeCreditReturn: null } : {},
  });

  await restoreInventory(order);
  let failure;
  if (returnsCredit) {
    await finishCancelledReturn(order).catch(async (e) => {
      failure = e;
      await logUnfinishedReturn(order, e);
    });
  }
  try {
    await notify();
  } catch (e) {
    logger.error({ err: e }, `Cancelled order ${order.orderId}: the cancellation e-mail could not be sent`);
  }
  if (failure) throw failure;
};

module.exports = { cancelOrder, finishCancelledReturn, unfinishedCancel };
