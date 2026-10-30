const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');

// Integration tests for /api/v1/favorites over HTTP against an in-memory MongoDB. They pin the legacy envelopes
// byte for byte (key order included, via the raw JSON), so the controller → service refactor can't change them.

const { badRequest, ok, unauthorized } = envelopes;
// Joi failures go through res.error(errorObject): `message` before `error`.
const invalidId = envelopes.badRequestObject('INVALID_ID');

const BOOK_ONE_LISTED = {
  _id: String(ids.bookOne),
  bookId: 'test-book-one',
  title: 'Test Book One',
  author: String(ids.authorA),
  ISBN: '9990000000001',
  editorsPick: false,
  bestSeller: false,
  newRelease: false,
  preOrder: false,
  poster: 'https://images.example.com/test-cover.png',
  inventory: 25,
  currentDiscount: 10,
  popularity: 1,
  price: 499,
};

const wishlistOf = async (user) =>
  (await mongoose.model('favorites').findOne({ userId: user._id }))?.wishlist.map(String);

let api;
let shopper;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  shopper = await createUser();
});

describe('auth and validation on every route', () => {
  const routes = [
    ['GET', '/favorites'],
    ['GET', `/favorites/${ids.bookOne}`],
    ['POST', '/favorites', { product: String(ids.bookOne) }],
    ['DELETE', `/favorites/${ids.bookOne}`],
  ];

  for (const [method, path, body] of routes) {
    test(`${method} ${path} without a session answers 401 NO_AUTH_HEADER`, async () => {
      assertBody(await api.request(path, { method, body }), 401, unauthorized('NO_AUTH_HEADER'));
    });

    test(`${method} ${path} with a bad token answers 401 INVALID_TOKEN`, async () => {
      assertBody(await api.request(path, { method, body, cookie: '_PID=not-a-jwt' }), 401, unauthorized('INVALID_TOKEN'));
    });
  }

  // The validator runs before the auth check, so a malformed id answers 400 even without a session.
  for (const [method, path, body] of [
    ['GET', '/favorites/not-an-id'],
    ['POST', '/favorites', { product: 'not-an-id' }],
    ['DELETE', '/favorites/not-an-id'],
  ]) {
    test(`${method} ${path} with a malformed id answers 400 INVALID_ID before auth`, async () => {
      assertBody(await api.request(path, { method, body }), 400, invalidId);
    });
  }

  test('an ADMIN session passes the USER guard', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await api.request('/favorites', { cookie: admin.cookie });
    assert.equal(res.status, 200);
  });
});

describe('GET /favorites', () => {
  test('lists an empty wishlist', async () => {
    const favorites = await mongoose.model('favorites').findOne({ userId: shopper.user._id });
    assertBody(await api.request('/favorites', { cookie: shopper.cookie }), 200, ok('WISH_LIST_SUCCESS', { _id: String(favorites._id), wishlist: [] }));
  });

  test('populates wishlist books with the list projection', async () => {
    await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: shopper.cookie });
    const res = await api.request('/favorites', { cookie: shopper.cookie });
    assert.equal(res.status, 200);
    assert.equal(JSON.stringify(res.body.data.wishlist), JSON.stringify([BOOK_ONE_LISTED]));
  });

  test('legacy: still lists a book soft-deleted after it was added', async () => {
    await mongoose.model('favorites').updateOne({ userId: shopper.user._id }, { wishlist: [ids.bookDeleted] });
    const res = await api.request('/favorites', { cookie: shopper.cookie });
    assert.deepEqual(res.body.data.wishlist.map((book) => book._id), [String(ids.bookDeleted)]);
  });

  test('answers data null for an account without a favourites document', async () => {
    const user = await createUser({ favorites: false });
    assertBody(await api.request('/favorites', { cookie: user.cookie }), 200, ok('WISH_LIST_SUCCESS', null));
  });
});

describe('GET /favorites/:product', () => {
  test('answers true for a book in the wishlist', async () => {
    await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: shopper.cookie });
    assertBody(await api.request(`/favorites/${ids.bookOne}`, { cookie: shopper.cookie }), 200, ok('SUCCESS', true));
  });

  test('answers false for a book not in the wishlist, or one that does not exist', async () => {
    for (const product of [ids.bookTwo, new mongoose.Types.ObjectId()]) {
      assertBody(await api.request(`/favorites/${product}`, { cookie: shopper.cookie }), 200, ok('SUCCESS', false));
    }
  });
});

describe('POST /favorites', () => {
  test('adds a book', async () => {
    const res = await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: shopper.cookie });
    assertBody(res, 200, ok('WISH_LIST_ADD_SUCCESS', {}));
    assert.deepEqual(await wishlistOf(shopper.user), [String(ids.bookOne)]);
  });

  test('refuses a book already in the wishlist', async () => {
    const add = () => api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: shopper.cookie });
    await add();
    assertBody(await add(), 400, badRequest('WISH_LIST_BOOK_PRESENT'));
    assert.deepEqual(await wishlistOf(shopper.user), [String(ids.bookOne)]);
  });

  test('refuses an unknown or soft-deleted book', async () => {
    for (const body of [{ product: String(new mongoose.Types.ObjectId()) }, { product: String(ids.bookDeleted) }]) {
      assertBody(await api.request('/favorites', { method: 'POST', body, cookie: shopper.cookie }), 400, badRequest('BOOK_NOT_EXIST'));
    }
    assert.deepEqual(await wishlistOf(shopper.user), []);
  });

  // Phase 4: the product id is required (was: a missing product reached the service and answered BOOK_NOT_EXIST).
  test('refuses a missing product id (validator, before auth)', async () => {
    assertBody(await api.request('/favorites', { method: 'POST', body: {}, cookie: shopper.cookie }), 400, invalidId);
    assertBody(await api.request('/favorites', { method: 'POST', body: {} }), 400, invalidId);
  });

  test('legacy: answers success but saves nothing for an account without a favourites document', async () => {
    const user = await createUser({ favorites: false });
    const res = await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: user.cookie });
    assertBody(res, 200, ok('WISH_LIST_ADD_SUCCESS', {}));
    assert.equal(await wishlistOf(user.user), undefined);
  });
});

describe('DELETE /favorites/:product', () => {
  test('removes a book', async () => {
    await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: shopper.cookie });
    assertBody(await api.request(`/favorites/${ids.bookOne}`, { method: 'DELETE', cookie: shopper.cookie }), 200, ok('WISH_LIST_DELETE_SUCCESS', {}));
    assert.deepEqual(await wishlistOf(shopper.user), []);
  });

  test('answers success for a book that is not in the wishlist', async () => {
    assertBody(await api.request(`/favorites/${ids.bookTwo}`, { method: 'DELETE', cookie: shopper.cookie }), 200, ok('WISH_LIST_DELETE_SUCCESS', {}));
  });

  test("only touches the caller's wishlist", async () => {
    const other = await createUser();
    await api.request('/favorites', { method: 'POST', body: { product: String(ids.bookOne) }, cookie: other.cookie });
    await api.request(`/favorites/${ids.bookOne}`, { method: 'DELETE', cookie: shopper.cookie });
    assert.deepEqual(await wishlistOf(other.user), [String(ids.bookOne)]);
  });
});
