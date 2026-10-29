const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, fixtureId, ids, loadCatalog, startTestApp } = require('./helpers');
const { cartIds, cartSession, loadCartFixtures } = require('./helpers/fixtures/cart');
const t = require('../src/locales/en.json');

// Cart mutations over HTTP (books, bundles, mystery boxes, add-ons, empty, clear). Envelopes are pinned byte for byte
// (raw JSON, key order included), so the controller → service refactor can't change them. Legacy bugs are pinned
// too: they are fixed in their own PLAN.md step, not here.

const ok = (status, data) => ({ statusCode: 200, status, message: t[status], data });
const badRequest = (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} });
const joiError = (status) => ({ statusCode: 400, status, message: t[status], error: t[status], data: {} });
const unauthorized = (key) => ({ statusCode: 401, status: 'UNAUTHORIZED', message: t[key], data: {}, error: t[key] });
const mismatch = (message) => ({ statusCode: 400, status: 'PRODUCT_ITEM_MISMATCH', error: message, message, data: {} });

const assertBody = (res, status, body) => {
  assert.equal(res.status, status);
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};

const line = fixtureId('cart');

let api;
let shopper;
let session;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  // res.error() writes its request log (log_api) without awaiting it; let the last one land before the client closes.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  await loadCartFixtures();
  shopper = await createUser();
  session = await cartSession(shopper);
});

const call = (method, path, body) => api.request(`/cart${path}`, { method, body, cookie: session.cookie });
const post = (path, body) => call('POST', path, body);
const put = (path, body) => call('PUT', path, body);
const del = (path) => call('DELETE', path);

const Cart = () => mongoose.model('cart');
const reloadCart = () => Cart().findById(session.cart._id);
const setCart = (fields) => Cart().updateOne({ _id: session.cart._id }, fields);
const lines = async (field, ref) => (await reloadCart())[field].map((item) => [String(item[ref]), item.quantity]);
// What a cart document serialises to (the `data` some mutations answer with).
const cartJson = async () => JSON.parse(JSON.stringify(await reloadCart()));

describe('guards on every shopper route', () => {
  const routes = [
    ['GET', '/retrieve'],
    ['POST', '/add', { product: String(ids.bookOne) }],
    ['POST', '/add/bundle', { bundle: String(cartIds.bundle) }],
    ['POST', '/add/box', { box: String(cartIds.box) }],
    ['POST', '/add/addOn', { addOn: String(cartIds.addOn) }],
    ['PUT', `/update/${ids.bookOne}`, { quantity: 1 }],
    ['PUT', `/update/addOn/${cartIds.addOn}`, { quantity: 1 }],
    ['DELETE', `/remove/${ids.bookOne}`],
    ['DELETE', `/remove/bundle/${cartIds.bundle}`],
    ['DELETE', `/remove/box/${cartIds.box}`],
    ['DELETE', `/remove/addOn/${cartIds.addOn}`],
    ['DELETE', '/empty'],
    ['DELETE', '/clear'],
  ];

  for (const [method, path, body] of routes) {
    test(`${method} ${path} without a session answers 401 NO_AUTH_HEADER`, async () => {
      assertBody(await api.request(`/cart${path}`, { method, body }), 401, unauthorized('NO_AUTH_HEADER'));
    });

    test(`${method} ${path} without a cart cookie answers CART_NOT_EXIST`, async () => {
      assertBody(await api.request(`/cart${path}`, { method, body, cookie: shopper.cookie }), 400, badRequest('CART_NOT_EXIST'));
    });
  }

  test("mutations on another user's cart answer CART_NOT_EXIST", async () => {
    const other = await cartSession(await createUser());
    const cookie = `${shopper.cookie}; _CID=${other.cart._id}`;
    for (const [method, path, body] of routes.slice(1, -1)) {
      assertBody(await api.request(`/cart${path}`, { method, body, cookie }), 400, badRequest('CART_NOT_EXIST'));
    }
    assert.deepEqual((await Cart().findById(other.cart._id)).products, []);
  });
});

describe('POST /cart/add', () => {
  test('adds a new book and answers data true; quantity defaults to 1', async () => {
    assertBody(await post('/add', { product: String(ids.bookOne) }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 1]]);
  });

  test('adds a new book with a quantity of 2', async () => {
    assertBody(await post('/add', { product: String(ids.bookOne), quantity: 2 }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 2]]);
  });

  test('legacy: adding a book already in the cart adds the quantities and answers the whole cart', async () => {
    await post('/add', { product: String(ids.bookOne) });
    const res = await post('/add', { product: String(ids.bookOne), quantity: 1 });
    assertBody(res, 200, ok('CART_UPDATE_SUCCESS', await cartJson()));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 2]]);
  });

  test('more than 2 of a book answers QUANTITY_LIMIT', async () => {
    assertBody(await post('/add', { product: String(ids.bookOne), quantity: 3 }), 400, badRequest('QUANTITY_LIMIT'));
    await post('/add', { product: String(ids.bookOne), quantity: 2 });
    assertBody(await post('/add', { product: String(ids.bookOne), quantity: 1 }), 400, badRequest('QUANTITY_LIMIT'));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 2]]);
  });

  test('more than the stock answers INVALID_QUANTITY', async () => {
    assertBody(await post('/add', { product: String(cartIds.bookSingle), quantity: 2 }), 400, badRequest('INVALID_QUANTITY'));
    await post('/add', { product: String(cartIds.bookSingle) });
    assertBody(await post('/add', { product: String(cartIds.bookSingle), quantity: 1 }), 400, badRequest('INVALID_QUANTITY'));
  });

  test('an out-of-stock book answers INVALID_QUANTITY', async () => {
    assertBody(await post('/add', { product: String(cartIds.bookOutOfStock), quantity: 1 }), 400, badRequest('INVALID_QUANTITY'));
    assert.deepEqual(await lines('products', 'product'), []);
  });

  test('legacy: an out-of-stock book added without a quantity skips the stock check and is added', async () => {
    assertBody(await post('/add', { product: String(cartIds.bookOutOfStock) }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(cartIds.bookOutOfStock), 1]]);
  });

  test('a soft-deleted or unknown book answers BOOK_NOT_EXIST', async () => {
    assertBody(await post('/add', { product: String(ids.bookDeleted) }), 400, badRequest('BOOK_NOT_EXIST'));
    assertBody(await post('/add', { product: String(line(0xfff)) }), 400, badRequest('BOOK_NOT_EXIST'));
  });

  test('validates the id and quantity', async () => {
    assertBody(await post('/add', { product: 'nope' }), 400, joiError('INVALID_ID'));
    assertBody(await post('/add', { product: String(ids.bookOne), quantity: 0 }), 400, joiError('REQUIRED_QUANTITY'));
  });

  test('legacy: adding a book already in the cart without a quantity answers 500', async () => {
    await post('/add', { product: String(ids.bookOne) });
    const res = await post('/add', { product: String(ids.bookOne) });
    assert.equal(res.status, 500);
    assert.equal(res.body.status, 'SOME_ERROR_OCCURRED');
  });

  test('a book of another availability answers PRODUCT_ITEM_MISMATCH with a custom message', async () => {
    await post('/add', { product: String(ids.bookOne) });
    const message =
      "You current have a available item(s) in your cart, which can't be purchased with pre-order item(s). Please place separate order for this.";
    assertBody(await post('/add', { product: String(cartIds.bookPreOrder) }), 400, mismatch(message));
  });

  test('a non-available book with a bundle or box in the cart answers PRODUCT_ITEM_MISMATCH', async () => {
    await setCart({ mysteryBoxes: [{ box: cartIds.box }] });
    const message =
      "You current have a Bundle or Mystery Box in your cart, which can't be purchased with pre-order item(s). Please place separate order for this.";
    assertBody(await post('/add', { product: String(cartIds.bookPreOrder) }), 400, mismatch(message));
  });

  test('a book that is part of a bundle in the cart answers BUNDLE_BOOKS_ALREADY_PRESENT', async () => {
    await setCart({ bundles: [{ bundle: cartIds.bundle }] });
    assertBody(await post('/add', { product: String(cartIds.bundleBookA) }), 400, badRequest('BUNDLE_BOOKS_ALREADY_PRESENT'));
  });
});

describe('PUT /cart/update/:id', () => {
  beforeEach(() => setCart({ products: [{ product: ids.bookOne, quantity: 1 }] }));

  test('sets the quantity of a book and answers data true', async () => {
    assertBody(await put(`/update/${ids.bookOne}`, { quantity: 2 }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 2]]);
  });

  test('checks the limit, the stock and the book', async () => {
    assertBody(await put(`/update/${ids.bookOne}`, { quantity: 3 }), 400, badRequest('QUANTITY_LIMIT'));
    assertBody(await put(`/update/${cartIds.bookSingle}`, { quantity: 2 }), 400, badRequest('INVALID_QUANTITY'));
    assertBody(await put(`/update/${ids.bookDeleted}`, { quantity: 1 }), 400, badRequest('BOOK_NOT_EXIST'));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 1]]);
  });

  test('legacy: a book not in the cart answers success and changes nothing', async () => {
    assertBody(await put(`/update/${ids.bookTwo}`, { quantity: 2 }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookOne), 1]]);
  });
});

describe('DELETE /cart/remove/:id', () => {
  test('removes a book and answers data true', async () => {
    await setCart({ products: [{ product: ids.bookOne }, { product: ids.bookTwo }] });
    assertBody(await del(`/remove/${ids.bookOne}`), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), [[String(ids.bookTwo), 1]]);
  });

  test('a soft-deleted book can still be removed; an unknown one answers BOOK_NOT_EXIST', async () => {
    await setCart({ products: [{ product: ids.bookDeleted }] });
    assertBody(await del(`/remove/${ids.bookDeleted}`), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('products', 'product'), []);
    assertBody(await del(`/remove/${line(0xfff)}`), 400, badRequest('BOOK_NOT_EXIST'));
  });
});

describe('DELETE /cart/empty and /cart/clear', () => {
  test('legacy: empty removes the books only and keeps bundles, boxes and add-ons', async () => {
    await setCart({
      products: [{ product: ids.bookOne }],
      bundles: [{ bundle: cartIds.bundle }],
      mysteryBoxes: [{ box: cartIds.box }],
      addOns: [{ addOn: cartIds.addOn }],
    });
    const res = await del('/empty');
    assertBody(res, 200, ok('CART_DELETE_SUCCESS', true));
    assert.deepEqual(res.headers.getSetCookie(), []);
    const cart = await reloadCart();
    assert.deepEqual([cart.products.length, cart.bundles.length, cart.mysteryBoxes.length, cart.addOns.length], [0, 1, 1, 1]);
  });

  test('clear only clears the cart cookie', async () => {
    await setCart({ products: [{ product: ids.bookOne }] });
    const res = await del('/clear');
    // res.ok('KEY') (string form): `data` before `message`.
    assertBody(res, 200, { statusCode: 200, status: 'CART_DELETE_SUCCESS', data: {}, message: t.CART_DELETE_SUCCESS });
    assert.deepEqual(res.headers.getSetCookie(), ['_CID=; Path=/; HttpOnly']);
    assert.equal((await reloadCart()).products.length, 1);
  });
});

describe('bundles', () => {
  test('adds a bundle and answers BUNDLE_ADD_SUCCESS', async () => {
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundle) }), 200, ok('BUNDLE_ADD_SUCCESS', true));
    assert.deepEqual(await lines('bundles', 'bundle'), [[String(cartIds.bundle), 1]]);
  });

  test('legacy: the same bundle can be added twice (the duplicate check compares a populated bundle)', async () => {
    await post('/add/bundle', { bundle: String(cartIds.bundle) });
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundle) }), 200, ok('BUNDLE_ADD_SUCCESS', true));
    assert.equal((await reloadCart()).bundles.length, 2);
  });

  test('more than 1 answers QUANTITY_LIMIT_BUNDLE; a deleted bundle BUNDLE_NOT_EXIST', async () => {
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundle), quantity: 2 }), 400, badRequest('QUANTITY_LIMIT_BUNDLE'));
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundleDeleted) }), 400, badRequest('BUNDLE_NOT_EXIST'));
  });

  test('a bundle with an out-of-stock book answers QUANTITY_OUT_OF_STOCK', async () => {
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundleOutOfStock) }), 400, badRequest('QUANTITY_OUT_OF_STOCK'));
  });

  test('a cart holding non-available books answers BUNDLE_ITEM_MISMATCH', async () => {
    await setCart({ products: [{ product: cartIds.bookPreOrder }] });
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundle) }), 400, badRequest('BUNDLE_ITEM_MISMATCH'));
  });

  test('legacy: a bundle whose book is already in the cart is still added (the check compares a populated book)', async () => {
    await setCart({ products: [{ product: cartIds.bundleBookA }] });
    assertBody(await post('/add/bundle', { bundle: String(cartIds.bundle) }), 200, ok('BUNDLE_ADD_SUCCESS', true));
  });

  test('removes a bundle; a deleted bundle answers BUNDLE_NOT_EXIST', async () => {
    await setCart({ bundles: [{ bundle: cartIds.bundle }, { bundle: cartIds.bundleDeleted }] });
    assertBody(await del(`/remove/bundle/${cartIds.bundle}`), 200, ok('CART_UPDATE_SUCCESS', true));
    assertBody(await del(`/remove/bundle/${cartIds.bundleDeleted}`), 400, badRequest('BUNDLE_NOT_EXIST'));
    assert.deepEqual(await lines('bundles', 'bundle'), [[String(cartIds.bundleDeleted), 1]]);
  });
});

describe('mystery boxes', () => {
  const preferences = { preferredAuthors: 'Test A', preferredGenres: 'Test G', favoriteBooks: 'Test F', ignoredBooks: 'Test I' };

  test('adds a box with preferences and answers CART_UPDATE_SUCCESS', async () => {
    assertBody(await post('/add/box', { box: String(cartIds.box), preferences }), 200, ok('CART_UPDATE_SUCCESS', true));
    const [box] = (await reloadCart()).mysteryBoxes;
    assert.equal(String(box.box), String(cartIds.box));
    assert.equal(box.quantity, 1);
    assert.deepEqual(box.toObject().preferences, preferences);
  });

  test('more than 1, or the same box again, answers QUANTITY_LIMIT_BOX', async () => {
    assertBody(await post('/add/box', { box: String(cartIds.box), quantity: 2 }), 400, badRequest('QUANTITY_LIMIT_BOX'));
    await post('/add/box', { box: String(cartIds.box) });
    assertBody(await post('/add/box', { box: String(cartIds.box) }), 400, badRequest('QUANTITY_LIMIT_BOX'));
  });

  test('a deleted box answers MYSTERY_BOX_NOT_EXIST', async () => {
    assertBody(await post('/add/box', { box: String(cartIds.boxDeleted) }), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
  });

  test('a cart holding non-available books answers BOX_ITEM_MISMATCH', async () => {
    await setCart({ products: [{ product: cartIds.bookPreOrder }] });
    assertBody(await post('/add/box', { box: String(cartIds.box) }), 400, badRequest('BOX_ITEM_MISMATCH'));
  });

  test('removes a box; a deleted box answers MYSTERY_BOX_NOT_EXIST', async () => {
    await setCart({ mysteryBoxes: [{ box: cartIds.box }] });
    assertBody(await del(`/remove/box/${cartIds.boxDeleted}`), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
    assertBody(await del(`/remove/box/${cartIds.box}`), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.equal((await reloadCart()).mysteryBoxes.length, 0);
  });
});

describe('add-ons', () => {
  test('adds a new add-on and answers data true; the model default makes the quantity 1', async () => {
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOn) }), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('addOns', 'addOn'), [[String(cartIds.addOn), 1]]);
  });

  test('adding an add-on already in the cart adds the quantities and answers the whole cart', async () => {
    await post('/add/addOn', { addOn: String(cartIds.addOn), quantity: 2 });
    const res = await post('/add/addOn', { addOn: String(cartIds.addOn), quantity: 3 });
    assertBody(res, 200, ok('ADD_ON_UPDATE_SUCCESS', await cartJson()));
    assert.deepEqual(await lines('addOns', 'addOn'), [[String(cartIds.addOn), 5]]);
  });

  test('limits: more than 5 new answers QUANTITY_LIMIT, more than 5 in total ADD_ON_ADD_QUANTITY_LIMIT', async () => {
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOn), quantity: 6 }), 400, badRequest('QUANTITY_LIMIT'));
    await post('/add/addOn', { addOn: String(cartIds.addOn), quantity: 5 });
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOn), quantity: 1 }), 400, badRequest('ADD_ON_ADD_QUANTITY_LIMIT'));
  });

  test('more than the stock answers INVALID_QUANTITY', async () => {
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOnLow), quantity: 4 }), 400, badRequest('INVALID_QUANTITY'));
    await post('/add/addOn', { addOn: String(cartIds.addOnLow), quantity: 2 });
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOnLow), quantity: 2 }), 400, badRequest('INVALID_QUANTITY'));
  });

  test('a deleted add-on answers ADD_ON_NOT_EXIST', async () => {
    assertBody(await post('/add/addOn', { addOn: String(cartIds.addOnDeleted) }), 400, badRequest('ADD_ON_NOT_EXIST'));
  });

  test('legacy: adding an add-on already in the cart without a quantity answers 500 (no default quantity)', async () => {
    await post('/add/addOn', { addOn: String(cartIds.addOn) });
    const res = await post('/add/addOn', { addOn: String(cartIds.addOn) });
    assert.equal(res.status, 500);
    assert.equal(res.body.status, 'SOME_ERROR_OCCURRED');
  });

  test('PUT /update/addOn/:id sets the quantity, with the same checks', async () => {
    await setCart({ addOns: [{ addOn: cartIds.addOn }, { addOn: cartIds.addOnLow }] });
    assertBody(await put(`/update/addOn/${cartIds.addOn}`, { quantity: 4 }), 200, ok('ADD_ON_UPDATE_SUCCESS', true));
    assertBody(await put(`/update/addOn/${cartIds.addOn}`, { quantity: 6 }), 400, badRequest('QUANTITY_LIMIT'));
    assertBody(await put(`/update/addOn/${cartIds.addOnLow}`, { quantity: 4 }), 400, badRequest('INVALID_QUANTITY'));
    assertBody(await put(`/update/addOn/${cartIds.addOnDeleted}`, { quantity: 1 }), 400, badRequest('ADD_ON_NOT_EXIST'));
    assert.deepEqual(await lines('addOns', 'addOn'), [[String(cartIds.addOn), 4], [String(cartIds.addOnLow), 1]]);
  });

  test('DELETE /remove/addOn/:addOnId removes it; a deleted add-on answers ADD_ON_NOT_EXIST', async () => {
    await setCart({ addOns: [{ addOn: cartIds.addOn }] });
    assertBody(await del(`/remove/addOn/${cartIds.addOnDeleted}`), 400, badRequest('ADD_ON_NOT_EXIST'));
    assertBody(await del(`/remove/addOn/${cartIds.addOn}`), 200, ok('CART_UPDATE_SUCCESS', true));
    assert.deepEqual(await lines('addOns', 'addOn'), []);
  });
});
