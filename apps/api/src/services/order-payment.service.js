const mongoose = require('mongoose');
const { get, pick } = require('lodash');

const payments = require('../adapters/payments');
const { models, enums } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { debitStoreCredit, deductInventory, resetCart, undoStoreCreditDebit } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { ORDER_POPULATE } = require('./order-queries.service');

// Payments (the payments adapter: Razorpay or its mock): the payment order created at checkout, and the business
// side of the payment-captured webhook (the refund webhook is order-refunds.service.js, on the helpers exported here).
// The webhooks answer `{ status: 'ok' }` — the controller does that — so Razorpay doesn't retry; these functions just
// do nothing when the signature is missing or wrong, the event isn't the expected one, or no order matches. Everything
// is read from the signed raw body, never from the parsed request, so nothing outside the signature can change what is
// acted on. A failed write after the store credit was debited is checked against a fresh read of the order (a lost
// acknowledgement can hide a write that landed); only when it didn't land is the credit put back, and the webhook
// rejects (→ 500), so Razorpay redelivers the event.
//
// Logged for an admin (ids and amounts only, never payer details): a captured payment that confirms nothing — no
// order awaits it (e.g. the shopper restarted checkout), its amount or currency is wrong, another delivery claimed it,
// or the applied store credit is no longer covered. The money is captured, so it needs a manual refund or follow-up.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);

const PAID_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date. ';

const PAYMENT_CAPTURED = 'payment.captured';

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

/**
 * The signed event, or undefined when the signature doesn't verify or the body isn't JSON.
 * @param {string | Buffer} rawBody
 * @param {string | undefined} signature
 * @returns {object | undefined}
 */
const verifiedEvent = (rawBody, signature) => {
  if (!payments.verifyWebhookSignature(rawBody, signature)) return undefined;
  try {
    return JSON.parse(String(rawBody));
  } catch {
    return undefined;
  }
};

/**
 * A non-empty string (a Razorpay id read from an event).
 * @param {unknown} value
 * @returns {boolean}
 */
const isId = (value) => typeof value === 'string' && value !== '';

/**
 * Creates the payment order a shopper pays at checkout.
 * @param {string} orderId Public order id (`OD-…`), used for the receipt.
 * @param {number} total Rupees; sent in paise.
 * @returns {Promise<{ id: string }>} The payment order. Rejects when the adapter fails (the caller answers 500
 *   and leaves the order `attempted`).
 */
// The public key id the storefront opens Razorpay Checkout with.
const paymentKeyId = () => payments.keyId;

const createPaymentOrder = (orderId, total) => payments.createOrder({ amount: toPaise(total), currency: 'INR', receipt: `${orderId}-RCPTID` });

/**
 * After the write that marks an order paid failed: decides from fresh reads, since a lost write acknowledgement can
 * hide a write that landed, or that lands later. Only that write moves an order holding this payment's claim out of
 * `created`, so an order still claimed by `paymentId` and `paid` landed: nothing is undone (returns, and
 * the payment completes). Otherwise the claim is released first; a released claim makes the paid write's filter
 * unmatchable, so only then is the store credit given back, and it rejects with `error` so Razorpay redelivers. A
 * release that matches nothing means the paid write landed meanwhile (read again: then it returns as paid). A read
 * failing, or an order in neither state → nothing is undone (the order may be paid), logged for a follow-up; rejects.
 * A failed credit return is logged (order-fulfilment undoStoreCreditDebit).
 * @param {object} order The order as read.
 * @param {string} paymentId
 * @param {import('mongoose').Types.ObjectId | null} transaction The DEBIT, if credit was debited.
 * @param {() => Promise<{ matchedCount: number }>} release
 * @param {unknown} error The failed write's error.
 * @returns {Promise<void>}
 */
const settleFailedPaidWrite = async (order, paymentId, transaction, release, error) => {
  const readPaid = async () => {
    const current = await Order.findById(order._id).select('orderStatus razorPaymentId');
    return current.razorPaymentId === paymentId && current.orderStatus === enums.ORDER_STAGES.PAID;
  };
  const unresolved = (cause) => {
    logger.error(
      { err: cause },
      `Payment ${paymentId}: order ${order.orderId} could not be settled after marking it paid failed; check the order and the balance`,
    );
    return error;
  };

  let paid;
  try {
    paid = await readPaid();
  } catch (e) {
    throw unresolved(e);
  }
  if (paid) return;

  let released;
  try {
    released = await release();
  } catch (e) {
    released = { matchedCount: 0, error: e };
  }
  if (released.matchedCount === 1) {
    if (transaction) await undoStoreCreditDebit(order, transaction, order.storeCredit);
    throw error;
  }
  if (await readPaid().catch(() => false)) return;
  throw unresolved(released.error ?? error);
};

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
    logger.error(`Captured ${ids} matches no order awaiting payment`);
    return;
  }

  if (entity.currency !== 'INR' || entity.amount !== toPaise(order.total)) {
    logger.error(`Payment refused: ${ids} is ${entity.amount} ${entity.currency}, order ${order.orderId} total is ${toPaise(order.total)} INR (paise)`);
    return;
  }

  const claimed = await Order.updateOne(
    { _id: order._id, orderStatus: enums.ORDER_STAGES.CREATED, razorOrderId: entity.order_id, razorPaymentId: unclaimedPayment() },
    { $set: { razorPaymentId: entity.id } },
  );
  if (claimed.modifiedCount !== 1) {
    logger.error(`Captured ${ids} lost the claim on order ${order.orderId}`);
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
      logger.error(`Payment refused: ${ids}: store credit applied to order ${order.orderId} exceeds the balance`);
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
    await settleFailedPaidWrite(order, entity.id, transaction, release, e);
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

module.exports = { PAYMENT_SUMMARY_FIELDS, confirmPayment, createPaymentOrder, isId, paymentKeyId, paymentSummary, unclaimedPayment, verifiedEvent };
