const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { isId, paymentSummary, verifiedEvent } = require('./order-payment.service');

// The refund-processed webhook (Razorpay). Like the payment webhook (order-payment.service.js) it acts only on the
// signed raw body and answers `{ status: 'ok' }` (the controller does that).
//
// A refund counts once per refund id (`order.refundIds`). A full one (the payment's `amount_refunded` reaches its
// `amount`) marks the order refunded; a partial one only adds a history entry. One conditional update records it, so
// of concurrent deliveries only one wins. A refund returns only the money paid: store credit applied to the order is
// spent like a coupon and is never given back. Legacy, kept: a full refund applies to an order in any other stage (a
// cancelled one included).

const Order = mongoose.model(models.ORDER);

const { REFUNDED } = enums.ORDER_STAGES;
const REFUND_PROCESSED = 'refund.processed';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';
const PARTIAL_REFUND_TITLE = 'Partial refund';

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
 * @returns {Promise<void>}
 */
const applyRefund = async (order, entity, refund) => {
  const full = Number.isFinite(entity.amount) && Number.isFinite(entity.amount_refunded) && entity.amount_refunded >= entity.amount;
  const rupees = Number.isFinite(refund.amount) ? refund.amount / 100 : 0;
  const history = full
    ? { title: REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() }
    : { title: PARTIAL_REFUND_TITLE, description: `A refund of INR ${rupees} is processed.`, time: new Date().toISOString() };

  // Server-built operators: trusted, so sanitizeFilter (Phase 4 7a) keeps them.
  const recorded = await Order.updateOne(
    {
      _id: order._id,
      razorPaymentId: refund.payment_id,
      orderStatus: mongoose.trusted({ $ne: REFUNDED }),
      refundIds: mongoose.trusted({ $ne: refund.id }),
    },
    { $set: full ? { orderStatus: REFUNDED } : {}, $push: { orderHistory: history, refundIds: refund.id } },
  );
  // Missed: the order is refunded already, or this refund id is recorded already (a redelivery).
  if (recorded.modifiedCount !== 1) return;

  await recordPaymentSummary(order, entity);
};

/**
 * Refund-processed webhook: acts on a correctly signed `refund.processed` event whose refund is for the payment that
 * paid the order with that Razorpay order id (see the module header). The order's payment then becomes the refunded
 * payment's summary, unless it already holds a later one.
 * @param {{ rawBody: string | Buffer, signature?: string }} event `rawBody` is the signed request body.
 * @returns {Promise<void>}
 */
const recordRefund = async ({ rawBody, signature }) => {
  const event = verifiedEvent(rawBody, signature);
  if (get(event, 'event') !== REFUND_PROCESSED) return;
  const entity = get(event, 'payload.payment.entity', {});
  const refund = get(event, 'payload.refund.entity', {});
  if (!isId(entity.order_id) || !isId(refund.payment_id) || !isId(refund.id)) return;

  const order = await Order.findOne({ razorOrderId: entity.order_id });
  if (!order || order.orderStatus === REFUNDED || refund.payment_id !== order.razorPaymentId) return;
  await applyRefund(order, entity, refund);
};

module.exports = { recordRefund };
