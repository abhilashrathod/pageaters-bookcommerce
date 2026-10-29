const mongoose = require('mongoose');

const { ids: catalogIds } = require('./catalog');
const { fixtureId } = require('./ids');

const { BOOK_AVAILABILITY, PRODUCT_TYPES, TOKEN_ID } = require('../../../src/constants/enums');

// Fake fixtures for the cart and auth tests (4c), on top of the shared catalog (loadCatalog() first). Fixed ids from
// the 'cart' range. Prices are chosen so discounts leave fractions the cart has to floor. Fake data only (§7).

const id = fixtureId('cart');

const cartIds = {
  bookPreOrder: id(0xb1),
  bookOutOfStock: id(0xb2),
  bookSingle: id(0xb3),
  bundleBookA: id(0xb4),
  bundleBookB: id(0xb5),
  bundleBookOutOfStock: id(0xb6),
  bundle: id(0xd1),
  bundleOutOfStock: id(0xd2),
  bundleDeleted: id(0xd3),
  box: id(0xe1),
  boxDeleted: id(0xe2),
  addOn: id(0xa1),
  addOnDiscounted: id(0xa2),
  addOnLow: id(0xa3),
  addOnDeleted: id(0xa4),
};

const book = (_id, n, overrides) => ({
  _id,
  type: PRODUCT_TYPES.BOOK,
  bookId: `test-cart-book-${n}`,
  title: `Test Cart Book ${n}`,
  ISBN: `99930000000${String(n).padStart(2, '0')}`,
  author: catalogIds.authorA,
  language: 'English',
  pages: 120,
  poster: 'https://images.example.com/test-cover.png',
  price: 300,
  currentDiscount: 0,
  inventory: 10,
  ...overrides,
});

const books = () => [
  book(cartIds.bookPreOrder, 1, { availability: BOOK_AVAILABILITY.PRE_ORDER, price: 350 }),
  book(cartIds.bookOutOfStock, 2, { price: 299, inventory: 0 }),
  // 199 at 15% off = 169.15 → 169
  book(cartIds.bookSingle, 3, { price: 199, currentDiscount: 15, inventory: 1 }),
  book(cartIds.bundleBookA, 4, { inventory: 5 }),
  book(cartIds.bundleBookB, 5, { inventory: 5 }),
  book(cartIds.bundleBookOutOfStock, 6, { inventory: 0 }),
];

const bundle = (_id, n, overrides) => ({
  _id,
  bundleId: `test-bundle-${n}`,
  title: `Test Bundle ${n}`,
  poster: 'https://images.example.com/test-bundle.png',
  price: 999,
  currentDiscount: 20, // 999 at 20% off = 799.2 → 799
  ...overrides,
});

const bundles = () => [
  bundle(cartIds.bundle, 1, { bundledBooks: [cartIds.bundleBookA, cartIds.bundleBookB] }),
  bundle(cartIds.bundleOutOfStock, 2, { bundledBooks: [cartIds.bundleBookA, cartIds.bundleBookOutOfStock] }),
  bundle(cartIds.bundleDeleted, 3, { bundledBooks: [cartIds.bundleBookB], isDeleted: true }),
];

const boxes = () => [
  // 1299 at 5% off = 1234.05 → 1234
  { _id: cartIds.box, boxId: 'test-box-1', title: 'Test Box 1', images: ['https://images.example.com/test-box.png'], price: 1299, currentDiscount: 5, inventory: 10 },
  { _id: cartIds.boxDeleted, boxId: 'test-box-2', title: 'Test Box 2', price: 999, inventory: 10, isDeleted: true },
];

const addOns = () => [
  { _id: cartIds.addOn, addOnId: 'test-addon-1', name: 'Test Bookmark', description: 'A test add-on.', poster: 'https://images.example.com/test-addon.png', price: 99, inventory: 50 },
  // 149 at 33% off = 99.83 → 99
  { _id: cartIds.addOnDiscounted, addOnId: 'test-addon-2', name: 'Test Wrap', price: 149, currentDiscount: 33, inventory: 50 },
  { _id: cartIds.addOnLow, addOnId: 'test-addon-3', name: 'Test Pin', price: 49, inventory: 3 },
  { _id: cartIds.addOnDeleted, addOnId: 'test-addon-4', name: 'Test Old', price: 10, inventory: 50, isDeleted: true },
];

/** Inserts the cart fixtures (books, bundles, mystery boxes, add-ons). Load the shared catalog first. */
const loadCartFixtures = async () => {
  const model = (name) => mongoose.model(name);
  await model('storeBook').insertMany(books());
  await model('bundle').insertMany(bundles());
  await model('mystery_box').insertMany(boxes());
  await model('add_on').insertMany(addOns());
  return cartIds;
};

/**
 * The cart signup (and createUser) made for `user`, and a Cookie header with its session and cart cookies.
 * @param {{ user: object, cookie: string }} account From createUser().
 * @returns {Promise<{ cart: object, cookie: string }>}
 */
const cartSession = async ({ user, cookie }) => {
  const cart = await mongoose.model('cart').findOne({ user: user._id });
  return { cart, cookie: `${cookie}; ${TOKEN_ID.CART_COOKIE}=${cart._id}` };
};

module.exports = { cartIds, cartSession, loadCartFixtures };
