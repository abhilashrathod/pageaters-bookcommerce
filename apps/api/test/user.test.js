const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { pick } = require('lodash');
const { userSchema } = require('@pageaters/shared');

const { asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { addressFields, loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/users (admin customer views) over HTTP, written against the legacy controller before the service
// refactor. Since 7d every user is sent as the shared `userSchema` fields only (no password hash, salt, OTP,
// tokens or `razorPayCustId`) and search takes `q` as literal text; test/security-exposure.test.js pins the leaks.

const { badRequest, ok } = envelopes;

const User = () => mongoose.model('user');
// A user as the admin views send it: the `userSchema` fields, in that order.
const adminView = (doc) => pick(asJson(doc), Object.keys(userSchema.shape));

let api;
let admin;
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
  await loadStore();
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

describe('auth', () => {
  test('every route needs an ADMIN session', async () => {
    for (const route of [
      ['GET', '/users'],
      ['GET', '/users/search?q=test'],
      ['PUT', `/users/${shopper.user._id}`, {}],
      ['GET', `/users/${shopper.user._id}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /users', () => {
  test('pages USER accounts, userSchema fields only', async () => {
    const other = await createUser();
    const docs = (await User().find({ role: 'USER' })).map(adminView);
    const res = await api.request('/users?page=1&limit=10', { cookie: admin.cookie });
    assertBody(res, 200, ok('USER_LIST_SUCCESS', paged(docs, { totalDocs: 2, limit: 10, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
    assert.deepEqual(res.body.data.docs.map((u) => u.email), [shopper.user.email, other.user.email]);
    assert.equal(Object.hasOwn(res.body.data.docs[0], 'password'), false);
  });

  test('legacy: without page/limit answers no documents', async () => {
    const res = await api.request('/users', { cookie: admin.cookie });
    assert.deepEqual(res.body.data.docs, []);
    assert.equal(res.body.data.totalDocs, 1);
  });
});

describe('GET /users/search', () => {
  test('finds accounts of any role by email, case-insensitive, userSchema fields only', async () => {
    const res = await api.request(`/users/search?q=${encodeURIComponent(shopper.user.email.toUpperCase())}`, { cookie: admin.cookie });
    assertBody(res, 200, ok('USER_LIST_SUCCESS', [adminView(await User().findById(shopper.user._id))]));
  });

  test('7d: q is literal text (".*" and "(" match nothing here)', async () => {
    assertBody(await api.request('/users/search?q=.*', { cookie: admin.cookie }), 200, ok('USER_LIST_SUCCESS', []));
    assertBody(await api.request('/users/search?q=(', { cookie: admin.cookie }), 200, ok('USER_LIST_SUCCESS', []));
  });
});

describe('PUT /users/:id', () => {
  test('7d: updates the addressed user\'s profile text only and answers it as userSchema fields', async () => {
    const body = { fullName: 'Test Changed', gender: 'other', role: 'ADMIN', email: 'changed@example.com', storeCredit: 1000, password: 'x' };
    const res = await api.request(`/users/${shopper.user._id}`, { method: 'PUT', body, cookie: admin.cookie });
    const after = await User().findById(shopper.user._id);
    assertBody(res, 200, ok('USER_UPDATE_SUCCESS', adminView(after)));
    assert.deepEqual(
      { fullName: after.fullName, gender: after.gender, role: after.role, email: after.email, storeCredit: after.storeCredit, password: after.password },
      { fullName: 'Test Changed', gender: 'other', role: 'USER', email: shopper.user.email, storeCredit: shopper.user.storeCredit, password: shopper.user.password },
    );
    assert.equal((await User().findById(admin.user._id)).fullName, admin.user.fullName, 'no other account changes');
  });

  test('7d: an unknown id answers USER_NOT_FOUND', async () => {
    assertBody(await api.request(`/users/${new mongoose.Types.ObjectId()}`, { method: 'PUT', body: { fullName: 'Test X' }, cookie: admin.cookie }), 400, badRequest('USER_NOT_FOUND'));
  });
});

describe('GET /users/:id', () => {
  test("answers the account with its cart, addresses and orders (newest first)", async () => {
    const address = await mongoose.model('address').create({ userId: shopper.user._id, ...addressFields() });
    await mongoose.model('cart').updateOne(
      { user: shopper.user._id },
      { products: [{ quantity: 2, product: ids.bookOne }], bundles: [{ quantity: 1, bundle: storeIds.bundleOne }], mysteryBoxes: [{ quantity: 1, box: storeIds.boxOne }] },
    );
    const Order = mongoose.model('order');
    await Order.create({ userId: shopper.user._id, orderId: 'TEST-ORDER-1', orderStatus: 'paid', deliveryAddress: address._id, products: [{ quantity: 1, product: ids.bookTwo }], total: 499, createdAt: new Date('2026-01-01') });
    await Order.create({ userId: shopper.user._id, orderId: 'TEST-ORDER-2', orderStatus: 'created', total: 99, createdAt: new Date('2026-02-01') });

    const cart = await mongoose
      .model('cart')
      .findOne({ user: shopper.user._id })
      .populate([
        { path: 'products.product', select: 'bookId title poster author currentDiscount availability price', populate: { path: 'author', select: 'name avatar' } },
        { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
        { path: 'mysteryBoxes.box', select: 'boxId title images currentDiscount price' },
      ]);
    const orders = await Order.find({ userId: shopper.user._id })
      .select('orderId orderDate deliveryAddress orderStatus shipmentTrackingId products boxes bundles total')
      .sort({ createdAt: -1 })
      .populate([
        { path: 'deliveryAddress' },
        { path: 'products.product', select: 'bookId title poster author currentDiscount price', populate: { path: 'author', select: 'name avatar' } },
        { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
        { path: 'boxes.box', select: 'boxId title images currentDiscount price' },
      ]);

    const res = await api.request(`/users/${shopper.user._id}`, { cookie: admin.cookie });
    assertBody(
      res,
      200,
      ok('USER_LIST_SUCCESS', {
        user: adminView(await User().findById(shopper.user._id)),
        cart: asJson(cart),
        addresses: asJson(await mongoose.model('address').find({ userId: shopper.user._id })),
        orders: asJson(orders),
      }),
    );
    assert.deepEqual(res.body.data.orders.map((o) => o.orderId), ['TEST-ORDER-2', 'TEST-ORDER-1']);
  });

  test('answers nulls and empty lists for an unknown id', async () => {
    assertBody(await api.request(`/users/${new mongoose.Types.ObjectId()}`, { cookie: admin.cookie }), 200, ok('USER_LIST_SUCCESS', { user: null, cart: null, addresses: [], orders: [] }));
  });
});
