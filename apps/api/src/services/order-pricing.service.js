const { styleText } = require('node:util');
const mongoose = require('mongoose');
const { get, sumBy } = require('lodash');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { calculateTotal } = require('./cart-pricing.service');

// Order money: the cart subtotal, shipping, gift charges, store credit and the priced order lines.
//
// Two roundings meet here (legacy, kept): the subtotal adds cart lines floored per unit (cart-pricing calculateTotal),
// while the order lines store unfloored totals — 2 × (499 − 10%) is 898 in the subtotal but 898.2 on the line.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);
const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const MysteryBox = mongoose.model(models.MYSTERY_BOX);
const AddOn = mongoose.model(models.ADD_ON);

/** Free shipping strictly above this subtotal. */
const FREE_SHIPPING_ABOVE = 599;

/** Populate options for a cart being priced (also applied, harmlessly, to orders in two legacy lookups). */
const CART_POPULATE = [
  {
    path: 'products.product',
    select: 'bookId title poster author preOrder currentDiscount price weight',
    populate: { path: 'author', select: 'name avatar' },
  },
  {
    path: 'bundles.bundle',
    select: 'bundleId weight title poster bundledBooks currentDiscount price',
    populate: { path: 'bundledBooks', select: 'bookId title poster author currentDiscount price' },
  },
  { path: 'addOns.addOn', select: 'name poster currentDiscount price' },
  { path: 'mysteryBoxes.box', select: 'boxId title images currentDiscount price weight' },
];

const discounted = (price, discount) => price - (discount * price) / 100;

/**
 * Total weight of cart lines: Σ catalog weight × quantity over books, bundles and boxes (add-ons weigh nothing).
 * Legacy: any error (a line whose product is null, a missing argument) is logged and the weight is 0.
 * @param {object[]} products Lines `{ product, quantity }` with a populated `product.weight`.
 * @param {object[]} bundles Lines `{ bundle, quantity }`.
 * @param {object[]} mysteryBoxes Lines `{ box, quantity }`.
 * @returns {Promise<number>}
 */
const calculateTotalWeight = async (products, bundles, mysteryBoxes) => {
  try {
    const finalProductsWeight = sumBy(products, (obj) => obj.product.weight * obj.quantity);
    const finalBundleWeight = sumBy(bundles, (obj) => obj.bundle.weight * obj.quantity);
    const finalBoxWeight = sumBy(mysteryBoxes, (obj) => obj.box.weight * obj.quantity);
    return Number(finalProductsWeight) + Number(finalBundleWeight) + Number(finalBoxWeight);
  } catch (e) {
    console.log(styleText('red', 'ERROR'), JSON.stringify(e));
    return 0;
  }
};

/**
 * Delivery charges: free when `isFree`, else 125 with a mystery box, else 50. Taxes are always 0.
 * @param {boolean} isFree
 * @param {boolean} hasMysteryBox
 * @returns {Promise<{ taxes: number, deliveryAmount: number, totalDeliveryCharges: number }>}
 */
const calculateShipping = async (isFree, hasMysteryBox) => {
  if (isFree) return { taxes: 0, deliveryAmount: 0, totalDeliveryCharges: 0 };
  if (hasMysteryBox) return { taxes: 0, deliveryAmount: 125, totalDeliveryCharges: 125 };
  return { taxes: 0, deliveryAmount: 50, totalDeliveryCharges: 50 };
};

/**
 * Subtotal of a populated cart: each line is quantity × floor(discounted unit price). Writes the line totals onto the
 * cart's items in memory (cart-pricing calculateTotal).
 * @param {object} cart Cart populated with CART_POPULATE.
 * @returns {Promise<number>}
 */
const cartSubTotal = (cart) => calculateTotal(cart.products, cart.bundles, cart.mysteryBoxes, cart.addOns);

/**
 * Total weight of a populated cart (catalog weights × quantities).
 * @param {object} cart Cart populated with CART_POPULATE.
 * @returns {Promise<number>}
 */
const cartWeight = (cart) => calculateTotalWeight(cart.products, cart.bundles, cart.mysteryBoxes);

/**
 * Delivery charge: 0 above 599, else 125 with a mystery box, else 50.
 * @param {number} subTotal
 * @param {boolean} hasMysteryBox
 * @returns {Promise<number>}
 */
const shippingFor = async (subTotal, hasMysteryBox) =>
  (await calculateShipping(subTotal > FREE_SHIPPING_ABOVE, hasMysteryBox)).deliveryAmount;

/**
 * Gift wrapping charge: the `details.cost` the shopper sent when `isGift`, else 0. Legacy: the cost is not checked
 * against any price list, and a missing `giftOptions` throws a TypeError (→ 500).
 * @param {{ isGift: boolean, details?: { cost?: number } }} giftOptions
 * @returns {number}
 */
const giftChargesOf = (giftOptions) => (giftOptions.isGift ? get(giftOptions, 'details.cost', 0) : 0);

/**
 * Amount payable: subtotal + shipping + gift charges − store credit.
 * @param {{ subTotal: number, shipping: number, giftCharges: number, storeCredit: number }} parts
 * @returns {number}
 */
const orderTotalOf = ({ subTotal, shipping, giftCharges, storeCredit }) => subTotal + shipping + giftCharges - storeCredit;

/**
 * Prices a populated cart's items at today's catalog prices as order lines. Line totals are not floored (legacy).
 * Mystery boxes keep their preferences.
 * @param {object} cart Cart populated with CART_POPULATE.
 * @returns {Promise<{ products: object[], bundles: object[], boxes: object[], addOns: object[] }>}
 * @throws {TypeError} when an item was soft-deleted from the catalog since it was added (legacy → 500).
 */
const buildOrderLines = async (cart) => {
  const products = [];
  for (const item of cart.products) {
    const book = await Book.findOne({ isDeleted: false, _id: item.product._id }).select(
      'currentDiscount price membersPrice inventory weight',
    );
    products.push({
      quantity: item.quantity,
      price: book.price,
      discount: book.currentDiscount,
      productTotal: item.quantity * discounted(book.price, book.currentDiscount),
      product: item.product,
      weight: book.weight * item.quantity,
    });
  }

  const boxes = [];
  for (const item of cart.mysteryBoxes) {
    const box = await MysteryBox.findOne({ isDeleted: false, _id: item.box._id }).select('currentDiscount price weight');
    boxes.push({
      quantity: item.quantity,
      price: box.price,
      discount: box.currentDiscount,
      preferences: item.preferences,
      total: item.quantity * discounted(box.price, box.currentDiscount),
      box: item.box,
      weight: box.weight * item.quantity,
    });
  }

  const bundles = [];
  for (const item of cart.bundles) {
    const bundle = await Bundle.findOne({ isDeleted: false, _id: item.bundle._id })
      .select('currentDiscount weight bundledBooks price')
      .populate({ path: 'bundledBooks', select: 'bookId title poster author currentDiscount price inventory weight' });
    bundles.push({
      quantity: item.quantity,
      price: bundle.price,
      discount: bundle.currentDiscount,
      total: item.quantity * discounted(bundle.price, bundle.currentDiscount),
      bundle: item.bundle._id,
      weight: bundle.weight * item.quantity,
    });
  }

  const addOns = [];
  for (const item of cart.addOns) {
    const addOn = await AddOn.findOne({ isDeleted: false, _id: item.addOn._id }).select('name price inventory currentDiscount');
    addOns.push({
      quantity: item.quantity,
      price: addOn.price,
      discount: addOn.currentDiscount,
      total: item.quantity * discounted(addOn.price, addOn.currentDiscount),
      addOn: item.addOn._id,
    });
  }

  return { products, bundles, boxes, addOns };
};

/**
 * Sets how much of the user's store credit an order will use. The balance itself moves only when the order is
 * confirmed (COD) or paid (webhook). Legacy: the order may be in any stage, and the checks run in this order.
 * @param {string} userId
 * @param {string} uniqueId Public order id (`OD-…`).
 * @param {number} amount
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such order for this user), STORE_CREDIT_UNAVAILABLE (more than the
 *   balance), STORE_CREDIT_NEGATIVE, STORE_CREDIT_SURPLUS (more than the order total).
 */
const applyStoreCredit = async (userId, uniqueId, amount) => {
  const user = await User.findOne({ _id: userId }).select('storeCredit');
  const order = await Order.findOne({ orderId: uniqueId, userId }).populate(CART_POPULATE);

  if (!order || !user) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');
  if (amount > user.storeCredit) throw new AppError('STORE_CREDIT_UNAVAILABLE');
  if (amount < 0) throw new AppError('STORE_CREDIT_NEGATIVE');
  if (amount > order.total) throw new AppError('STORE_CREDIT_SURPLUS');

  order.storeCredit = amount;
  await order.save();
};

module.exports = {
  CART_POPULATE,
  applyStoreCredit,
  buildOrderLines,
  cartSubTotal,
  cartWeight,
  giftChargesOf,
  orderTotalOf,
  shippingFor,
};
