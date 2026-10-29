const mongoose = require('mongoose');
const { get } = require('lodash');
const Razorpay = require('razorpay');

const { models, enums } = require('../constants');
const { RAZOR_PAY, RAZOR_PAY_WEBHOOKS } = require('../appConfig');
const { debitStoreCredit, deductInventory, resetCart } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { CART_POPULATE } = require('./order-pricing.service');
const { ORDER_POPULATE } = require('./order-queries.service');

// Razorpay: the payment order created at checkout, and the business side of the two webhooks (payment captured,
// refund processed). The webhooks always answer `{ status: 'ok' }` — the controller does that — so Razorpay never
// retries; these functions just do nothing when the signature is missing or wrong or no order matches.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);

const razorpay = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

const PAID_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date. ';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';

// Razorpay's own check: HMAC-SHA256 of the raw body with the webhook secret.
const isSigned = (rawBody, signature, secret) => Boolean(signature) && Razorpay.validateWebhookSignature(rawBody, signature, secret);

/**
 * Creates the Razorpay order a shopper pays at checkout.
 * @param {string} orderId Public order id (`OD-…`), used for the receipt.
 * @param {number} total Rupees; sent in paise.
 * @returns {Promise<{ id: string }>} Razorpay's order. Rejects when Razorpay fails (→ 500).
 */
const createPaymentOrder = (orderId, total) =>
  razorpay.orders.create({ amount: total * 100, currency: 'INR', receipt: `${orderId}-RCPTID` });

/**
 * Payment-captured webhook: marks the matching `created` order paid, stores the Razorpay payment entity, then takes
 * the stock, empties the buyer's cart, debits applied store credit, and sends the confirmation SMS and e-mail
 * (production only). A replay finds no `created` order and does nothing.
 * @param {{ rawBody: string, signature?: string, payload: object }} event `rawBody` is what was signed.
 * @returns {Promise<void>}
 */
const confirmPayment = async ({ rawBody, signature, payload }) => {
  if (!isSigned(rawBody, signature, RAZOR_PAY_WEBHOOKS.PAYMENT_CAPTURED)) return;

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
  sendConfirmationEmail(user, order);
};

/**
 * Refund-processed webhook: marks the order with that Razorpay order id refunded and replaces its payment with the
 * refunded payment entity. Legacy: the order may be in any stage.
 * @param {{ rawBody: string, signature?: string, payload: object }} event
 * @returns {Promise<void>}
 */
const recordRefund = async ({ rawBody, signature, payload }) => {
  if (!isSigned(rawBody, signature, RAZOR_PAY_WEBHOOKS.PAYMENT_REFUND_COMPLETE)) return;

  const order = await Order.findOne({ razorOrderId: get(payload, 'payment.entity.order_id', '') }).populate(CART_POPULATE);
  if (!order) return;

  order.orderHistory.push({ title: enums.ORDER_STAGES.REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() });
  order.orderStatus = enums.ORDER_STAGES.REFUNDED;
  order.payment = get(payload, 'payment.entity', {});
  await order.save();
};

module.exports = { confirmPayment, createPaymentOrder, recordRefund };
