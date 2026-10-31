const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { literalPattern } = require('../helpers/search-pattern.helper');

// Order reads: the shopper's own orders, and the admin list, lookup and search. Orders still in checkout
// (`attempted`, `created`) are hidden from the lists.

const Order = mongoose.model(models.ORDER);

const NOT_PLACED = [enums.ORDER_STAGES.ATTEMPTED, enums.ORDER_STAGES.CREATED];

/**
 * The buyer-facing summary of a stored payment: card name/last4/network, bank, UPI id, wallet, EMI
 * (legacy: issuer/rate/duration under the card field names) or just the method for COD.
 * Accepts both shapes an order may hold: a full Razorpay payment entity (orders stored before the security step)
 * or an already-built summary (`name`, `last4`, `network`, `upi_id`…), which it returns unchanged — so mapping is
 * idempotent and nothing else (payer email/phone, card id/type, bank reference…) ever passes through.
 * Legacy: an unknown method gives `undefined`. Callers map only a stored payment (an order without one keeps
 * `payment: null`).
 * @param {object} payment The order's `payment` (Razorpay payment entity or summary).
 * @returns {object|undefined}
 */
const orderPaymentInfo = (payment) => {
  let payload;
  // Entity path first, then the summary's own key.
  const read = (entityPath, summaryKey) => get(payment, entityPath, get(payment, summaryKey, ''));

  switch (payment.method) {
    case enums.PAYMENT_METHODS.CARD:
      payload = {
        method: enums.PAYMENT_METHODS.CARD,
        name: read('card.name', 'name'),
        last4: read('card.last4', 'last4'),
        network: read('card.network', 'network'),
      };
      return payload;

    case enums.PAYMENT_METHODS.NET_BAKING:
      payload = {
        method: enums.PAYMENT_METHODS.NET_BAKING,
        bank: get(payment, 'bank', ''),
      };
      return payload;


    case enums.PAYMENT_METHODS.UPI:
      payload = {
        method: enums.PAYMENT_METHODS.UPI,
        upi_id: read('vpa', 'upi_id'),
      };
      return payload;

    case enums.PAYMENT_METHODS.WALLET:
      payload = {
        method: enums.PAYMENT_METHODS.WALLET,
        wallet: get(payment, 'wallet', ''),
      };
      return payload;

    case enums.PAYMENT_METHODS.EMI:
      payload = {
        method: enums.PAYMENT_METHODS.EMI,
        name: read('emi.issuer', 'name'),
        last4: read('emi.rate', 'last4'),
        network: read('emi.duration', 'network'),
      };
      return payload;

    case enums.PAYMENT_METHODS.COD:
      payload = {
        method: enums.PAYMENT_METHODS.COD
      };
      return payload;
    default:
      return payload;
  }
};

/**
 * An order document as the admin reads send it: its JSON (virtuals included) with `payment` mapped through
 * `orderPaymentInfo`. An order without a payment keeps `payment: null`; an unknown method drops the key.
 * @param {object} order Order document.
 * @returns {object}
 */
const adminOrderView = (order) => {
  const data = order.toJSON();
  data.payment = data.payment ? orderPaymentInfo(data.payment) : null;
  return data;
};

/** Populate options for an order shown to its buyer (address and items with display fields). */
const ORDER_POPULATE = [
  { path: 'deliveryAddress' },
  {
    path: 'products.product',
    select: 'bookId title poster author currentDiscount price',
    populate: { path: 'author', select: 'name avatar' },
  },
  { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
  { path: 'addOns.addOn', select: 'name poster currentDiscount price' },
  { path: 'boxes.box', select: 'boxId title images currentDiscount price' },
];

// Admin lists: the buyer's contact and items without images.
const BUYER = { path: 'userId', select: 'fullName email contactNo' };
const ADMIN_LIST_ITEMS = [
  { path: 'products.product', select: 'bookId title currentDiscount price' },
  { path: 'bundles.bundle', select: 'bundleId title bundledBooks currentDiscount price' },
];
const ADMIN_ADD_ONS = { path: 'addOns.addOn', select: 'name poster currentDiscount price' };
const ADMIN_BOXES = { path: 'boxes.box', select: 'boxId title images currentDiscount price' };

/**
 * One of the user's orders by its public id, with a payment summary (card/bank/UPI/wallet/EMI/COD) instead of the
 * Razorpay entity, or `payment: null` for an order without one (an unpaid or legacy order; legacy answered 500).
 * Returned as a plain object, so without the `id` virtual.
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @returns {Promise<object>}
 * @throws {AppError} ORDER_NOT_EXIST when the user has no such order.
 */
const getUserOrder = async (userId, uniqueId) => {
  const order = await Order.findOne({ orderId: uniqueId, userId })
    .select(
      'orderId orderDate giftOptions deliveryAddress storeCredit shipmentTrackingId orderHistory payment orderStatus subTotal products addOns boxes bundles shipping total',
    )
    .populate(ORDER_POPULATE);
  if (!order) throw new AppError('ORDER_NOT_EXIST');

  const data = order.toObject();
  data.payment = data.payment ? orderPaymentInfo(data.payment) : null;
  return data;
};

/**
 * The user's placed orders, newest first.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
const listUserOrders = (userId) =>
  Order.find({ userId, orderStatus: mongoose.trusted({ $nin: NOT_PLACED }) })
    .select('orderId orderDate deliveryAddress orderStatus shipmentTrackingId products boxes bundles total')
    .sort({ createdAt: -1 })
    .populate(ORDER_POPULATE);

/**
 * Admin: one page of placed orders, most recently updated first, optionally of one status.
 * Legacy: without `limit` the page has no documents (see helpers/mongooseCompat.helper.js).
 * @param {{ page?: string, limit?: string, status?: string }} query
 * @returns {Promise<object>} mongoose-paginate-v2 result.
 */
const listOrders = ({ page, limit, status }) => {
  const query = { $and: [{ orderStatus: mongoose.trusted({ $nin: NOT_PLACED }) }] };
  if (status) query.$and.push({ orderStatus: status });

  return Order.paginate(query, {
    page,
    limit,
    select: 'orderId orderDate userId deliveryAddress orderStatus products addOns boxes bundles total',
    sort: { updatedAt: 'desc' },
    populate: [{ path: 'deliveryAddress' }, BUYER, ...ADMIN_LIST_ITEMS, ADMIN_ADD_ONS, ADMIN_BOXES],
  });
};

/**
 * Admin: any order by `_id`, every field, with `payment` as the summary (`adminOrderView`): the stored Razorpay
 * entity (payer email/phone, card/bank/VPA details) never leaves. A malformed id rejects with a CastError (→ 400 INVALID_ID).
 * @param {string} id
 * @returns {Promise<object>} The order as JSON (virtuals included, as the document serialised before).
 * @throws {AppError} ORDER_NOT_EXIST
 */
const getOrderById = async (id) => {
  const order = await Order.findOne({ _id: id }).populate([
    ...ORDER_POPULATE.slice(0, 4),
    { path: 'boxes.box', select: 'boxId title images currentDiscount price weight' },
  ]);
  if (!order) throw new AppError('ORDER_NOT_EXIST');
  return adminOrderView(order);
};

/**
 * Admin: orders in any stage whose public id contains `q` as literal text (helpers/search-pattern.helper.js:
 * escaped, at most 100 characters), case-insensitively, each with `payment` as the summary.
 * @param {unknown} q
 * @returns {Promise<object[]>} [] for an empty or non-string `q`.
 */
const searchOrders = async (q) => {
  const pattern = literalPattern(q);
  if (!pattern) return [];
  const orders = await Order.find({ orderId: mongoose.trusted({ $regex: pattern, $options: 'i' }) }).populate([
    { path: 'deliveryAddress' },
    BUYER,
    ...ADMIN_LIST_ITEMS,
    ADMIN_BOXES,
  ]);
  return orders.map(adminOrderView);
};

module.exports = { ORDER_POPULATE, adminOrderView, getOrderById, getUserOrder, listOrders, listUserOrders, orderPaymentInfo, searchOrders };
