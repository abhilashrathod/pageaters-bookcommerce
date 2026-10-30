const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, fixtureId, ids, loadCatalog, startTestApp } = require('./helpers');
const { cartIds, cartSession, loadCartFixtures } = require('./helpers/fixtures/cart');

// Cart reads and totals over HTTP: GET /cart/retrieve (shopper), GET /cart and GET /cart/:id (admin). Envelopes are
// pinned byte for byte (raw JSON, key order included), so the controller → service refactor can't change them.

const { badRequest, forbidden, ok, unauthorized } = envelopes;

const line = fixtureId('cart');
const ADDED = '2026-01-01T00:00:00.000Z';
const BOX_PREFERENCES = { preferredAuthors: '', preferredGenres: 'Test genre', favoriteBooks: '', ignoredBooks: '' };

// A cart with one of everything: two books (one discounted to a fraction), a bundle, a mystery box and two add-ons.
const fillCart = (cartId) =>
  mongoose.model('cart').updateOne(
    { _id: cartId },
    {
      products: [
        { _id: line(0x101), product: ids.bookOne, quantity: 2, addedOn: ADDED },
        { _id: line(0x102), product: cartIds.bookSingle, quantity: 1, addedOn: ADDED },
      ],
      bundles: [{ _id: line(0x103), bundle: cartIds.bundle, quantity: 1, addedOn: ADDED }],
      mysteryBoxes: [{ _id: line(0x104), box: cartIds.box, quantity: 1, addedOn: ADDED, preferences: BOX_PREFERENCES }],
      addOns: [
        { _id: line(0x105), addOn: cartIds.addOn, quantity: 3, addedOn: ADDED },
        { _id: line(0x106), addOn: cartIds.addOnDiscounted, quantity: 2, addedOn: ADDED },
      ],
    },
  );

const AUTHOR_A = { _id: String(ids.authorA), name: 'Test Author A', avatar: '' };

// The populated lines as GET /cart/retrieve answers them, with the totals calculateTotal adds.
const productLines = [
  {
    quantity: 2,
    addedOn: ADDED,
    product: {
      _id: String(ids.bookOne),
      bookId: 'test-book-one',
      title: 'Test Book One',
      author: AUTHOR_A,
      availability: 'available',
      poster: 'https://images.example.com/test-cover.png',
      currentDiscount: 10,
      price: 499,
    },
    _id: String(line(0x101)),
    productTotal: 898, // 2 × floor(499 − 49.9)
    price: 499,
  },
  {
    quantity: 1,
    addedOn: ADDED,
    product: {
      _id: String(cartIds.bookSingle),
      bookId: 'test-cart-book-3',
      title: 'Test Cart Book 3',
      author: AUTHOR_A,
      availability: 'available',
      poster: 'https://images.example.com/test-cover.png',
      currentDiscount: 15,
      price: 199,
    },
    _id: String(line(0x102)),
    productTotal: 169, // floor(199 − 29.85)
    price: 199,
  },
];

const addOnLine = (n, addOn, quantity, totals) => ({ quantity, addedOn: ADDED, addOn, _id: String(line(n)), ...totals });
const ADD_ON = { _id: String(cartIds.addOn), name: 'Test Bookmark', poster: 'https://images.example.com/test-addon.png', price: 99, currentDiscount: 0 };
const ADD_ON_DISCOUNTED = { _id: String(cartIds.addOnDiscounted), name: 'Test Wrap', poster: '', price: 149, currentDiscount: 33 };

const bundleLine = {
  quantity: 1,
  addedOn: ADDED,
  bundle: {
    _id: String(cartIds.bundle),
    bundleId: 'test-bundle-1',
    title: 'Test Bundle 1',
    poster: 'https://images.example.com/test-bundle.png',
    currentDiscount: 20,
    bundledBooks: [String(cartIds.bundleBookA), String(cartIds.bundleBookB)],
    price: 999,
  },
  _id: String(line(0x103)),
  total: 799, // floor(999 − 199.8); bundles get no `price`
};

const boxLine = {
  preferences: BOX_PREFERENCES,
  quantity: 1,
  addedOn: ADDED,
  box: {
    _id: String(cartIds.box),
    boxId: 'test-box-1',
    title: 'Test Box 1',
    images: ['https://images.example.com/test-box.png'],
    currentDiscount: 5,
    price: 1299,
  },
  _id: String(line(0x104)),
  total: 1234, // floor(1299 − 64.95)
  price: 1299,
};

const cartBody = (cart, subTotal, addOns) => ({
  _id: String(cart._id),
  user: String(cart.user),
  subTotal,
  isDeleted: false,
  deletedAt: '',
  products: productLines,
  addOns,
  bundles: [bundleLine],
  mysteryBoxes: [boxLine],
  createdAt: cart.createdAt.toISOString(),
  updatedAt: cart.updatedAt.toISOString(),
  __v: 0,
});

let api;
let shopper;
let session;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  await loadCartFixtures();
  shopper = await createUser();
  session = await cartSession(shopper);
});

const reloadCart = () => mongoose.model('cart').findById(session.cart._id);

describe('GET /cart/retrieve', () => {
  test('answers the populated cart with line totals and a floored subTotal, and sets the cart cookie', async () => {
    await fillCart(session.cart._id);
    const cart = await reloadCart();

    const res = await api.request('/cart/retrieve', { cookie: session.cookie });

    // 898 + 169 + 799 + 1234 + 3 × 99 + 2 × floor(149 − 49.17) = 3595
    const addOns = [
      addOnLine(0x105, ADD_ON, 3, { total: 297, price: 99 }),
      addOnLine(0x106, ADD_ON_DISCOUNTED, 2, { total: 198, price: 149 }),
    ];
    assertBody(res, 200, ok('CART_LIST_SUCCESS', cartBody(cart, 3595, addOns)));
    // legacy: the cart id is an ObjectId, so Express serialises the cookie as JSON (`j:"<id>"`).
    assert.deepEqual(res.headers.getSetCookie(), [`_CID=j%3A%22${cart._id}%22; Path=/; HttpOnly`]);
  });

  test('an empty cart totals 0', async () => {
    const res = await api.request('/cart/retrieve', { cookie: session.cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.subTotal, 0);
    assert.deepEqual(res.body.data.products, []);
  });

  test('totals use the current price and discount, not what the cart stored', async () => {
    await fillCart(session.cart._id);
    await mongoose.model('storeBook').updateOne({ _id: ids.bookOne }, { price: 100, currentDiscount: 0 });
    const res = await api.request('/cart/retrieve', { cookie: session.cookie });
    assert.equal(res.body.data.products[0].productTotal, 200);
    assert.equal(res.body.data.subTotal, 3595 - 898 + 200);
  });

  test('legacy: an out-of-stock book stays in the cart and counts toward the total', async () => {
    await mongoose.model('cart').updateOne({ _id: session.cart._id }, { products: [{ product: cartIds.bookOutOfStock, quantity: 1 }] });
    const res = await api.request('/cart/retrieve', { cookie: session.cookie });
    assert.equal(res.body.data.subTotal, 299);
  });

  test('legacy: a line whose product was deleted from the database makes the subTotal 0', async () => {
    await fillCart(session.cart._id);
    await mongoose.model('add_on').deleteOne({ _id: cartIds.addOn });
    const res = await api.request('/cart/retrieve', { cookie: session.cookie });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.subTotal, 0);
  });

  test("answers CART_NOT_EXIST for another user's cart", async () => {
    const other = await createUser();
    const otherSession = await cartSession(other);
    const res = await api.request('/cart/retrieve', { cookie: `${shopper.cookie}; _CID=${otherSession.cart._id}` });
    assertBody(res, 400, badRequest('CART_NOT_EXIST'));
    assert.deepEqual(res.headers.getSetCookie(), []);
  });

  test('answers CART_NOT_EXIST without a cart cookie', async () => {
    assertBody(await api.request('/cart/retrieve', { cookie: shopper.cookie }), 400, badRequest('CART_NOT_EXIST'));
  });

  test('answers 401 NO_AUTH_HEADER without a session', async () => {
    assertBody(await api.request('/cart/retrieve'), 401, unauthorized('NO_AUTH_HEADER'));
  });

  // Phase 4: the cart cookie must be a cart id (was: a malformed id answered 500, and a JSON cookie such as
  // `j:{"$ne":null}` reached the cart queries as an operator object).
  test('a cart cookie that is not an ObjectId answers CART_NOT_EXIST, operator objects included', async () => {
    for (const value of ['not-an-id', encodeURIComponent('j:{"$ne":null}'), encodeURIComponent('j:{"$in":["a"]}'), encodeURIComponent('j:["a"]')]) {
      assertBody(await api.request('/cart/retrieve', { cookie: `${shopper.cookie}; _CID=${value}` }), 400, envelopes.badRequest('CART_NOT_EXIST'));
    }
  });
});

describe('admin GET /cart/:id', () => {
  test('legacy: answers the populated cart with subTotal 0 and no add-on totals (add-ons are not passed to the total)', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    await fillCart(session.cart._id);
    const cart = await reloadCart();

    const res = await api.request(`/cart/${cart._id}`, { cookie: admin.cookie });

    const addOns = [addOnLine(0x105, ADD_ON, 3, {}), addOnLine(0x106, ADD_ON_DISCOUNTED, 2, {})];
    assertBody(res, 200, ok('CART_LIST_SUCCESS', cartBody(cart, 0, addOns)));
    assert.deepEqual(res.headers.getSetCookie(), []);
  });

  test('answers CART_NOT_EXIST for an unknown id', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    assertBody(await api.request(`/cart/${line(0xfff)}`, { cookie: admin.cookie }), 400, badRequest('CART_NOT_EXIST'));
  });

  test('a shopper is forbidden', async () => {
    assertBody(await api.request(`/cart/${session.cart._id}`, { cookie: shopper.cookie }), 403, forbidden);
  });
});

describe('admin GET /cart', () => {
  test('pages carts with the user name and email', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await api.request('/cart?page=1&limit=1', { cookie: admin.cookie });
    assert.equal(res.status, 200);
    const { docs, ...paging } = res.body.data;
    assert.equal(
      JSON.stringify(paging),
      JSON.stringify({ totalDocs: 2, limit: 1, totalPages: 2, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: true, prevPage: null, nextPage: 2 }),
    );
    assert.equal(docs.length, 1);
    assert.deepEqual(Object.keys(docs[0].user), ['_id', 'fullName', 'email', 'id']);
    assert.equal(res.body.status, 'CART_LIST_SUCCESS');
  });

  test('legacy: without page/limit it answers no documents', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await api.request('/cart', { cookie: admin.cookie });
    assert.deepEqual(res.body.data.docs, []);
    assert.equal(res.body.data.limit, 0);
  });

  test('a shopper is forbidden', async () => {
    assertBody(await api.request('/cart', { cookie: shopper.cookie }), 403, forbidden);
  });
});
