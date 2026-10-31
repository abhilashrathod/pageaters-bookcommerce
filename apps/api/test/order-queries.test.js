const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, loadOrderCatalog, orderIds } = require('./helpers/fixtures/orders');
const t = require('../src/locales/en.json');

// Order reads over HTTP: the shopper's order and order list, the admin list, lookup and search, and the analytics
// endpoints. Written against the legacy controller first; projections are pinned by their key lists.

const { badRequest, badRequestObject, forbidden, ok } = envelopes;
const unauthorized = envelopes.unauthorized('NO_AUTH_HEADER');

const assertEnvelope = (res, status) => {
  assert.equal(res.status, 200);
  assert.equal(JSON.stringify(Object.keys(res.body)), JSON.stringify(['statusCode', 'status', 'message', 'data']));
  assert.equal(res.body.status, status);
  assert.equal(res.body.message, t[status]);
};
const keys = (object) => Object.keys(object).sort();

const CARD_PAYMENT = {
  id: 'pay_test_1',
  method: 'card',
  amount: 49900,
  email: 'payer@example.com',
  contact: '+919000000001',
  card: { name: 'Test Card', last4: '1111', network: 'Visa', type: 'credit' },
};

const Order = () => mongoose.model('order');

let api;
let admin;
let shopper;
let address;

const get = (path, cookie = admin.cookie) => api.request(path, { cookie });

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
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
  address = await createAddress(shopper.user);
});

describe('auth on order reads', () => {
  for (const path of ['/orders/list', '/orders/getByUniqueId/OD-1']) {
    test(`GET ${path} without a session answers 401`, async () => {
      assertBody(await api.request(path), 401, unauthorized);
    });
  }

  for (const path of [
    '/orders',
    '/orders/getById/200000000000000000000001',
    '/orders/search?q=OD',
    '/orders/analytics/best-selling',
    '/orders/analytics/revenue',
  ]) {
    test(`GET ${path} answers 403 to a shopper and 401 without a session`, async () => {
      assertBody(await get(path, shopper.cookie), 403, forbidden);
      assertBody(await api.request(path), 401, unauthorized);
    });
  }
});

describe('GET /orders/getByUniqueId/:uniqueId', () => {
  const full = (overrides) =>
    createOrder(shopper.user, {
      deliveryAddress: address._id,
      payment: CARD_PAYMENT,
      bundles: [{ quantity: 1, price: 799, discount: 20, total: 639.2, bundle: orderIds.bundleOne }],
      boxes: [{ quantity: 1, price: 999, discount: 5, total: 949.05, box: orderIds.boxOne }],
      addOns: [{ quantity: 1, price: 99, discount: 15, total: 84.15, addOn: orderIds.addOnOne }],
      orderHistory: [{ title: 'paid', description: 'Paid', time: '2026-01-15T10:00:00.000Z' }],
      ...overrides,
    });

  test("returns the shopper's order with the detail projection and a payment summary", async () => {
    const order = await full();
    const res = await get(`/orders/getByUniqueId/${order.orderId}`, shopper.cookie);
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    const { data } = res.body;
    // toObject() (for the payment summary) drops the `id` virtual.
    assert.deepEqual(keys(data), [
      '_id',
      'addOns',
      'boxes',
      'bundles',
      'deliveryAddress',
      'giftOptions',
      'orderDate',
      'orderHistory',
      'orderId',
      'orderStatus',
      'payment',
      'products',
      'shipmentTrackingId',
      'shipping',
      'storeCredit',
      'subTotal',
      'total',
    ]);
    assert.equal(JSON.stringify(data.payment), JSON.stringify({ method: 'card', name: 'Test Card', last4: '1111', network: 'Visa' }));
    assert.equal(data.deliveryAddress.pinCode, '100001');
    assert.deepEqual(keys(data.products[0].product), ['_id', 'author', 'bookId', 'currentDiscount', 'poster', 'price', 'title']);
    assert.deepEqual(keys(data.bundles[0].bundle), ['_id', 'bundleId', 'bundledBooks', 'currentDiscount', 'poster', 'price', 'title']);
    assert.deepEqual(keys(data.boxes[0].box), ['_id', 'boxId', 'currentDiscount', 'images', 'price', 'title']);
    assert.deepEqual(keys(data.addOns[0].addOn), ['_id', 'currentDiscount', 'name', 'poster', 'price']);
  });

  const SUMMARIES = [
    [
      { method: 'netbanking', bank: 'TESTBANK' },
      { method: 'netbanking', bank: 'TESTBANK' },
    ],
    [
      { method: 'upi', vpa: 'test@upi' },
      { method: 'upi', upi_id: 'test@upi' },
    ],
    [
      { method: 'wallet', wallet: 'testwallet' },
      { method: 'wallet', wallet: 'testwallet' },
    ],
    [
      { method: 'emi', emi: { issuer: 'TESTBANK', rate: 1200, duration: 6 } },
      { method: 'emi', name: 'TESTBANK', last4: 1200, network: 6 },
    ],
    [{ method: 'cod' }, { method: 'cod' }],
  ];
  for (const [payment, summary] of SUMMARIES) {
    test(`summarises a '${payment.method}' payment`, async () => {
      const order = await full({ payment });
      const res = await get(`/orders/getByUniqueId/${order.orderId}`, shopper.cookie);
      assert.equal(JSON.stringify(res.body.data.payment), JSON.stringify(summary));
    });
  }

  test('drops the payment of an unknown method', async () => {
    const order = await full({ payment: { method: 'paylater' } });
    const res = await get(`/orders/getByUniqueId/${order.orderId}`, shopper.cookie);
    assert.equal(res.status, 200);
    assert.equal(Object.hasOwn(res.body.data, 'payment'), false);
  });

  // Phase 4 legacy bugs (b): legacy answered 500 (orderPaymentInfo(null)).
  test('answers an order without a payment with payment: null', async () => {
    const order = await full({ payment: null });
    const res = await get(`/orders/getByUniqueId/${order.orderId}`, shopper.cookie);
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    assert.equal(res.body.data.orderId, order.orderId);
    assert.equal(res.body.data.payment, null);
  });

  test("refuses another user's order and an unknown order", async () => {
    const other = await createUser();
    const order = await createOrder(other.user, { payment: { method: 'cod' } });
    for (const uniqueId of [order.orderId, 'OD-0000000000']) {
      assertBody(await get(`/orders/getByUniqueId/${uniqueId}`, shopper.cookie), 400, badRequest('ORDER_NOT_EXIST'));
    }
  });
});

describe('GET /orders/list', () => {
  test("lists the shopper's placed orders, newest first, without attempted or created ones", async () => {
    const first = await createOrder(shopper.user, { orderStatus: 'confirmed' });
    // One pending order per user (unique index): attempted here, created at the end.
    const pending = await createOrder(shopper.user, { orderStatus: 'attempted' });
    const second = await createOrder(shopper.user, { orderStatus: 'cancelled', deliveryAddress: address._id });
    const other = await createUser();
    await createOrder(other.user, { orderStatus: 'paid' });

    const res = await get('/orders/list', shopper.cookie);
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    assert.deepEqual(
      res.body.data.map((order) => order.orderId),
      [second.orderId, first.orderId],
    );
    // Populated paths (addOns) join the projection.
    assert.deepEqual(keys(res.body.data[0]), [
      '_id',
      'addOns',
      'boxes',
      'bundles',
      'deliveryAddress',
      'id',
      'orderDate',
      'orderId',
      'orderStatus',
      'products',
      'shipmentTrackingId',
      'total',
    ]);
    assert.equal(res.body.data[0].deliveryAddress.city, 'Test City');

    await mongoose.model('order').updateOne({ _id: pending._id }, { $set: { orderStatus: 'created' } });
    assert.deepEqual(
      (await get('/orders/list', shopper.cookie)).body.data.map((order) => order.orderId),
      [second.orderId, first.orderId],
    );
  });

  test('answers an empty list', async () => {
    assertBody(await get('/orders/list', shopper.cookie), 200, ok('ORDER_LIST_SUCCESS', []));
  });
});

describe('GET /orders (admin)', () => {
  test('pages placed orders, newest update first, with the buyer and address', async () => {
    const older = await createOrder(shopper.user, { orderStatus: 'paid', deliveryAddress: address._id });
    const newer = await createOrder(shopper.user, { orderStatus: 'shipped' });
    await createOrder(shopper.user, { orderStatus: 'attempted' });
    // One pending order per user (unique index): the created one belongs to another shopper.
    await createOrder((await createUser()).user, { orderStatus: 'created' });
    await mongoose.model('order').updateOne({ _id: newer._id }, { $set: { total: 500 } });

    const res = await get('/orders?page=1&limit=10');
    assertEnvelope(res, 'CART_LIST_SUCCESS');
    const { data } = res.body;
    assert.equal(
      JSON.stringify(Object.keys(data)),
      JSON.stringify([
        'docs',
        'totalDocs',
        'limit',
        'totalPages',
        'page',
        'pagingCounter',
        'hasPrevPage',
        'hasNextPage',
        'prevPage',
        'nextPage',
      ]),
    );
    assert.deepEqual(
      data.docs.map((order) => order.orderId),
      [newer.orderId, older.orderId],
    );
    assert.deepEqual(keys(data.docs[1]), [
      '_id',
      'addOns',
      'boxes',
      'bundles',
      'deliveryAddress',
      'id',
      'orderDate',
      'orderId',
      'orderStatus',
      'products',
      'total',
      'userId',
    ]);
    assert.deepEqual(keys(data.docs[1].userId), ['_id', 'contactNo', 'email', 'fullName', 'id']);
    assert.deepEqual(keys(data.docs[1].products[0].product), ['_id', 'bookId', 'currentDiscount', 'id', 'price', 'title']);
    assert.deepEqual([data.totalDocs, data.limit, data.page], [2, 10, 1]);
  });

  test('filters by status', async () => {
    await createOrder(shopper.user, { orderStatus: 'paid' });
    const shipped = await createOrder(shopper.user, { orderStatus: 'shipped' });
    const res = await get('/orders?page=1&limit=10&status=shipped');
    assert.deepEqual(
      res.body.data.docs.map((order) => order.orderId),
      [shipped.orderId],
    );
  });

  test('a status filter cannot reach attempted or created orders', async () => {
    await createOrder(shopper.user, { orderStatus: 'attempted' });
    const res = await get('/orders?page=1&limit=10&status=attempted');
    assert.equal(res.body.data.totalDocs, 0);
  });

  test('legacy: without page and limit answers no documents', async () => {
    await createOrder(shopper.user, { orderStatus: 'paid' });
    const res = await get('/orders');
    assertEnvelope(res, 'CART_LIST_SUCCESS');
    assert.deepEqual(res.body.data.docs, []);
  });
});

describe('GET /orders/getById/:id (admin)', () => {
  test('returns any order with populated items', async () => {
    const order = await createOrder(shopper.user, {
      deliveryAddress: address._id,
      payment: CARD_PAYMENT,
      boxes: [{ quantity: 1, box: orderIds.boxOne }],
    });
    const res = await get(`/orders/getById/${order._id}`);
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    assert.equal(res.body.data.orderId, order.orderId);
    assert.equal(String(res.body.data.userId), String(shopper.user._id));
    assert.deepEqual(keys(res.body.data.boxes[0].box), ['_id', 'boxId', 'currentDiscount', 'id', 'images', 'price', 'title', 'weight']);
    assert.equal(res.body.data.products[0].product.author.name, 'Test Author A');
  });

  test('7d: returns the payment summary, never the Razorpay entity (payer contact, card details)', async () => {
    const order = await createOrder(shopper.user, { payment: CARD_PAYMENT });
    const res = await get(`/orders/getById/${order._id}`);
    assert.equal(JSON.stringify(res.body.data.payment), JSON.stringify({ method: 'card', name: 'Test Card', last4: '1111', network: 'Visa' }));
  });

  test('refuses an unknown id and a malformed one', async () => {
    assertBody(await get(`/orders/getById/${new mongoose.Types.ObjectId()}`), 400, badRequest('ORDER_NOT_EXIST'));
    assertBody(await get('/orders/getById/nope'), 400, badRequest('INVALID_ID'));
  });
});

describe('GET /orders/search (admin)', () => {
  test('matches order ids case-insensitively, any stage', async () => {
    const order = await createOrder(shopper.user, { orderId: 'OD-1234567890', orderStatus: 'attempted', deliveryAddress: address._id });
    await createOrder(shopper.user, { orderId: 'OD-9999999999' });
    const res = await get('/orders/search?q=od-12345');
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    assert.deepEqual(
      res.body.data.map((o) => o.orderId),
      [order.orderId],
    );
    assert.deepEqual(keys(res.body.data[0].userId), ['_id', 'contactNo', 'email', 'fullName', 'id']);
  });

  test('7d: q is literal text, not a regular expression', async () => {
    await createOrder(shopper.user, { orderId: 'OD-1234567890' });
    await createOrder(shopper.user, { orderId: 'OD-9999999999' });
    assertBody(await get('/orders/search?q=^OD-.*0$'), 200, ok('ORDER_LIST_SUCCESS', []));
    assertBody(await get('/orders/search?q=('), 200, ok('ORDER_LIST_SUCCESS', []));
  });
});

// Phase 4 legacy bugs (b): legacy always answered [] (best-selling matched `status`; both compared the dates as
// strings) and took any startDate/endDate into the aggregation unchecked.
describe('analytics (admin)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const at = (days) => new Date(Date.UTC(2026, 9, 1) + days * DAY);
  const range = (from, to) => `startDate=${encodeURIComponent(at(from).toISOString())}&endDate=${encodeURIComponent(at(to).toISOString())}`;
  // createdAt is set by Mongoose's timestamps; backdate it directly.
  const orderOn = async (days, overrides) => {
    const order = await createOrder(shopper.user, { orderStatus: 'fulfilled', ...overrides });
    await Order().collection.updateOne({ _id: order._id }, { $set: { createdAt: at(days) } });
    return order;
  };

  beforeEach(async () => {
    await orderOn(0, { total: 499 });
    await orderOn(5, { total: 1000, products: [{ quantity: 3, product: ids.bookTwo }] });
    await orderOn(9, { total: 2000, products: [{ quantity: 2, product: ids.bookOne }] });
    // Not counted: another stage, or outside the range (the end is exclusive).
    await orderOn(1, { orderStatus: 'shipped', total: 5000, products: [{ quantity: 50, product: ids.bookTwo }] });
    await orderOn(10, { total: 7000, products: [{ quantity: 70, product: ids.bookTwo }] });
    await orderOn(-1, { total: 9000, products: [{ quantity: 90, product: ids.bookTwo }] });
  });

  test('best-selling ranks the books of fulfilled orders created in [startDate, endDate)', async () => {
    const res = await get(`/orders/analytics/best-selling?${range(0, 10)}`);
    assertEnvelope(res, 'ORDER_LIST_SUCCESS');
    assert.deepEqual(res.body.data, [
      { totalQuantity: 3, bookDetails: { _id: String(ids.bookOne), title: 'Test Book One', author: String(ids.authorA) } },
      { totalQuantity: 3, bookDetails: { _id: String(ids.bookTwo), title: 'Test Book Two', author: String(ids.authorB) } },
    ]);
  });

  test('revenue sums the totals of fulfilled orders created in [startDate, endDate)', async () => {
    assertBody(await get(`/orders/analytics/revenue?${range(0, 10)}`), 200, ok('ORDER_LIST_SUCCESS', [{ totalRevenue: 3499 }]));
    assertBody(await get(`/orders/analytics/revenue?${range(4, 6)}`), 200, ok('ORDER_LIST_SUCCESS', [{ totalRevenue: 1000 }]));
    assertBody(await get(`/orders/analytics/revenue?${range(20, 30)}`), 200, ok('ORDER_LIST_SUCCESS', []));
  });

  test('refuses a missing, malformed, empty or reversed range, and operators', async () => {
    const start = encodeURIComponent(at(0).toISOString());
    const end = encodeURIComponent(at(10).toISOString());
    for (const query of [
      '',
      `startDate=${start}`,
      `startDate=2026-10-01&endDate=2026-10-11`,
      `startDate=${start}&endDate=tomorrow`,
      `startDate=${start}&endDate=${start}`,
      range(10, 0),
      `startDate=${start}&endDate[$gt]=`,
      `startDate[$exists]=true&endDate=${end}`,
    ]) {
      for (const report of ['best-selling', 'revenue']) {
        const res = await get(`/orders/analytics/${report}?${query}`);
        assertBody(res, 400, badRequestObject('ORDER_ANALYTICS_INVALID_RANGE'));
      }
    }
  });
});
