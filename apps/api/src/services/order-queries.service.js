const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');

// Order reads: the shopper's own orders, and the admin list, lookup and search. Orders still in checkout
// (`attempted`, `created`) are hidden from the lists.

const Order = mongoose.model(models.ORDER);

const NOT_PLACED = [enums.ORDER_STAGES.ATTEMPTED, enums.ORDER_STAGES.CREATED];

/**
 * The buyer-facing summary of a stored Razorpay payment: card name/last4/network, bank, UPI id, wallet, EMI
 * (legacy: issuer/rate/duration under the card field names) or just the method for COD.
 * Legacy: an unknown method gives `undefined`; a `null` payment throws a TypeError (→ 500 in `getUserOrder`).
 * @param {object} payment The order's `payment` (Razorpay payment entity).
 * @returns {object|undefined}
 */
const orderPaymentInfo = (payment) => {
  let payload;

  switch (payment.method) {
    case enums.PAYMENT_METHODS.CARD:
      payload = {
        method: enums.PAYMENT_METHODS.CARD,
        name: get(payment, 'card.name', ''),
        last4: get(payment, 'card.last4', ''),
        network: get(payment, 'card.network', ''),
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
        upi_id: get(payment, 'vpa', ''),
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
        name: get(payment, 'emi.issuer', ''),
        last4: get(payment, 'emi.rate', ''),
        network: get(payment, 'emi.duration', ''),
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
 * Razorpay entity. Returned as a plain object, so without the `id` virtual.
 * Legacy (PLAN.md legacy-bugs step): an order without a payment makes `orderPaymentInfo(null)` throw (→ 500).
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
  data.payment = orderPaymentInfo(data.payment);
  return data;
};

/**
 * The user's placed orders, newest first.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
const listUserOrders = (userId) =>
  Order.find({ userId, orderStatus: { $nin: NOT_PLACED } })
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
  const query = { $and: [{ orderStatus: { $nin: NOT_PLACED } }] };
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
 * Admin: any order by `_id`, every field.
 * Legacy (PLAN.md security step): `payment` is the raw Razorpay payment entity, payer contact and card/bank/VPA
 * included. A malformed id rejects with a CastError (→ 500).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} ORDER_NOT_EXIST
 */
const getOrderById = async (id) => {
  const order = await Order.findOne({ _id: id }).populate([
    ...ORDER_POPULATE.slice(0, 4),
    { path: 'boxes.box', select: 'boxId title images currentDiscount price weight' },
  ]);
  if (!order) throw new AppError('ORDER_NOT_EXIST');
  return order;
};

/**
 * Admin: orders in any stage whose public id matches `q`, case-insensitively.
 * Legacy (PLAN.md security step): `q` goes into `$regex` raw — an invalid pattern rejects (→ 500).
 * @param {string} q
 * @returns {Promise<object[]>}
 */
const searchOrders = (q) =>
  Order.find({ orderId: { $regex: q, $options: 'i' } }).populate([{ path: 'deliveryAddress' }, BUYER, ...ADMIN_LIST_ITEMS, ADMIN_BOXES]);

module.exports = { ORDER_POPULATE, getOrderById, getUserOrder, listOrders, listUserOrders, searchOrders };
