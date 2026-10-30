const mongoose = require('mongoose');
const { get, pick } = require('lodash');

const payments = require('../adapters/payments');
const { models, enums } = require('../constants');
const { debitStoreCredit, deductInventory, resetCart, undoStoreCreditDebit } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { CART_POPULATE } = require('./order-pricing.service');
const { ORDER_POPULATE } = require('./order-queries.service');

// Payments (the payments adapter: Razorpay or its mock): the payment order created at checkout, and the business
// side of the two webhooks (payment captured, refund processed). The webhooks answer `{ status: 'ok' }` — the
// controller does that — so Razorpay doesn't retry; these functions just do nothing when the signature is missing
// or wrong, the event isn't the expected one, or no order matches. Everything is read from the signed raw body,
// never from the parsed request, so nothing outside the signature can change what is acted on. A failed write after
// the store credit was debited puts the credit back and rejects (→ 500), so Razorpay redelivers the event.
//
// Logged for an admin (ids and amounts only, never payer details): a captured payment that confirms nothing — no
// order awaits it (e.g. the shopper restarted checkout), its amount or currency is wrong, another delivery claimed it,
// or the applied store credit is no longer covered. The money is captured, so it needs a manual refund or follow-up.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);

const PAID_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date. ';
const REFUNDED_DESCRIPTION = 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.';
const PARTIAL_REFUND_TITLE = 'Partial refund';

const PAYMENT_CAPTURED = 'payment.captured';
const REFUND_PROCESSED = 'refund.processed';

// What an order keeps of a Razorpay payment entity: the identifiers, amounts and status, and the method details the
// payment summary shows (order-queries orderPaymentInfo reads card last4/network, bank, vpa, wallet, emi). The UPI id
// is stored masked (paymentSummary). Not stored: the payer's e-mail, phone and card holder name, card ids/issuer/type,
// acquirer data, notes, fees and error details.
const PAYMENT_SUMMARY_FIELDS = [
  'id',
  'order_id',
  'method',
  'amount',
  'amount_refunded',
  'currency',
  'status',
  'captured',
  'created_at',
  'card.last4',
  'card.network',
  'bank',
  'vpa',
  'wallet',
  'emi.issuer',
  'emi.rate',
  'emi.duration',
];

/**
 * Rupees to paise, as Razorpay counts amounts (rounded: totals can carry two decimals of store credit).
 * @param {number} rupees
 * @returns {number}
 */
const toPaise = (rupees) => Math.round(rupees * 100);

/**
 * Filter value for an order no payment has been claimed for: `razorPaymentId` empty or missing. A fresh object per
 * query, trusted so sanitizeFilter (Phase 4 7a) keeps the server-built operator.
 * @returns {object}
 */
const unclaimedPayment = () => mongoose.trusted({ $in: ['', null] });

// A UPI id with only its first two characters and its handle: `ab***@upi`.
const maskVpa = (vpa) => {
  const at = vpa.lastIndexOf('@');
  return at < 0 ? '***' : `${vpa.slice(0, Math.min(2, at))}***${vpa.slice(at)}`;
};

/**
 * The part of a Razorpay payment entity an order stores (PAYMENT_SUMMARY_FIELDS), the UPI id masked.
 * @param {object} entity
 * @returns {object}
 */
const paymentSummary = (entity) => {
  const summary = pick(entity, PAYMENT_SUMMARY_FIELDS);
  if (typeof summary.vpa === 'string') summary.vpa = maskVpa(summary.vpa);
  else delete summary.vpa;
  return summary;
};

// The signed event, or undefined when the signature doesn't verify or the body isn't JSON.
const verifiedEvent = (rawBody, signature) => {
  if (!payments.verifyWebhookSignature(rawBody, signature)) return undefined;
  try {
    return JSON.parse(String(rawBody));
  } catch {
    return undefined;
  }
};

const isId = (value) => typeof value === 'string' && value !== '';

/**
 * Creates the payment order a shopper pays at checkout.
 * @param {string} orderId Public order id (`OD-…`), used for the receipt.
 * @param {number} total Rupees; sent in paise.
 * @returns {Promise<{ id: string }>} The payment order. Rejects when the adapter fails (the caller answers 500
 *   and leaves the order `attempted`).
 */
const createPaymentOrder = (orderId, total) => payments.createOrder({ amount: toPaise(total), currency: 'INR', receipt: `${orderId}-RCPTID` });

/**
 * Payment-captured webhook. Acts only on a correctly signed `payment.captured` event whose payment is `captured`, in
 * INR, for exactly the matching `created` order's total in paise. Then it claims the order (sets `razorPaymentId`
 * while none is set, so a concurrent delivery, re-attempt or COD place can't also win), debits the store credit
 * applied to the order, marks the order paid with a payment summary (PAYMENT_SUMMARY_FIELDS, not the raw entity),
 * takes the stock, empties the buyer's cart and sends the confirmation SMS and e-mail (production only). A replay
 * finds no `created` order and does nothing. Refusals are logged (see the file comment); credit the balance no longer
 * covers releases the claim, so a redelivery after the balance is topped up confirms the order.
 * @param {{ rawBody: string | Buffer, signature?: string }} event `rawBody` is the signed request body; anything
 *   else the caller passes (the parsed payload) is ignored.
 * @returns {Promise<void>} Rejects when marking the order paid fails (the debit is undone first).
 */
const confirmPayment = async ({ rawBody, signature }) => {
  const event = verifiedEvent(rawBody, signature);
  if (get(event, 'event') !== PAYMENT_CAPTURED) return;
  const entity = get(event, 'payload.payment.entity', {});
  if (entity.status !== 'captured' || !isId(entity.order_id) || !isId(entity.id)) return;
  const ids = `payment ${entity.id} (Razorpay order ${entity.order_id})`;

  const order = await Order.findOne({ orderStatus: enums.ORDER_STAGES.CREATED, razorOrderId: entity.order_id }).populate(ORDER_POPULATE);
  if (!order) {
    console.error(`Captured ${ids} matches no order awaiting payment`);
    return;
  }

  if (entity.currency !== 'INR' || entity.amount !== toPaise(order.total)) {
    console.error(`Payment refused: ${ids} is ${entity.amount} ${entity.currency}, order ${order.orderId} total is ${toPaise(order.total)} INR (paise)`);
    return;
  }

  const claimed = await Order.updateOne(
    { _id: order._id, orderStatus: enums.ORDER_STAGES.CREATED, razorOrderId: entity.order_id, razorPaymentId: unclaimedPayment() },
    { $set: { razorPaymentId: entity.id } },
  );
  if (claimed.modifiedCount !== 1) {
    console.error(`Captured ${ids} lost the claim on order ${order.orderId}`);
    return;
  }
  const release = () => Order.updateOne({ _id: order._id, razorPaymentId: entity.id, orderStatus: enums.ORDER_STAGES.CREATED }, { $set: { razorPaymentId: '' } });

  let transaction = null;
  if (order.storeCredit > 0) {
    transaction = await debitStoreCredit(order._id, order.userId, order.storeCredit).catch(async (e) => {
      await release();
      throw e;
    });
    if (!transaction) {
      await release();
      console.error(`Payment refused: ${ids}: store credit applied to order ${order.orderId} exceeds the balance`);
      return;
    }
  }

  const history = { title: enums.ORDER_STAGES.PAID, description: PAID_DESCRIPTION, time: new Date().toISOString() };
  const payment = paymentSummary(entity);
  try {
    const paid = await Order.updateOne(
      { _id: order._id, orderStatus: enums.ORDER_STAGES.CREATED, razorPaymentId: entity.id },
      { $set: { orderStatus: enums.ORDER_STAGES.PAID, payment, storeCreditTransaction: transaction }, $push: { orderHistory: history } },
    );
    if (paid.matchedCount !== 1) throw new Error(`Order ${order.orderId} changed while its payment was confirmed`);
  } catch (e) {
    if (transaction) await undoStoreCreditDebit(transaction, order.userId, order.storeCredit);
    await release();
    throw e;
  }

  order.orderHistory.push(history);
  order.orderStatus = enums.ORDER_STAGES.PAID;
  order.payment = payment;
  order.razorPaymentId = entity.id;
  order.storeCreditTransaction = transaction;

  const user = await User.findOne({ _id: order.userId });
  await deductInventory(order);
  await resetCart(order.userId);

  await sendConfirmationSms(user, order.orderId);
  await sendConfirmationEmail(user, order);
};

/**
 * Refund-processed webhook: acts on a correctly signed `refund.processed` event whose refund (`payload.refund.entity`)
 * is for the payment that paid the order with that Razorpay order id, unless the order is already refunded. A full
 * refund (the payment's `amount_refunded` reaches its `amount`) marks the order refunded; a partial one only adds a
 * history entry. Either way the order's payment becomes the refunded payment's summary (PAYMENT_SUMMARY_FIELDS).
 * Legacy, kept: a full refund applies to an order in any other stage.
 * @param {{ rawBody: string | Buffer, signature?: string }} event `rawBody` is the signed request body.
 * @returns {Promise<void>}
 */
const recordRefund = async ({ rawBody, signature }) => {
  const event = verifiedEvent(rawBody, signature);
  if (get(event, 'event') !== REFUND_PROCESSED) return;
  const entity = get(event, 'payload.payment.entity', {});
  const refund = get(event, 'payload.refund.entity', {});
  if (!isId(entity.order_id) || !isId(refund.payment_id)) return;

  const order = await Order.findOne({ razorOrderId: entity.order_id }).populate(CART_POPULATE);
  if (!order || order.orderStatus === enums.ORDER_STAGES.REFUNDED || refund.payment_id !== order.razorPaymentId) return;

  const full = Number.isFinite(entity.amount) && Number.isFinite(entity.amount_refunded) && entity.amount_refunded >= entity.amount;
  if (full) {
    order.orderHistory.push({ title: enums.ORDER_STAGES.REFUNDED, description: REFUNDED_DESCRIPTION, time: new Date().toISOString() });
    order.orderStatus = enums.ORDER_STAGES.REFUNDED;
  } else {
    const rupees = Number.isFinite(refund.amount) ? refund.amount / 100 : 0;
    order.orderHistory.push({ title: PARTIAL_REFUND_TITLE, description: `A refund of INR ${rupees} is processed.`, time: new Date().toISOString() });
  }
  order.payment = paymentSummary(entity);
  await order.save();
};

module.exports = { PAYMENT_SUMMARY_FIELDS, confirmPayment, createPaymentOrder, paymentSummary, recordRefund, unclaimedPayment };
