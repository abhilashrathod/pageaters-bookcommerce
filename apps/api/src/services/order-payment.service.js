const mongoose = require('mongoose');
const { get } = require('lodash');

const payments = require('../adapters/payments');
const { models, enums } = require('../constants');
const { debitStoreCredit, deductInventory, resetCart } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { CART_POPULATE } = require('./order-pricing.service');
const { ORDER_POPULATE } = require('./order-queries.service');

// Payments (the payments adapter: Razorpay or its mock): the payment order created at checkout, and the business
// side of the two webhooks (payment captured, refund processed). The webhooks always answer `{ status: 'ok' }` — the
// controller does that — so Razorpay never retries; these functions just do nothing when the signature is missing
// or wrong or no order matches.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);

const PAID_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date. ';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';

/**
 * Creates the payment order a shopper pays at checkout.
 * @param {string} orderId Public order id (`OD-…`), used for the receipt.
 * @param {number} total Rupees; sent in paise.
 * @returns {Promise<{ id: string }>} The payment order. Rejects when the adapter fails (the caller answers 500
 *   and leaves the order `attempted`).
 */
const createPaymentOrder = (orderId, total) => payments.createOrder({ amount: total * 100, currency: 'INR', receipt: `${orderId}-RCPTID` });

/**
 * Payment-captured webhook: marks the matching `created` order paid, stores the Razorpay payment entity, then takes
 * the stock, empties the buyer's cart, debits applied store credit, and sends the confirmation SMS and e-mail
 * (production only). A replay finds no `created` order and does nothing.
 * @param {{ rawBody: string, signature?: string, payload: object }} event `rawBody` is what was signed.
 * @returns {Promise<void>}
 */
const confirmPayment = async ({ rawBody, signature, payload }) => {
  if (!payments.verifyWebhookSignature(rawBody, signature)) return;

  const order = await Order.findOne({
    orderStatus: enums.ORDER_STAGES.CREATED,
    razorOrderId: get(payload, 'payment.entity.order_id', ''),
  }).populate(ORDER_POPULATE);
  if (!order) return;

  order.orderHistory.push({ title: enums.ORDER_STAGES.PAID, description: PAID_DESCRIPTION, time: new Date().toISOString() });
  order.orderStatus = enums.ORDER_STAGES.PAID;
  order.payment = get(payload, 'payment.entity', {});
  order.razorPaymentId = get(payload, 'payment.entity.id', '');
  await order.save();

  const user = await User.findOne({ _id: order.userId });
  await deductInventory(order);
  await resetCart(order.userId);

  if (order.storeCredit > 0) {
    order.storeCreditTransaction = await debitStoreCredit(order._id, order.userId, order.storeCredit);
    await order.save();
  }

  await sendConfirmationSms(user, order.orderId);
  await sendConfirmationEmail(user, order);
};

/**
 * Refund-processed webhook: marks the order with that Razorpay order id refunded and replaces its payment with the
 * refunded payment entity. Legacy: the order may be in any stage.
 * @param {{ rawBody: string, signature?: string, payload: object }} event
 * @returns {Promise<void>}
 */
const recordRefund = async ({ rawBody, signature, payload }) => {
  if (!payments.verifyWebhookSignature(rawBody, signature)) return;

  const order = await Order.findOne({ razorOrderId: get(payload, 'payment.entity.order_id', '') }).populate(CART_POPULATE);
  if (!order) return;

  order.orderHistory.push({ title: enums.ORDER_STAGES.REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() });
  order.orderStatus = enums.ORDER_STAGES.REFUNDED;
  order.payment = get(payload, 'payment.entity', {});
  await order.save();
};

module.exports = { confirmPayment, createPaymentOrder, recordRefund };
