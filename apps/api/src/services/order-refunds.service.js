const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { STORE_CREDIT_RETURN, finishStoreCreditReturn, givesStoreCreditBack, returnUnfinished } = require('./order-fulfilment.service');
const { isId, paymentSummary, verifiedEvent } = require('./order-payment.service');

// The refund-processed webhook (Razorpay). Like the payment webhook (order-payment.service.js) it acts only on the
// signed raw body and answers `{ status: 'ok' }` (the controller does that), or 500 when the store credit of a refunded
// order could not be given back yet, so Razorpay redelivers the event and the redelivery finishes it.
//
// A refund counts once per refund id (`order.refundIds`). A full one (the payment's `amount_refunded` reaches its
// `amount`) marks the order refunded and gives back the store credit it spent (order-fulfilment
// finishStoreCreditReturn), unless a cancel already started giving it back; a partial one only adds a history entry.
// One conditional update records it, so of concurrent deliveries only one wins, and the credit is given back once per
// order, whether it is cancelled, refunded or both. An event for an order whose credit return is unfinished (after a
// refund or a cancel) finishes it. Legacy, kept: a full refund applies to an order in any other stage (a cancelled one
// included).

const Order = mongoose.model(models.ORDER);

const { REFUNDED } = enums.ORDER_STAGES;
const REFUND_PROCESSED = 'refund.processed';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';
const PARTIAL_REFUND_TITLE = 'Partial refund';

// Logs of a refunded order's store credit return (order-fulfilment finishStoreCreditReturn).
const REFUND_RETURN = { label: 'Refunded order', retry: 'a redelivered refund event' };

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
 * Records one verified refund on the order as read (see the module header).
 * @param {object} order
 * @param {object} entity The payment entity of the event.
 * @param {object} refund The refund entity of the event.
 * @param {boolean} retry Whether a missed update may read the order again.
 * @returns {Promise<void>}
 */
const applyRefund = async (order, entity, refund, retry) => {
  if (order.orderStatus === REFUNDED) {
    if (returnUnfinished(order)) await finishStoreCreditReturn(order, REFUND_RETURN);
    return;
  }

  const full = Number.isFinite(entity.amount) && Number.isFinite(entity.amount_refunded) && entity.amount_refunded >= entity.amount;
  const givesCreditBack = full && givesStoreCreditBack(order);
  const rupees = Number.isFinite(refund.amount) ? refund.amount / 100 : 0;
  const history = full
    ? { title: REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() }
    : { title: PARTIAL_REFUND_TITLE, description: `A refund of INR ${rupees} is processed.`, time: new Date().toISOString() };
  const set = {};
  if (full) set.orderStatus = REFUNDED;
  if (givesCreditBack) set.storeCreditReturn = STORE_CREDIT_RETURN.PENDING;

  // Server-built operators: trusted, so sanitizeFilter (Phase 4 7a) keeps them.
  const filter = {
    _id: order._id,
    razorPaymentId: refund.payment_id,
    orderStatus: mongoose.trusted({ $ne: REFUNDED }),
    refundIds: mongoose.trusted({ $ne: refund.id }),
  };
  // No return started yet (a cancel may start one meanwhile): the order's credit is given back once.
  if (givesCreditBack) filter.storeCreditReturn = null;
  const recorded = await Order.updateOne(filter, { $set: set, $push: { orderHistory: history, refundIds: refund.id } });
  if (recorded.modifiedCount !== 1) {
    // Missed: the order is refunded already, this refund id is recorded already (a redelivery), or a cancel started
    // the credit return since the read. Only the last needs another try: read the order once more and record the
    // refund without a second return (the other two then miss again and stop).
    if (!givesCreditBack || !retry) return;
    const current = await Order.findOne({ _id: order._id });
    if (current) await applyRefund(current, entity, refund, false);
    return;
  }

  await recordPaymentSummary(order, entity);
  if (givesCreditBack || returnUnfinished(order)) await finishStoreCreditReturn(order, REFUND_RETURN);
};

/**
 * Refund-processed webhook: acts on a correctly signed `refund.processed` event whose refund is for the payment that
 * paid the order with that Razorpay order id (see the module header). The order's payment then becomes the refunded
 * payment's summary, unless it already holds a later one.
 * @param {{ rawBody: string | Buffer, signature?: string }} event `rawBody` is the signed request body.
 * @returns {Promise<void>} Rejects when giving back the store credit failed.
 */
const recordRefund = async ({ rawBody, signature }) => {
  const event = verifiedEvent(rawBody, signature);
  if (get(event, 'event') !== REFUND_PROCESSED) return;
  const entity = get(event, 'payload.payment.entity', {});
  const refund = get(event, 'payload.refund.entity', {});
  if (!isId(entity.order_id) || !isId(refund.payment_id) || !isId(refund.id)) return;

  const order = await Order.findOne({ razorOrderId: entity.order_id });
  if (!order || refund.payment_id !== order.razorPaymentId) return;
  await applyRefund(order, entity, refund, true);
};

module.exports = { recordRefund };
