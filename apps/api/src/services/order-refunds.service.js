const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { addToBalance, recordStoreCreditReturn } = require('./order-fulfilment.service');
const { isId, paymentSummary, verifiedEvent } = require('./order-payment.service');

// The refund-processed webhook (Razorpay). Like the payment webhook (order-payment.service.js) it acts only on the
// signed raw body and answers `{ status: 'ok' }` (the controller does that), or 500 when the store credit of a refunded
// order could not be given back yet, so Razorpay redelivers the event and the redelivery finishes it.

const Order = mongoose.model(models.ORDER);

const { REFUNDED } = enums.ORDER_STAGES;
const REFUND_PROCESSED = 'refund.processed';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';
const PARTIAL_REFUND_TITLE = 'Partial refund';

// order.storeCreditReturn (order.model.js).
const RETURN_PENDING = 'pending';
const RETURN_CREDITING = 'crediting';
const RETURN_DONE = 'returned';

/** Whether a refunded order's store credit return is unfinished (a redelivered refund event finishes it). */
const returnUnfinished = (order) => order.storeCreditReturn === RETURN_PENDING || order.storeCreditReturn === RETURN_CREDITING;

/**
 * Gives back the store credit a refunded order spent, from `storeCreditReturn: 'pending'` (set by the update that
 * marked the order refunded, so a crash in between leaves it findable) or `crediting`. Every step is idempotent, so
 * a retry or a concurrent call finishes the return without giving anything twice: record the CREDIT transaction (one
 * row per order, order-fulfilment recordStoreCreditReturn), mark it `crediting`, add it to the balance once per
 * credit id (order-fulfilment addToBalance), mark it `returned`.
 * @param {object} order The refunded order (`_id`, `orderId`, `userId`, `storeCredit`).
 * @returns {Promise<void>} Rejects when a step failed (left `pending` or `crediting`, logged: a redelivered refund
 *   event retries it). A missing user is logged and left `crediting`.
 */
const finishStoreCreditReturn = async (order) => {
  const creditId = await recordStoreCreditReturn(order._id, order.userId, order.storeCredit);
  try {
    await Order.updateOne({ _id: order._id, storeCreditReturn: RETURN_PENDING }, { $set: { storeCreditReturn: RETURN_CREDITING } });
  } catch (e) {
    logger.error(
      { err: e },
      `Refunded order ${order.orderId}: CREDIT transaction ${creditId} is recorded, but marking the return crediting failed; a redelivered refund event retries it`,
    );
    throw e;
  }

  let outcome;
  try {
    outcome = await addToBalance(order.userId, creditId, order.storeCredit);
  } catch (e) {
    logger.error(
      { err: e },
      `Refunded order ${order.orderId}: adding CREDIT transaction ${creditId} (${order.storeCredit}) to the balance failed; a redelivered refund event retries it`,
    );
    throw e;
  }
  if (outcome === 'no-user') {
    logger.error(`Refunded order ${order.orderId}: its user no longer exists, so CREDIT transaction ${creditId} is on no balance`);
    return;
  }

  // Server-built operator: trusted, so sanitizeFilter (Phase 4 7a) keeps it.
  const unfinished = mongoose.trusted({ $in: [RETURN_PENDING, RETURN_CREDITING] });
  try {
    await Order.updateOne({ _id: order._id, storeCreditReturn: unfinished }, { $set: { storeCreditReturn: RETURN_DONE } });
  } catch (e) {
    logger.error(
      { err: e },
      `Refunded order ${order.orderId}: store credit given back (${creditId}), but marking the return returned failed; a redelivered refund event finishes it`,
    );
    throw e;
  }
};

/**
 * Records the refunded payment's summary unless the order already holds a newer one (a larger `amount_refunded`):
 * refund events can arrive out of order.
 * @param {object} order
 * @param {object} entity The Razorpay payment entity of the event.
 * @returns {Promise<void>}
 */
const recordPaymentSummary = async (order, entity) => {
  if (!Number.isFinite(entity.amount_refunded)) return;
  // Server-built operators: trusted, so sanitizeFilter (Phase 4 7a) keeps them.
  await Order.updateOne(
    {
      _id: order._id,
      $or: [
        { 'payment.amount_refunded': mongoose.trusted({ $lte: entity.amount_refunded }) },
        { 'payment.amount_refunded': mongoose.trusted({ $exists: false }) },
      ],
    },
    { $set: { payment: paymentSummary(entity) } },
  );
};

/**
 * Refund-processed webhook: acts on a correctly signed `refund.processed` event whose refund (`payload.refund.entity`,
 * with its `id`) is for the payment that paid the order with that Razorpay order id, unless the order is already
 * refunded or this refund id is already recorded (`order.refundIds`): a redelivered refund counts once. A full refund
 * (the payment's `amount_refunded` reaches its `amount`) marks the order refunded and gives back the store credit the
 * order spent (finishStoreCreditReturn); a partial one only adds a history entry. One conditional update records it,
 * so of concurrent deliveries only one wins, and the credit is given back once. The order's payment then becomes the
 * refunded payment's summary (PAYMENT_SUMMARY_FIELDS), unless it already holds a later one.
 * An event for an order already refunded whose credit return is unfinished (`pending` or `crediting`) finishes it.
 * Legacy, kept: a full refund applies to an order in any other stage.
 * @param {{ rawBody: string | Buffer, signature?: string }} event `rawBody` is the signed request body.
 * @returns {Promise<void>} Rejects when giving back the store credit failed (see finishStoreCreditReturn).
 */
const recordRefund = async ({ rawBody, signature }) => {
  const event = verifiedEvent(rawBody, signature);
  if (get(event, 'event') !== REFUND_PROCESSED) return;
  const entity = get(event, 'payload.payment.entity', {});
  const refund = get(event, 'payload.refund.entity', {});
  if (!isId(entity.order_id) || !isId(refund.payment_id) || !isId(refund.id)) return;

  const order = await Order.findOne({ razorOrderId: entity.order_id });
  if (!order || refund.payment_id !== order.razorPaymentId) return;
  if (order.orderStatus === REFUNDED) {
    if (returnUnfinished(order)) await finishStoreCreditReturn(order);
    return;
  }

  const full = Number.isFinite(entity.amount) && Number.isFinite(entity.amount_refunded) && entity.amount_refunded >= entity.amount;
  const givesCreditBack = full && order.storeCredit > 0 && Boolean(order.storeCreditTransaction);
  const rupees = Number.isFinite(refund.amount) ? refund.amount / 100 : 0;
  const history = full
    ? { title: REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() }
    : { title: PARTIAL_REFUND_TITLE, description: `A refund of INR ${rupees} is processed.`, time: new Date().toISOString() };
  const set = {};
  if (full) set.orderStatus = REFUNDED;
  if (givesCreditBack) set.storeCreditReturn = RETURN_PENDING;

  // Server-built operators: trusted, so sanitizeFilter (Phase 4 7a) keeps them.
  const recorded = await Order.updateOne(
    {
      _id: order._id,
      razorPaymentId: refund.payment_id,
      orderStatus: mongoose.trusted({ $ne: REFUNDED }),
      refundIds: mongoose.trusted({ $ne: refund.id }),
    },
    { $set: set, $push: { orderHistory: history, refundIds: refund.id } },
  );
  if (recorded.modifiedCount !== 1) return;

  await recordPaymentSummary(order, entity);
  if (givesCreditBack) await finishStoreCreditReturn(order);
};

module.exports = { recordRefund };
