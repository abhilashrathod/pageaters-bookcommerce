const crypto = require('node:crypto');
const mongoose = require('mongoose');

const { fixtureId } = require('./ids');
const { ids } = require('./catalog');
const { TEST_ENV } = require('../env');

// Order fixtures (4b): the bundle, mystery box and add-on the order tests sell next to the shared catalog's books,
// fake delivery addresses, carts and orders in any lifecycle stage. Fake data only (AGENTS.md §7): "Test" names,
// example.com emails, 90000000xx numbers, made-up streets. Ids come from the `orders` range.

const id = fixtureId('orders');

const orderIds = {
  bundleOne: id(0xb1),
  boxOne: id(0xd1),
  addOnOne: id(0xa1),
  addOnDeleted: id(0xa2),
};

// Prices chosen so the floored cart line differs from the unfloored order line: 799 − 20% = 639.2 → 639.
const bundles = () => [
  {
    _id: orderIds.bundleOne,
    bundleId: 'test-bundle-one',
    title: 'Test Bundle One',
    poster: 'https://images.example.com/test-bundle.png',
    price: 799,
    currentDiscount: 20,
    weight: 700,
    bundledBooks: [ids.bookOne, ids.bookTwo],
  },
];

// 999 − 5% = 949.05 → 949.
const boxes = () => [
  {
    _id: orderIds.boxOne,
    boxId: 'test-box-one',
    title: 'Test Mystery Box',
    images: ['https://images.example.com/test-box.png'],
    price: 999,
    currentDiscount: 5,
    weight: 900,
    inventory: 10,
  },
];

// 99 − 15% = 84.15 → 84.
const addOns = () => [
  {
    _id: orderIds.addOnOne,
    addOnId: 'test-add-on-one',
    name: 'Test Bookmark',
    poster: 'https://images.example.com/test-bookmark.png',
    price: 99,
    currentDiscount: 15,
    inventory: 50,
  },
  { _id: orderIds.addOnDeleted, addOnId: 'test-add-on-deleted', name: 'Test Deleted Add-on', price: 10, isDeleted: true },
];

/** Inserts the order tests' bundle, mystery box and add-ons (load the shared catalog first). */
const loadOrderCatalog = async () => {
  await mongoose.model('bundle').insertMany(bundles());
  await mongoose.model('mystery_box').insertMany(boxes());
  await mongoose.model('add_on').insertMany(addOns());
  return orderIds;
};

let addressCounter = 0;

/**
 * Creates a fake delivery address for a user.
 * @param {object} user
 * @param {object} [overrides]
 */
const createAddress = (user, overrides = {}) => {
  addressCounter += 1;
  return mongoose.model('address').create({
    userId: user._id,
    fullName: 'Test Receiver',
    contactNo: '9000000099',
    email: 'receiver@example.com',
    addressLine1: `${addressCounter} Test Street`,
    addressLine2: 'Test Area',
    landmark: 'Near Test Park',
    city: 'Test City',
    state: 'Test State',
    pinCode: '100001',
    type: 'HOME',
    ...overrides,
  });
};

/**
 * Replaces the items in the user's cart (the one createUser made) and returns it.
 * @param {object} user
 * @param {{ products?: object[], bundles?: object[], mysteryBoxes?: object[], addOns?: object[] }} items
 */
const fillCart = (user, { products = [], bundles: cartBundles = [], mysteryBoxes = [], addOns: cartAddOns = [] } = {}) =>
  mongoose
    .model('cart')
    .findOneAndUpdate({ user: user._id }, { $set: { products, bundles: cartBundles, mysteryBoxes, addOns: cartAddOns } }, { new: true });

let orderCounter = 0;

/**
 * Inserts an order in any stage, priced like a one-copy order of Test Book One.
 * @param {object} user
 * @param {object} [overrides] Any order fields.
 */
const createOrder = (user, overrides = {}) => {
  orderCounter += 1;
  return mongoose.model('order').create({
    userId: user._id,
    orderId: `OD-${String(9000000000 + orderCounter)}`,
    orderStatus: 'paid',
    orderDate: '2026-01-15T10:00:00.000Z',
    products: [{ quantity: 1, price: 499, discount: 10, productTotal: 449.1, weight: 0, product: ids.bookOne }],
    subTotal: 449,
    shipping: 50,
    total: 499,
    ...overrides,
  });
};

/** Signs a webhook body the way Razorpay does (HMAC-SHA256 of the raw body with the webhook secret). */
const razorpaySignature = (rawBody, secret = TEST_ENV.RAZORPAY_WEBHOOK_SECRET) =>
  crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

module.exports = { createAddress, createOrder, fillCart, loadOrderCatalog, orderIds, razorpaySignature };
