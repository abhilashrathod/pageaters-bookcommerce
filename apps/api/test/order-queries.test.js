const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, loadOrderCatalog, orderIds } = require('./helpers/fixtures/orders');
const t = require('../src/locales/en.json');

// Order reads over HTTP: the shopper's order and order list, the admin list, lookup and search, and the analytics
// endpoints. Written against the legacy controller first; projections are pinned by their key lists.

const badRequest = (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} });
const serverError = {
  statusCode: 500,
  status: 'SOME_ERROR_OCCURRED',
  message: t.SOME_ERROR_OCCURRED,
  error: t.SOME_ERROR_OCCURRED,
  data: {},
};
const forbidden = { statusCode: 403, status: 'FORBIDDEN', message: t.FORBIDDEN, data: {}, error: t.FORBIDDEN };
const unauthorized = { statusCode: 401, status: 'UNAUTHORIZED', message: t.NO_AUTH_HEADER, data: {}, error: t.NO_AUTH_HEADER };
const ok = (status, data) => ({ statusCode: 200, status, message: t[status], data });

const assertBody = (res, status, body) => {
  assert.equal(res.status, status);
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};
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

  test('legacy: answers 500 for an order without a payment (orderPaymentInfo(null))', async () => {
    const order = await full({ payment: null });
    assertBody(await get(`/orders/getByUniqueId/${order.orderId}`, shopper.cookie), 500, serverError);
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
    await createOrder(shopper.user, { orderStatus: 'attempted' });
    await createOrder(shopper.user, { orderStatus: 'created' });
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
    await createOrder(shopper.user, { orderStatus: 'created' });
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

  test('legacy (security step): returns the raw Razorpay payment entity, payer contact included', async () => {
    const order = await createOrder(shopper.user, { payment: CARD_PAYMENT });
    const res = await get(`/orders/getById/${order._id}`);
    assert.deepEqual(res.body.data.payment, CARD_PAYMENT);
  });

  test('refuses an unknown id; a malformed id answers 500', async () => {
    assertBody(await get(`/orders/getById/${new mongoose.Types.ObjectId()}`), 400, badRequest('ORDER_NOT_EXIST'));
    assertBody(await get('/orders/getById/nope'), 500, serverError);
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

  test('legacy (security step): q is a raw regular expression', async () => {
    await createOrder(shopper.user, { orderId: 'OD-1234567890' });
    await createOrder(shopper.user, { orderId: 'OD-9999999999' });
    assert.equal((await get('/orders/search?q=^OD-.*0$')).body.data.length, 1);
    assertBody(await get('/orders/search?q=('), 500, serverError);
  });
});

describe('analytics (admin)', () => {
  beforeEach(async () => {
    await createOrder(shopper.user, { orderStatus: 'fulfilled', total: 499 });
    await createOrder(shopper.user, { orderStatus: 'fulfilled', total: 1000, products: [{ quantity: 3, product: ids.bookTwo }] });
  });

  test('legacy: best-selling always answers [] (matches `status`, compares dates as strings)', async () => {
    assertBody(await get('/orders/analytics/best-selling?startDate=2000-01-01&endDate=2100-01-01'), 200, ok('ORDER_LIST_SUCCESS', []));
    assertBody(await get('/orders/analytics/best-selling'), 200, ok('ORDER_LIST_SUCCESS', []));
  });

  test('legacy: revenue always answers [] (dates compared as strings)', async () => {
    assertBody(await get('/orders/analytics/revenue?startDate=2000-01-01&endDate=2100-01-01'), 200, ok('ORDER_LIST_SUCCESS', []));
    assertBody(await get('/orders/analytics/revenue'), 200, ok('ORDER_LIST_SUCCESS', []));
  });
});
