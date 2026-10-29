const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { debitStoreCredit, deductInventory, resetCart } = require('./order-fulfilment.service');
const { sendConfirmationEmail, sendConfirmationSms } = require('./order-notifications.service');
const { createPaymentOrder } = require('./order-payment.service');
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

// Checkout: attempt (choose the address; one `attempted` order per user) → place (COD confirms at once; online
// creates a Razorpay order and waits for the payment webhook, order-payment.service.js).

const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);

const PENDING = [{ orderStatus: enums.ORDER_STAGES.ATTEMPTED }, { orderStatus: enums.ORDER_STAGES.CREATED }];
const CONFIRMED_DESCRIPTION =
  'We have received your order. We shall start preparing your shipment. Once shipment is handover to shipment company, you will receive tracking information and estimated delivery date.';
const PENDING_FIELDS =
  'orderId userId subTotal orderDate storeCredit total shipping giftOptions deliveryInstructions orderHistory deliveryAddress boxed bundles products total';

/**
 * Starts (or restarts) checkout: prices the cart and stores the user's single `attempted` order with the chosen
 * address. A restart keeps the order document (and any store credit applied to it) but gives it a new order id.
 * Legacy: the cart is looked up by id only, not by owner; a missing `address` finds no address.
 * @param {string} userId
 * @param {string | undefined} cartId From the cart cookie.
 * @param {string | undefined} address Address id.
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no cart cookie), CART_NOT_EXIST, ORDER_ADDRESS_ATTEMPT_FAILED (not
 *   the user's live address). A malformed cart id rejects with a CastError (→ 500).
 */
const attemptOrder = async (userId, cartId, address) => {
  const orderId = `OD-${generateRandomNumber(10)}`;
  if (!cartId || !userId) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const cart = await Cart.findOne({ _id: cartId }).populate(CART_POPULATE);
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
  };

  const query = { userId, orderStatus: enums.ORDER_STAGES.ATTEMPTED };
  if (await Order.findOne(query)) {
    await Order.findOneAndUpdate(query, { $set: payload }, { new: true });
  } else {
    await Order.create(payload);
  }
};

/**
 * Places the user's attempted (or created, unpaid) order from their cart at today's prices.
 * - `online`: creates a Razorpay order for the total; the order becomes `created` and nothing else happens until
 *   the payment webhook.
 * - `cod`: the order becomes `confirmed`; then stock is taken, the cart emptied, the SMS sent (production), applied
 *   store credit debited and the confirmation e-mail queued (production).
 * Total = subtotal + shipping + gift charges − store credit applied to the order.
 * @param {string} userId
 * @param {string | undefined} cartId From the cart cookie; must be the user's cart.
 * @param {{ method: 'cod' | 'online', instructions?: string, giftOptions: object }} checkout
 * @returns {Promise<{ razorOrderId: string, total: number, orderId: string } | { total: number, orderId: string }>}
 *   The response data: with `razorOrderId` for online payment.
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no cart cookie, or no attempted/created order), CART_NOT_EXIST.
 *   Legacy: a missing `giftOptions`, or a cart item soft-deleted since, throws a TypeError (→ 500); a Razorpay
 *   failure rejects (→ 500) and leaves the order as it was.
 */
const placeOrder = async (userId, cartId, { method, instructions, giftOptions }) => {
  const giftCharges = giftChargesOf(giftOptions);
  if (!cartId || !userId) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const order = await Order.findOne({ $or: PENDING, userId }).populate({ path: 'deliveryAddress' });
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const cart = await Cart.findOne({ _id: cartId, user: userId }).populate(CART_POPULATE);
  if (!cart) throw new AppError('CART_NOT_EXIST');

  const lines = await buildOrderLines(cart);
  const subTotal = await cartSubTotal(cart);
  const weight = await cartWeight(cart);
  const shipping = await shippingFor(subTotal, lines.boxes.length > 0);
  const storeCredit = order.storeCredit || 0;
  const total = orderTotalOf({ subTotal, shipping, giftCharges, storeCredit });

  const online = method === 'online';
  const paymentOrder = online ? await createPaymentOrder(order.orderId, total) : undefined;

  order.razorOrderId = online ? paymentOrder.id : '';
  order.orderStatus = online ? enums.ORDER_STAGES.CREATED : enums.ORDER_STAGES.CONFIRMED;
  order.products = lines.products;
  order.bundles = lines.bundles;
  order.boxes = lines.boxes;
  order.addOns = lines.addOns;
  order.weight = weight;
  order.giftOptions = giftOptions;
  order.deliveryInstructions = instructions;
  order.subTotal = subTotal;
  order.shipping = shipping;
  order.total = total;
  order.storeCredit = storeCredit;
  order.orderDate = new Date().toISOString();
  order.giftCard = null;
  order.discount = null;

  if (!online) {
    order.orderHistory.push({ title: enums.ORDER_STAGES.CONFIRMED, description: CONFIRMED_DESCRIPTION, time: new Date().toISOString() });
    order.payment = { method: 'cod' };
  }

  await order.save();

  if (online) return { razorOrderId: paymentOrder.id, total, orderId: order.orderId };

  const user = await User.findOne({ _id: order.userId });
  await deductInventory(order);
  await resetCart(order.userId);
  await sendConfirmationSms(user, order.orderId);
  if (storeCredit > 0) {
    order.storeCreditTransaction = await debitStoreCredit(order._id, order.userId, storeCredit);
    await order.save();
  }
  sendConfirmationEmail(user, order);

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
