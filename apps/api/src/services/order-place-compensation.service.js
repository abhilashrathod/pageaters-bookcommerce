const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { undoStoreCreditDebit } = require('./order-fulfilment.service');

// Compensation for a COD place that fails after the order was confirmed (there are no MongoDB transactions): the order
// goes back to how it was read, and store credit already debited is given back only once the order is no longer
// confirmed, so a confirmed order never keeps a returned credit. Every outcome that needs a person is logged with the
// order id (ids and amounts only).

const Order = mongoose.model(models.ORDER);

const { CONFIRMED, CANCELLED } = enums.ORDER_STAGES;

/** MongoDB's duplicate-key error code. */
const DUPLICATE_KEY = 11000;
/** The order model's unique partial index: one `attempted` or `created` order per user. */
const PENDING_ORDER_INDEX = 'one_pending_order_per_user';
const CHECKOUT_FAILED = 'Checkout could not be completed and a newer checkout was started, so this order was cancelled.';

/**
 * Whether `error` is the duplicate key of the one-pending-order index (not of another unique index).
 * @param {unknown} error
 * @returns {boolean}
 */
const isPendingOrderConflict = (error) =>
  Boolean(error) && error.code === DUPLICATE_KEY && (error.keyPattern?.userId === 1 || String(error.message).includes(PENDING_ORDER_INDEX));

/**
 * Takes a confirmed COD order out of `confirmed` after its place failed. It goes back to the stage it was read in
 * (`before`, the confirmation history entry removed). When that stage is pending and the user started a newer checkout
 * meanwhile, the one-pending-order index refuses it; the order is then cancelled instead (a terminal stage: it can't
 * collide, and a cancelled order is never shipped), logged as a warning. Stock is not involved: a COD place takes it
 * only after this point. Never rejects.
 * @param {{ _id: unknown, orderId: string }} order
 * @param {object} before The fields the place overwrote, as read.
 * @param {unknown} historyId The confirmation history entry's `_id`.
 * @param {{ transaction: unknown, amount: number } | null} debit Store credit already debited for it, if any.
 * @returns {Promise<boolean>} true when the order is no longer confirmed by this place; false when it may still be
 *   (logged: it is confirmed without the credit debit, or with a debit that could not be linked).
 */
const putBackPlacedOrder = async (order, before, historyId, debit) => {
  const filter = { _id: order._id, orderStatus: CONFIRMED };
  let failure;
  try {
    const reverted = await Order.updateOne(filter, { $set: before, $pull: { orderHistory: { _id: historyId } } });
    if (reverted.matchedCount === 1) return true;
  } catch (e) {
    failure = e;
  }
  if (isPendingOrderConflict(failure)) {
    try {
      const cancelled = await Order.updateOne(filter, {
        $set: { orderStatus: CANCELLED },
        $push: { orderHistory: { title: CANCELLED, description: CHECKOUT_FAILED, time: new Date().toISOString() } },
      });
      if (cancelled.matchedCount === 1) {
        logger.warn(`Order ${order.orderId}: its COD place failed and a newer checkout exists, so it was cancelled`);
        return true;
      }
    } catch (e) {
      failure = e;
    }
  }
  if (debit) {
    logger.error(
      { err: failure },
      `Order ${order.orderId}: store credit transaction ${debit.transaction} could not be linked or undone; check the order and the balance`,
    );
  } else {
    logger.error(
      { err: failure },
      `Order ${order.orderId} could not be put back after its COD place failed: it may be confirmed without its store credit debit`,
    );
  }
  return false;
};

/**
 * After linking the DEBIT transaction to a confirmed COD order failed: decides from a fresh read of the order, since
 * a lost write acknowledgement can hide a write that landed. Linked → the write landed, nothing to undo (returns, and
 * the order completes). Not linked → the order is taken out of `confirmed` (putBackPlacedOrder) and only then the
 * credit given back (a failure to give it back is logged: order-fulfilment undoStoreCreditDebit); rejects with
 * `error`. The read or the put-back failing → nothing is given back (the order may still be confirmed and the credit is
 * then rightly spent), logged for a follow-up; rejects.
 * @param {{ _id: unknown, orderId: string, userId: unknown }} order The order as read.
 * @param {unknown} transaction The DEBIT transaction's `_id`.
 * @param {number} storeCredit
 * @param {(debit: { transaction: unknown, amount: number }) => Promise<boolean>} putBack putBackPlacedOrder for it.
 * @param {unknown} error The failed write's error.
 * @returns {Promise<void>}
 */
const settleFailedLink = async (order, transaction, storeCredit, putBack, error) => {
  let current;
  try {
    current = await Order.findById(order._id).select('storeCreditTransaction');
  } catch (e) {
    logger.error(
      { err: e },
      `Order ${order.orderId}: store credit transaction ${transaction} could not be linked or undone; check the order and the balance`,
    );
    throw error;
  }
  if (current && String(current.storeCreditTransaction) === String(transaction)) return;
  if (await putBack({ transaction, amount: storeCredit })) await undoStoreCreditDebit(order, transaction, storeCredit);
  throw error;
};

module.exports = { isPendingOrderConflict, putBackPlacedOrder, settleFailedLink };
