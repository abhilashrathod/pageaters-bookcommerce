const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, fillCart, loadOrderCatalog } = require('./helpers/fixtures/orders');
const payments = require('../src/adapters/payments');

// PLAN.md Phase 4 "Fix legacy bugs", sub-step a (orders: placement): one pending order per user (unique partial
// index, newest pending order) and a COD place refused while a Razorpay order exists. Compensation after a failed
// write: order-compensation.test.js; refunds: order-refunds.test.js.

const { badRequest, ok, serverError } = envelopes;
const GIFT = { isGift: false };
const PENDING_INDEX = 'one_pending_order_per_user';

const Order = () => mongoose.model('order');
const Cart = () => mongoose.model('cart');
const Book = () => mongoose.model('storeBook');

let api;
let shopper;
let address;
let cartCookie;

const post = (path, body) => api.request(path, { method: 'POST', body, cookie: cartCookie });
const attempt = () => post('/orders/attempt', { address: String(address._id) });
const placeCod = () => post('/orders/create', { method: 'cod', giftOptions: GIFT });
const placeOnline = () => post('/orders/create', { method: 'online', giftOptions: GIFT });

// One copy of Test Book One: 449 + 50 shipping = 499.
const attemptBook = async () => {
  await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
  assert.equal((await attempt()).status, 200);
  return Order().findOne({ userId: shopper.user._id, orderStatus: 'attempted' });
};

// Replaces model[method]: `fake(original, args)` decides what the matching calls do; other calls go through.
const intercept = (t, model, method, matches, fake) => {
  const original = model[method];
  t.mock.method(model, method, function (...args) {
    if (matches(...args)) return fake((...callArgs) => original.apply(this, callArgs), args);
    return original.apply(this, args);
  });
};

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  await loadOrderCatalog();
  shopper = await createUser();
  address = await createAddress(shopper.user);
  const cart = await Cart().findOne({ user: shopper.user._id });
  cartCookie = `${shopper.cookie}; _CID=${cart._id}`;
});

describe('one pending order per user', () => {
  test('a unique partial index on userId covers attempted and created orders only', async () => {
    const index = (await Order().collection.indexes()).find((entry) => entry.name === PENDING_INDEX);
    assert.deepEqual(
      [index.key, index.unique, index.partialFilterExpression],
      [{ userId: 1 }, true, { orderStatus: { $in: ['attempted', 'created'] } }],
    );

    await createOrder(shopper.user, { orderStatus: 'attempted' });
    await assert.rejects(createOrder(shopper.user, { orderStatus: 'created' }), { code: 11000 });
    await createOrder(shopper.user, { orderStatus: 'paid' });
    await createOrder(shopper.user, { orderStatus: 'confirmed' });
    assert.equal(await Order().countDocuments({ userId: shopper.user._id }), 3);
  });

  test('a first attempt that loses the race to another answers ORDER_PENDING_CONFLICT, not 500', async (t) => {
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    // The concurrent attempt inserts its pending order between this attempt's lookup and its insert.
    intercept(
      t,
      Order(),
      'create',
      () => true,
      async (original, args) => {
        await original({ ...args[0], orderId: 'OD-0000000001' });
        return original(...args);
      },
    );

    assertBody(await attempt(), 400, badRequest('ORDER_PENDING_CONFLICT'));
    assert.deepEqual(
      (await Order().find({ userId: shopper.user._id })).map((order) => order.orderId),
      ['OD-0000000001'],
    );

    t.mock.restoreAll();
    assertBody(await attempt(), 200, ok('ORDER_ADDRESS_SUCCESS', {}));
    assert.equal(await Order().countDocuments({ userId: shopper.user._id }), 1);
  });

  test('a duplicate key of another index is not mistaken for the pending-order conflict', async (t) => {
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    const duplicate = Object.assign(new Error('E11000 duplicate key error collection: orders index: other_unique'), {
      code: 11000,
      keyPattern: { orderId: 1 },
    });
    intercept(
      t,
      Order(),
      'create',
      () => true,
      () => Promise.reject(duplicate),
    );
    assertBody(await attempt(), 500, serverError);
  });

  test('concurrent first attempts leave one pending order and never answer 500', async () => {
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    const results = await Promise.all([attempt(), attempt(), attempt(), attempt()]);
    for (const res of results) {
      if (res.status !== 200) assertBody(res, 400, badRequest(res.body.status));
      assert.ok(['ORDER_ADDRESS_SUCCESS', 'ORDER_PENDING_CONFLICT', 'ORDER_INFO_ATTEMPT_FAILED'].includes(res.body.status));
    }
    assert.equal(await Order().countDocuments({ userId: shopper.user._id }), 1);
  });

  // Data from before the index (a database that held two pending orders): place and retrieve act on the newest.
  test('place and retrieve act on the most recently updated pending order', async () => {
    await Order().collection.dropIndex(PENDING_INDEX);
    try {
      await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
      const older = await createOrder(shopper.user, {
        orderStatus: 'created',
        razorOrderId: 'order_test_old',
        deliveryAddress: address._id,
      });
      const newer = await createOrder(shopper.user, { orderStatus: 'attempted', deliveryAddress: address._id });
      await Order().collection.updateOne({ _id: older._id }, { $set: { updatedAt: new Date(Date.now() - 60_000) } });

      assert.equal((await api.request('/orders/retrieve', { cookie: shopper.cookie })).body.data.orderId, newer.orderId);
      assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 499, orderId: newer.orderId }));
      assert.equal((await Order().findById(older._id)).orderStatus, 'created');
    } finally {
      await Order().deleteMany({});
      await Order().syncIndexes();
    }
  });
});

describe('COD while a Razorpay order exists', () => {
  test('is refused and changes nothing; starting checkout again allows it', async () => {
    const attempted = await attemptBook();
    const { razorOrderId } = (await placeOnline()).body.data;
    const stock = (await Book().findById(ids.bookOne)).inventory;

    assertBody(await placeCod(), 400, badRequest('ORDER_ONLINE_PAYMENT_PENDING'));
    const order = await Order().findById(attempted._id);
    assert.deepEqual([order.orderStatus, order.razorOrderId, order.payment], ['created', razorOrderId, null]);
    assert.equal((await Book().findById(ids.bookOne)).inventory, stock);

    const again = await attemptBook();
    assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 499, orderId: again.orderId }));
  });

  test('placing online again (a payment retry) is still allowed', async () => {
    await attemptBook();
    await placeOnline();
    assert.equal((await placeOnline()).status, 200);
    assert.equal(payments.list().length, 2);
  });
});
