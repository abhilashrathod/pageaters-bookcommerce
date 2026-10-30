const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { debitStoreCredit, deductInventory, resetCart, undoStoreCreditDebit } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { createPaymentOrder, unclaimedPayment } = require('./order-payment.service');
const {
  CART_POPULATE,
  buildOrderLines,
  cartSubTotal,
  cartWeight,
  giftChargesOf,
  orderTotalOf,
  shippingFor,
} = require('./order-pricing.service');
const { ORDER_POPULATE } = require('./order-queries.service');

// Checkout: attempt (choose the address) → place (COD confirms at once; online creates a Razorpay order and waits
// for the payment webhook, order-payment.service.js). A user has one pending order (`attempted` or `created`):
// attempting again takes it over, so the checkout read, the store credit and placing always act on that one order.
// Every status change is a conditional update on the status it was read in and on no payment being claimed for it
// (`razorPaymentId` empty), so a concurrent place, re-attempt or payment webhook can't both win.

const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);

const PENDING = [{ orderStatus: enums.ORDER_STAGES.ATTEMPTED }, { orderStatus: enums.ORDER_STAGES.CREATED }];
const CONFIRMED_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date.';
const PENDING_FIELDS =
  'orderId userId subTotal orderDate storeCredit total shipping giftOptions deliveryInstructions orderHistory deliveryAddress boxed bundles products total';

/** Razorpay's smallest payment is ₹1 (100 paise): a smaller total can't be paid online. */
const MIN_ONLINE_TOTAL = 1;

/**
 * Starts (or restarts) checkout: prices the user's own cart and stores the user's pending order with the chosen
 * address as `attempted`. A restart takes over the existing pending order, `created` included: it gets a new order
 * id, loses its payment order (`razorOrderId`; a payment for that Razorpay order no longer confirms anything) and its
 * store credit (re-apply it with PATCH /orders/credit). Legacy: a missing `address` finds no address.
 * @param {string} userId
 * @param {string | undefined} cartId From the cart cookie.
 * @param {string | undefined} address Address id.
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no cart cookie, or the pending order's payment is being confirmed or
 *   it changed meanwhile), CART_NOT_EXIST (no such cart for this user), ORDER_ADDRESS_ATTEMPT_FAILED (not the
 *   user's live address). A malformed cart id rejects with a CastError (→ 500).
 */
const attemptOrder = async (userId, cartId, address) => {
  const orderId = `OD-${generateRandomNumber(10)}`;
  if (!cartId || !userId) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const cart = await Cart.findOne({ _id: cartId, user: userId }).populate(CART_POPULATE);
  if (!cart) throw new AppError('CART_NOT_EXIST');

  const subTotal = await cartSubTotal(cart);

  const deliveryAddress = await Address.findOne({ _id: address, userId, isDeleted: false });
  if (!deliveryAddress) throw new AppError('ORDER_ADDRESS_ATTEMPT_FAILED');

  const shipping = await shippingFor(subTotal, cart.mysteryBoxes.length > 0);
  const payload = {
    userId,
    orderId,
    deliveryAddress: address,
    orderStatus: enums.ORDER_STAGES.ATTEMPTED,
    subTotal,
    total: subTotal + shipping,
    shipping,
    razorOrderId: '',
    storeCredit: 0,
  };

  const pending = await Order.findOne({ userId, $or: PENDING });
  if (!pending) {
    await Order.create(payload);
    return;
  }
  const taken = await Order.updateOne(
    { _id: pending._id, orderStatus: pending.orderStatus, razorPaymentId: unclaimedPayment() },
    { $set: payload },
  );
  if (taken.matchedCount !== 1) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');
};

/**
 * Places the user's pending order from their cart at today's prices.
 * - `online`: creates a Razorpay order for the total; the order becomes `created` and nothing else happens until
 *   the payment webhook. A total under ₹1 can't be paid online.
 * - `cod`: the order becomes `confirmed`; then applied store credit is debited (when the balance no longer covers
 *   it, the order goes back to how it was and the request is refused), stock is taken, the cart emptied, the SMS and
 *   the confirmation e-mail sent (production). A total of 0 (all store credit) is placed this way.
 * Total = subtotal + shipping + gift charges − store credit applied to the order. Gift charges come from the server's
 * package prices (order-pricing giftChargesOf); the cost a request sends is ignored.
 * @param {string} userId
 * @param {string | undefined} cartId From the cart cookie; must be the user's cart.
 * @param {{ method: 'cod' | 'online', instructions?: string, giftOptions: object }} checkout
 * @returns {Promise<{ razorOrderId: string, total: number, orderId: string } | { total: number, orderId: string }>}
 *   The response data: with `razorOrderId` for online payment.
 * @throws {AppError} INVALID_REQUEST (a gift without a known package), ORDER_INFO_ATTEMPT_FAILED (no cart cookie, no
 *   pending order, its payment is being confirmed, or another request placed it meanwhile), CART_NOT_EXIST,
 *   STORE_CREDIT_SURPLUS (the applied credit is more than the order now costs), STORE_CREDIT_UNAVAILABLE (more than
 *   the balance), INVALID_PAYMENT_METHOD (online for a total under ₹1). Nothing changes on a refusal. Legacy: a
 *   missing `giftOptions`, or a cart item soft-deleted since, throws a TypeError (→ 500); a Razorpay failure rejects
 *   (→ 500) and leaves the order as it was.
 */
const placeOrder = async (userId, cartId, { method, instructions, giftOptions: requested }) => {
  const { giftCharges, giftOptions } = giftChargesOf(requested);
  if (!cartId || !userId) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const order = await Order.findOne({ $or: PENDING, userId }).populate({ path: 'deliveryAddress' });
  if (!order || order.razorPaymentId) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const cart = await Cart.findOne({ _id: cartId, user: userId }).populate(CART_POPULATE);
  if (!cart) throw new AppError('CART_NOT_EXIST');

  const lines = await buildOrderLines(cart);
  const subTotal = await cartSubTotal(cart);
  const weight = await cartWeight(cart);
  const shipping = await shippingFor(subTotal, lines.boxes.length > 0);
  const storeCredit = order.storeCredit || 0;
  if (storeCredit > subTotal + shipping + giftCharges) throw new AppError('STORE_CREDIT_SURPLUS');
  const total = orderTotalOf({ subTotal, shipping, giftCharges, storeCredit });

  const user = await User.findOne({ _id: userId });
  if (storeCredit > 0 && !(user && user.storeCredit >= storeCredit)) throw new AppError('STORE_CREDIT_UNAVAILABLE');

  const online = method === 'online';
  if (online && total < MIN_ONLINE_TOTAL) throw new AppError('INVALID_PAYMENT_METHOD');
  const paymentOrder = online ? await createPaymentOrder(order.orderId, total) : undefined;

  const placed = {
    razorOrderId: online ? paymentOrder.id : '',
    orderStatus: online ? enums.ORDER_STAGES.CREATED : enums.ORDER_STAGES.CONFIRMED,
    products: lines.products,
    bundles: lines.bundles,
    boxes: lines.boxes,
    addOns: lines.addOns,
    weight,
    giftOptions,
    deliveryInstructions: instructions,
    subTotal,
    shipping,
    total,
    storeCredit,
    orderDate: new Date().toISOString(),
    giftCard: null,
    discount: null,
  };
  const history = online
    ? undefined
    : { _id: new mongoose.Types.ObjectId(), title: enums.ORDER_STAGES.CONFIRMED, description: CONFIRMED_DESCRIPTION, time: new Date().toISOString() };
  if (!online) placed.payment = { method: 'cod' };

  const before = { orderStatus: order.orderStatus, razorOrderId: order.razorOrderId, payment: order.payment };
  const claimed = await Order.updateOne(
    { _id: order._id, userId, orderStatus: order.orderStatus, razorPaymentId: unclaimedPayment() },
    history ? { $set: placed, $push: { orderHistory: history } } : { $set: placed },
  );
  if (claimed.matchedCount !== 1) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  if (online) return { razorOrderId: paymentOrder.id, total, orderId: order.orderId };

  // Puts the order back as it was read (compensation; there are no transactions).
  const revert = () =>
    Order.updateOne(
      { _id: order._id, orderStatus: enums.ORDER_STAGES.CONFIRMED },
      { $set: before, $pull: { orderHistory: { _id: history._id } } },
    );

  if (storeCredit > 0) {
    const transaction = await debitStoreCredit(order._id, order.userId, storeCredit).catch(async (e) => {
      await revert();
      throw e;
    });
    if (!transaction) {
      await revert();
      throw new AppError('STORE_CREDIT_UNAVAILABLE');
    }
    try {
      await Order.updateOne({ _id: order._id }, { $set: { storeCreditTransaction: transaction } });
    } catch (e) {
      await undoStoreCreditDebit(transaction, order.userId, storeCredit);
      await revert();
      throw e;
    }
    order.storeCreditTransaction = transaction;
  }

  Object.assign(order, placed);
  order.orderHistory.push(history);

  await deductInventory(order);
  await resetCart(order.userId);
  await sendConfirmationSms(user, order.orderId);
  await sendConfirmationEmail(user, order);

  return { total, orderId: order.orderId };
};

/**
 * The user's order in checkout (`attempted` or `created`), with the checkout projection. Legacy: the projection
 * names `boxed` (a typo that selects nothing); populated `addOns` and `boxes` join the projection anyway.
 * @param {string} userId
 * @returns {Promise<object>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED when there is none.
 */
const getPendingOrder = async (userId) => {
  const order = await Order.findOne({ userId, $or: PENDING }).select(PENDING_FIELDS).populate(ORDER_POPULATE);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');
  return order;
};

module.exports = { attemptOrder, getPendingOrder, placeOrder };
