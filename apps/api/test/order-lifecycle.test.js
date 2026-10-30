const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureMails, createUser, envelopes, eventually, ids, loadCatalog, mockVendorCall, startTestApp } = require('./helpers');
const { createAddress, createOrder, loadOrderCatalog, orderIds, razorpaySignature } = require('./helpers/fixtures/orders');
const { ORDER_STAGES } = require('../src/constants/enums');

// Order status transitions over HTTP: admin ship / deliver / cancel, shopper cancel / return / replace, return and
// replacement shipments, the Razorpay refund webhook and the Delhivery shipment. Each transition is tried from every
// stage, so the allowed and refused source stages are pinned. Written against the legacy controller first.

const { badRequest, badRequestObject, forbidden, ok, okString, serverError } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const STAGES = Object.values(ORDER_STAGES);

const Order = () => mongoose.model('order');
const Book = () => mongoose.model('storeBook');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

let api;
let admin;
let shopper;
let address;

const call = (method, path, body, cookie = admin.cookie) => api.request(path, { method, body, cookie });

const orderFor = (overrides = {}) =>
  createOrder(shopper.user, {
    deliveryAddress: address._id,
    products: [{ quantity: 2, price: 499, discount: 10, productTotal: 898.2, product: ids.bookOne }],
    bundles: [{ quantity: 1, price: 799, discount: 20, total: 639.2, bundle: orderIds.bundleOne }],
    ...overrides,
  });

const inventories = async () =>
  (
    await Book()
      .find({ _id: { $in: [ids.bookOne, ids.bookTwo] } })
      .sort({ _id: 1 })
  ).map((b) => b.inventory);

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

describe('admin-only lifecycle routes refuse a shopper', () => {
  const id = '200000000000000000000001';
  for (const [method, path] of [
    ['POST', '/orders/ship'],
    ['PATCH', `/orders/ship/${id}/complete`],
    ['PATCH', `/orders/return/${id}/shipment/${id}`],
    ['PATCH', `/orders/return/${id}/shipment/${id}/close`],
    ['PATCH', `/orders/replace/${id}/shipment/${id}/close`],
    ['POST', `/orders/admin-cancel/${id}`],
  ]) {
    test(`${method} ${path} answers 403 to a shopper`, async () => {
      assertBody(await call(method, path, {}, shopper.cookie), 403, forbidden);
    });
  }
});

describe('POST /orders/ship', () => {
  test('ships a paid order: tracking id, history, e-mail and the populated order', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    const mails = captureMails();
    const res = await call('POST', '/orders/ship', { orderId: String(order._id), shipmentTrackingId: 'TRACK-1' });
    assert.equal(res.status, 200);
    assert.equal(JSON.stringify(Object.keys(res.body)), JSON.stringify(['statusCode', 'status', 'message', 'data']));
    assert.equal(res.body.status, 'ORDER_UPDATE_SUCCESS');
    const { data } = res.body;
    assert.equal(data.orderStatus, 'shipped');
    assert.equal(data.shipmentTrackingId, 'TRACK-1');
    assert.equal(
      JSON.stringify(data.userId),
      JSON.stringify({
        _id: String(shopper.user._id),
        fullName: shopper.user.fullName,
        email: shopper.user.email,
        contactNo: shopper.user.contactNo,
        id: String(shopper.user._id),
      }),
    );
    assert.equal(data.deliveryAddress.addressLine1, address.addressLine1);
    assert.deepEqual(
      data.orderHistory.map((entry) => entry.title),
      ['shipped'],
    );

    const [mail] = await mails.wait(1);
    assert.equal(mail.to, shopper.user.email);
    assert.equal(mail.subject, `Order #${order.orderId} is Shipped - Pageaters`);
    assert.match(mail.html, new RegExp(order.orderId));
  });

  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed'].includes(stage);
    test(`${allowed ? 'ships' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const mails = captureMails();
      const res = await call('POST', '/orders/ship', { orderId: String(order._id), shipmentTrackingId: 'TRACK-1' });
      if (allowed) {
        assert.equal(res.status, 200);
        await mails.wait(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      }
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'shipped' : stage);
    });
  }
});

describe('PATCH /orders/ship/:id/complete', () => {
  for (const stage of STAGES) {
    const allowed = stage === 'shipped';
    test(`${allowed ? 'delivers' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const mails = captureMails();
      const res = await call('PATCH', `/orders/ship/${order._id}/complete`);
      if (allowed) {
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ORDER_UPDATE_SUCCESS');
        assert.equal(res.body.data.orderStatus, 'fulfilled');
        assert.deepEqual(
          res.body.data.orderHistory.map((entry) => entry.title),
          ['fulfilled'],
        );
        const [mail] = await mails.wait(1);
        assert.equal(mail.subject, `Your Order #${order.orderId} Is Delivered! - Pageaters`);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      }
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'fulfilled' : stage);
    });
  }
});

describe('POST /orders/cancel/:uniqueId (shopper)', () => {
  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed'].includes(stage);
    const refusal = stage === 'shipped' ? 'ORDER_CANCEL_INVALID' : 'ORDER_INFO_ATTEMPT_FAILED';
    test(`${allowed ? 'cancels' : `refuses (${refusal})`} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const res = await call(
        'POST',
        `/orders/cancel/${order.orderId}`,
        { reason: 'Changed mind', comments: 'Test comment' },
        shopper.cookie,
      );
      if (allowed) assertBody(res, 200, ok('ORDER_CANCEL_SUCCESS', {}));
      else assertBody(res, 400, badRequest(refusal));
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'cancelled' : stage);
    });
  }

  test('records the request and history, and puts the stock back (bundled books too)', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    await call('POST', `/orders/cancel/${order.orderId}`, { reason: 'Changed mind', comments: 'Test comment' }, shopper.cookie);
    const cancelled = await Order().findById(order._id);
    assert.deepEqual(
      cancelled.orderHistory.map((entry) => [entry.title, entry.description]),
      [['cancelled', 'Order cancelled by customer.']],
    );
    const [request] = cancelled.requests;
    assert.deepEqual(
      [request.type, request.status, request.info.reason, request.info.comments, request.books.length, request.bundles.length],
      ['cancel', 'open', 'Changed mind', 'Test comment', 0, 0],
    );
    assert.deepEqual(
      await eventually(async () => {
        const values = await inventories();
        return values[0] === 28 && values[1] === 26 ? values : undefined;
      }),
      [28, 26],
    );
  });

  test("refuses another user's order", async () => {
    const other = await createUser();
    const order = await createOrder(other.user, { orderStatus: 'paid' });
    assertBody(await call('POST', `/orders/cancel/${order.orderId}`, {}, shopper.cookie), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });
});

describe('POST /orders/admin-cancel/:id', () => {
  const cancel = (order, body = {}) =>
    call('POST', `/orders/admin-cancel/${order._id}`, {
      uniqueId: order.orderId,
      userId: String(shopper.user._id),
      reason: 'Out of stock',
      notify: true,
      ...body,
    });

  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed', 'shipped'].includes(stage);
    test(`${allowed ? 'cancels' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const res = await cancel(order);
      if (allowed) assertBody(res, 200, ok('ORDER_CANCEL_SUCCESS', {}));
      else assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'cancelled' : stage);
    });
  }

  test('logs the reason as history, records no request and puts the stock back', async () => {
    const order = await orderFor({ orderStatus: 'shipped' });
    await cancel(order);
    const cancelled = await Order().findById(order._id);
    assert.deepEqual(
      cancelled.orderHistory.map((entry) => [entry.title, entry.description]),
      [['cancelled', 'Out of stock']],
    );
    assert.equal(cancelled.requests.length, 0);
    assert.deepEqual(
      await eventually(async () => {
        const values = await inventories();
        return values[0] === 28 && values[1] === 26 ? values : undefined;
      }),
      [28, 26],
    );
  });

  test('legacy: finds the order by uniqueId and userId from the body, not by the :id in the path', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    // Phase 4: the shared contract requires uniqueId and userId in the body (was: the service found no order).
    const res = await call('POST', `/orders/admin-cancel/${order._id}`, { reason: 'Out of stock' });
    assertBody(res, 400, badRequestObject('INVALID_REQUEST'));
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
    const wrongUser = await cancel(order, { userId: String(admin.user._id) });
    assertBody(wrongUser, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });
});

describe('POST /orders/return/:uniqueId (return and replace requests)', () => {
  const request = (order, type = 'return') =>
    call(
      'POST',
      `/orders/return/${order.orderId}`,
      { type, reason: 'Damaged', comments: 'Torn cover', books: [String(ids.bookOne)], bundles: [] },
      shopper.cookie,
    );

  for (const stage of STAGES) {
    const allowed = stage === 'fulfilled';
    test(`${allowed ? 'accepts' : 'refuses'} a return for an order in stage '${stage}'`, async () => {
      const order = await orderFor({
        orderStatus: stage,
        orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(1) }],
      });
      const mails = captureMails();
      const res = await request(order);
      if (allowed) {
        assertBody(res, 200, ok('ORDER_RETURN_SUCCESS', {}));
        await mails.wait(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      }
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'returned' : stage);
    });
  }

  test('a return records the request, the history and sends the request e-mail', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(6) }],
    });
    const mails = captureMails();
    await request(order);
    const returned = await Order().findById(order._id);
    assert.deepEqual(
      returned.orderHistory.map((entry) => entry.title),
      ['fulfilled', 'returned'],
    );
    const [req] = returned.requests;
    assert.deepEqual(
      [req.type, req.status, req.info.reason, req.info.comments, [...req.books], [...req.bundles]],
      ['return', 'open', 'Damaged', 'Torn cover', [String(ids.bookOne)], []],
    );
    const [mail] = await mails.wait(1);
    assert.equal(mail.subject, `Return Request is Raised for Order #${order.orderId} - Pageaters`);
  });

  test('a replace request moves the order to replacement', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(1) }],
    });
    const mails = captureMails();
    assertBody(await request(order, 'replace'), 200, ok('ORDER_RETURN_SUCCESS', {}));
    const replaced = await Order().findById(order._id);
    assert.equal(replaced.orderStatus, 'replacement');
    assert.deepEqual(
      replaced.orderHistory.map((entry) => entry.title),
      ['fulfilled', 'replacement'],
    );
    const [mail] = await mails.wait(1);
    assert.equal(mail.subject, `Replace Request is Raised for Order #${order.orderId} - Pageaters`);
  });

  test('legacy: after 7 days answers 200 ORDER_RETURN_PERIOD_LAPSED and changes nothing', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(8) }],
    });
    assertBody(await request(order), 200, okString('ORDER_RETURN_PERIOD_LAPSED'));
    const unchanged = await Order().findById(order._id);
    assert.equal(unchanged.orderStatus, 'fulfilled');
    assert.equal(unchanged.requests.length, 0);
  });

  // Phase 4: the validator refuses a missing or unknown type (was: an open request and an empty history entry were
  // saved, then the e-mail threw: 500).
  test('refuses a missing or unknown type, and changes nothing', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(1) }],
    });
    for (const body of [{ reason: 'Damaged' }, { type: 'cancel' }, { type: 'return', reason: 'r'.repeat(501) }, { type: 'return', books: ['nope'] }]) {
      const res = await call('POST', `/orders/return/${order.orderId}`, body, shopper.cookie);
      assertBody(res, 400, badRequestObject(body.books ? 'INVALID_ID' : 'ORDER_INFO_ATTEMPT_FAILED'));
    }
    const saved = await Order().findById(order._id);
    assert.equal(saved.orderStatus, 'fulfilled');
    assert.equal(saved.requests.length, 0);
    assert.deepEqual(
      saved.orderHistory.map((entry) => entry.title),
      ['fulfilled'],
    );
  });

  test('refuses a malformed order id and unknown keys', async () => {
    const order = await orderFor({ orderStatus: 'fulfilled' });
    assertBody(await call('POST', '/orders/return/OD-1', { type: 'return' }, shopper.cookie), 400, badRequestObject('ORDER_INFO_ATTEMPT_FAILED'));
    const res = await call('POST', `/orders/return/${order.orderId}`, { type: 'return', orderStatus: 'returned' }, shopper.cookie);
    assertBody(res, 400, badRequestObject('INVALID_REQUEST'));
  });

  test("refuses another user's order", async () => {
    const other = await createUser();
    const order = await createOrder(other.user, { orderStatus: 'fulfilled', orderHistory: [{ title: 'fulfilled', time: daysAgo(1) }] });
    assertBody(await request(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  });
});

describe('return and replacement shipments (admin)', () => {
  const withRequest = (stage, type) =>
    orderFor({ orderStatus: stage, requests: [{ type, date: daysAgo(1), status: 'open', info: { reason: 'Damaged' } }] });

  for (const stage of STAGES) {
    const next = { returned: 'return in progress', replacement: 'replacement in progress' }[stage];
    test(`${next ? 'aligns' : 'refuses'} a pickup for an order in stage '${stage}'`, async () => {
      const order = await withRequest(stage, 'return');
      const mails = captureMails();
      const res = await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-1' });
      if (next) {
        assertBody(res, 200, ok('ORDER_UPDATE_SUCCESS', {}));
        await mails.wait(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      }
      assert.equal((await Order().findById(order._id)).orderStatus, next ?? stage);
    });
  }

  test('aligning a return sets the tracking id on the order and the request, and e-mails the shopper', async () => {
    const order = await withRequest('returned', 'return');
    const mails = captureMails();
    await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-1' });
    const aligned = await Order().findById(order._id);
    assert.equal(aligned.shipmentTrackingId, 'PICKUP-1');
    assert.deepEqual([aligned.requests[0].status, aligned.requests[0].shipment], ['in progress', 'PICKUP-1']);
    assert.deepEqual(
      aligned.orderHistory.map((entry) => entry.title),
      ['return in progress'],
    );
    const [mail] = await mails.wait(1);
    assert.equal(mail.subject, `Return is Aligned for Order #${order.orderId} - Pageaters`);
  });

  test('aligning a replacement e-mails "Replacement is Aligned"', async () => {
    const order = await withRequest('replacement', 'replace');
    const mails = captureMails();
    await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-2' });
    const [mail] = await mails.wait(1);
    assert.equal(mail.subject, `Replacement is Aligned for Order #${order.orderId} - Pageaters`);
  });

  test('legacy: an unknown request id answers 200 and changes nothing (but still e-mails)', async () => {
    const order = await withRequest('returned', 'return');
    const mails = captureMails();
    assertBody(
      await call('PATCH', `/orders/return/${order._id}/shipment/${new mongoose.Types.ObjectId()}`, { shipment: 'X' }),
      200,
      ok('ORDER_UPDATE_SUCCESS', {}),
    );
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');
    await mails.wait(1);
  });

  for (const stage of STAGES) {
    const allowed = stage === 'return in progress';
    test(`close return: ${allowed ? 'closes' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await withRequest(stage, 'return');
      const res = await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}/close`);
      if (allowed) assertBody(res, 200, ok('ORDER_UPDATE_SUCCESS', {}));
      else assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      // Legacy: a closed return goes back to 'returned' (the refund webhook moves it on).
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'returned' : stage);
    });
  }

  test('closing a return clears the tracking id and closes the request', async () => {
    const order = await orderFor({
      orderStatus: 'return in progress',
      shipmentTrackingId: 'PICKUP-1',
      requests: [{ type: 'return', status: 'in progress', shipment: 'PICKUP-1' }],
    });
    await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}/close`);
    const closed = await Order().findById(order._id);
    assert.deepEqual([closed.shipmentTrackingId, closed.requests[0].status, closed.requests[0].shipment], ['', 'closed', '']);
    assert.deepEqual(
      closed.orderHistory.map((entry) => entry.title),
      ['Return Success'],
    );
  });

  for (const stage of STAGES) {
    const allowed = stage === 'replacement in progress';
    test(`close replacement: ${allowed ? 'closes' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await withRequest(stage, 'replace');
      const res = await call('PATCH', `/orders/replace/${order._id}/shipment/${order.requests[0]._id}/close`);
      if (allowed) assertBody(res, 200, ok('ORDER_UPDATE_SUCCESS', {}));
      else assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'fulfilled' : stage);
    });
  }

  test('closing a replacement logs "Replacement Success" and closes the request', async () => {
    const order = await orderFor({
      orderStatus: 'replacement in progress',
      requests: [{ type: 'replace', status: 'in progress', shipment: 'S' }],
    });
    await call('PATCH', `/orders/replace/${order._id}/shipment/${order.requests[0]._id}/close`);
    const closed = await Order().findById(order._id);
    assert.deepEqual([closed.requests[0].status, closed.orderHistory.map((entry) => entry.title)], ['closed', ['Replacement Success']]);
  });
});

describe('POST /orders/refund/processed (Razorpay refund webhook)', () => {
  const refundEvent = (orderId = 'order_test_9') => ({
    event: 'refund.processed',
    payload: { payment: { entity: { id: 'pay_test_9', order_id: orderId, method: 'upi', vpa: 'test@upi', amount_refunded: 49900 } } },
  });
  const webhook = async (payload, signature) => {
    const raw = JSON.stringify(payload);
    const headers = { 'content-type': 'application/json' };
    if (signature !== undefined) headers['x-razorpay-signature'] = signature === true ? razorpaySignature(raw) : signature;
    const res = await fetch(`${api.baseUrl}/orders/refund/processed`, {
      method: 'POST',
      headers,
      body: raw,
      signal: AbortSignal.timeout(10_000),
    });
    return { status: res.status, body: await res.json() };
  };

  test('marks the order refunded and stores the payment entity', async () => {
    const order = await orderFor({ orderStatus: 'returned', razorOrderId: 'order_test_9' });
    const event = refundEvent();
    assertBody(await webhook(event, true), 200, WEBHOOK_OK);
    const refunded = await Order().findById(order._id);
    assert.equal(refunded.orderStatus, 'refunded');
    assert.deepEqual(refunded.payment, event.payload.payment.entity);
    assert.deepEqual(
      refunded.orderHistory.map((entry) => entry.title),
      ['refunded'],
    );
  });

  test('legacy: refunds an order in any stage', async () => {
    const order = await orderFor({ orderStatus: 'attempted', razorOrderId: 'order_test_9' });
    await webhook(refundEvent(), true);
    assert.equal((await Order().findById(order._id)).orderStatus, 'refunded');
  });

  test('answers ok and changes nothing without or with a bad signature, or for an unknown order', async () => {
    const order = await orderFor({ orderStatus: 'returned', razorOrderId: 'order_test_9' });
    assertBody(await webhook(refundEvent()), 200, WEBHOOK_OK);
    assertBody(await webhook(refundEvent(), razorpaySignature('{}')), 200, WEBHOOK_OK);
    assertBody(await webhook(refundEvent('order_unknown'), true), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');
  });
});

describe('POST /orders/create-shipment/:orderId (Delhivery)', () => {
  const DIMENSIONS = { width: 20, height: 5, weight: 800 };
  let calls;

  const mockDelhivery = (answer = { success: true, packages: [{ waybill: 'WB-TEST-1' }] }) => {
    calls = [];
    mockVendorCall('axios', (config) => {
      calls.push(config);
      if (config.url.endsWith('/api/cmu/create.json')) return { data: answer };
      throw new Error(`unexpected Delhivery call ${config.url}`);
    });
  };

  test('creates a prepaid shipment for a paid order and ships it', async () => {
    const order = await orderFor({
      orderStatus: 'paid',
      boxes: [{ quantity: 1, box: orderIds.boxOne }],
      addOns: [{ quantity: 1, addOn: orderIds.addOnOne }],
    });
    mockDelhivery();
    const mails = captureMails();
    const res = await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
    assertBody(res, 200, ok('SHIPMENT_CREATE_SUCCESS', { success: true, packages: [{ waybill: 'WB-TEST-1' }] }));

    assert.equal(calls.length, 1);
    const [config] = calls;
    assert.equal(config.method, 'post');
    assert.equal(config.url, 'https://staging-express.delhivery.com/api/cmu/create.json');
    assert.equal(
      JSON.stringify(config.headers),
      JSON.stringify({ Authorization: 'Token undefined', 'Content-Type': 'application/x-www-form-urlencoded' }),
    );
    assert.ok(config.data.startsWith('format=json&data='));
    const payload = JSON.parse(config.data.slice('format=json&data='.length));
    assert.equal(
      JSON.stringify(payload),
      JSON.stringify({
        shipments: [
          {
            name: 'Test Receiver',
            add: `${address.addressLine1} Test Area Near Test Park`,
            pin: '100001',
            city: 'Test City',
            state: 'Test State',
            country: 'India',
            phone: '9000000099',
            order: order.orderId,
            payment_mode: 'Prepaid',
            products_desc: 'Test Book One x 2, Test Bundle One, Test Mystery Box, Test Bookmark,',
            cod_amount: '',
            total_amount: 499,
            shipment_width: 20,
            shipment_height: 5,
            weight: 800,
            shipping_mode: 'Surface',
            address_type: 'home',
          },
        ],
        pickup_location: {
          name: 'PAGEATERS DEMO WAREHOUSE',
          add: 'Unit 1, Demo Logistics Park, Sector 1',
          city: 'Gandhinagar',
          pin_code: '382016',
          country: 'India',
          phone: '9000000000',
        },
      }),
    );

    const shipped = await Order().findById(order._id);
    assert.equal(shipped.orderStatus, 'shipped');
    assert.equal(shipped.shipmentTrackingId, 'https://www.delhivery.com/track/package/WB-TEST-1');
    assert.deepEqual(
      shipped.orderHistory.map((entry) => entry.title),
      ['shipped'],
    );
    const [mail] = await mails.wait(1);
    assert.equal(mail.subject, `Order #${order.orderId} is Shipped - Pageaters`);
  });

  test('a COD (confirmed) order ships as COD for the order total', async () => {
    const order = await orderFor({ orderStatus: 'confirmed' });
    mockDelhivery();
    const mails = captureMails();
    await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
    const [shipment] = JSON.parse(calls[0].data.slice('format=json&data='.length)).shipments;
    assert.deepEqual([shipment.payment_mode, shipment.cod_amount], ['COD', 499]);
    await mails.wait(1);
  });

  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed'].includes(stage);
    test(`${allowed ? 'ships' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      mockDelhivery();
      const mails = captureMails();
      const res = await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
      if (allowed) {
        assert.equal(res.status, 200);
        await mails.wait(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
        assert.equal(calls.length, 0);
      }
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'shipped' : stage);
    });
  }

  test('answers SHIPMENT_CREATE_ERROR and keeps the order when Delhivery refuses', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    mockDelhivery({ success: false, rmk: 'Test refusal' });
    assertBody(
      await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }),
      400,
      badRequest('SHIPMENT_CREATE_ERROR'),
    );
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  test('answers 500 when Delhivery is unreachable', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    mockVendorCall('axios', () => {
      throw new Error('Delhivery down');
    });
    assertBody(await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }), 500, serverError);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  // Phase 4: validated with the shared contract (was: missing dimensions threw a TypeError, 500).
  test('refuses missing or non-positive dimensions before calling Delhivery', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    mockDelhivery();
    for (const body of [{}, { dimensions: { ...DIMENSIONS, weight: 0 } }, { dimensions: { ...DIMENSIONS, width: '20' } }]) {
      assertBody(await call('POST', `/orders/create-shipment/${order._id}`, body), 400, badRequestObject('INVALID_REQUEST'));
    }
    assert.deepEqual(calls, []);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  // Phase 4: the path id is validated after the merge, so a query or body value can't replace it with an operator.
  test('refuses an orderId operator from the query or body', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    mockDelhivery();
    const path = `/orders/create-shipment/${order._id}`;
    assertBody(await call('POST', `${path}?orderId[$ne]=x`, { dimensions: DIMENSIONS }), 400, badRequestObject('INVALID_REQUEST'));
    assertBody(await call('POST', path, { dimensions: DIMENSIONS, orderId: { $ne: 'x' } }), 400, badRequestObject('INVALID_REQUEST'));
    assertBody(await call('POST', path, { dimensions: DIMENSIONS, orderId: 'nope' }), 400, badRequestObject('INVALID_ID'));
    assert.deepEqual(calls, []);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  test("legacy (security step): guarded only as USER — a shopper can ship another user's paid order", async () => {
    const other = await createUser();
    const order = await orderFor({ orderStatus: 'paid' });
    mockDelhivery();
    const mails = captureMails();
    const res = await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }, other.cookie);
    assert.equal(res.status, 200);
    assert.equal((await Order().findById(order._id)).orderStatus, 'shipped');
    await mails.wait(1);
  });
});
