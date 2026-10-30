const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, eventually, ids, loadCatalog, sentEmails, startTestApp } = require('./helpers');
const { createAddress, createOrder, loadOrderCatalog, orderIds, razorpaySignature } = require('./helpers/fixtures/orders');
const shipping = require('../src/adapters/shipping');
const { ORDER_STAGES } = require('../src/constants/enums');

// Order status transitions over HTTP: admin ship / deliver / cancel, shopper cancel / return / replace, return and
// replacement shipments, the Razorpay refund webhook and the Delhivery shipment. Each transition is tried from every
// stage, so the allowed and refused source stages are pinned. Written against the legacy controller first.

const { badRequest, badRequestObject, forbidden, ok, serverError } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const STAGES = Object.values(ORDER_STAGES);

const Order = () => mongoose.model('order');
const Book = () => mongoose.model('storeBook');

// The e-mails the request sent (awaited before the response), checked to be exactly `count`.
const mailed = (count) => {
  const mails = sentEmails();
  assert.equal(mails.length, count);
  return mails;
};

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
      .find({ _id: mongoose.trusted({ $in: [ids.bookOne, ids.bookTwo] }) })
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

    const [mail] = mailed(1);
    assert.equal(mail.to, shopper.user.email);
    assert.equal(mail.subject, `Order #${order.orderId} is Shipped - Pageaters`);
    assert.match(mail.html, new RegExp(order.orderId));
  });

  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed'].includes(stage);
    test(`${allowed ? 'ships' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const res = await call('POST', '/orders/ship', { orderId: String(order._id), shipmentTrackingId: 'TRACK-1' });
      if (allowed) {
        assert.equal(res.status, 200);
        mailed(1);
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
      const res = await call('PATCH', `/orders/ship/${order._id}/complete`);
      if (allowed) {
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ORDER_UPDATE_SUCCESS');
        assert.equal(res.body.data.orderStatus, 'fulfilled');
        assert.deepEqual(
          res.body.data.orderHistory.map((entry) => entry.title),
          ['fulfilled'],
        );
        const [mail] = mailed(1);
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
      const res = await request(order);
      if (allowed) {
        assertBody(res, 200, ok('ORDER_RETURN_SUCCESS', {}));
        mailed(1);
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
    const [mail] = mailed(1);
    assert.equal(mail.subject, `Return Request is Raised for Order #${order.orderId} - Pageaters`);
  });

  test('a replace request moves the order to replacement', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(1) }],
    });
    assertBody(await request(order, 'replace'), 200, ok('ORDER_RETURN_SUCCESS', {}));
    const replaced = await Order().findById(order._id);
    assert.equal(replaced.orderStatus, 'replacement');
    assert.deepEqual(
      replaced.orderHistory.map((entry) => entry.title),
      ['fulfilled', 'replacement'],
    );
    const [mail] = mailed(1);
    assert.equal(mail.subject, `Replace Request is Raised for Order #${order.orderId} - Pageaters`);
  });

  // Phase 4 legacy bugs (b): legacy answered the refusal as a 200 success (`okString`).
  test('after 7 days refuses with 400 ORDER_RETURN_PERIOD_LAPSED and changes nothing', async () => {
    const order = await orderFor({
      orderStatus: 'fulfilled',
      orderHistory: [{ title: 'fulfilled', description: 'Delivered', time: daysAgo(8) }],
    });
    for (const type of ['return', 'replace']) {
      assertBody(await request(order, type), 400, badRequest('ORDER_RETURN_PERIOD_LAPSED'));
    }
    const unchanged = await Order().findById(order._id);
    assert.equal(unchanged.orderStatus, 'fulfilled');
    assert.equal(unchanged.requests.length, 0);
    mailed(0);
  });

  test('a delivered order without a readable delivery time counts as past the period (legacy: 500)', async () => {
    for (const orderHistory of [[], [{ title: 'fulfilled', description: 'Delivered', time: '' }]]) {
      const order = await orderFor({ orderStatus: 'fulfilled', orderHistory });
      assertBody(await request(order), 400, badRequest('ORDER_RETURN_PERIOD_LAPSED'));
      assert.equal((await Order().findById(order._id)).orderStatus, 'fulfilled');
    }
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
      const res = await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-1' });
      if (next) {
        assertBody(res, 200, ok('ORDER_UPDATE_SUCCESS', {}));
        mailed(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      }
      assert.equal((await Order().findById(order._id)).orderStatus, next ?? stage);
    });
  }

  test('aligning a return sets the tracking id on the order and the request, and e-mails the shopper', async () => {
    const order = await withRequest('returned', 'return');
    await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-1' });
    const aligned = await Order().findById(order._id);
    assert.equal(aligned.shipmentTrackingId, 'PICKUP-1');
    assert.deepEqual([aligned.requests[0].status, aligned.requests[0].shipment], ['in progress', 'PICKUP-1']);
    assert.deepEqual(
      aligned.orderHistory.map((entry) => entry.title),
      ['return in progress'],
    );
    const [mail] = mailed(1);
    assert.equal(mail.subject, `Return is Aligned for Order #${order.orderId} - Pageaters`);
  });

  test('aligning a replacement e-mails "Replacement is Aligned"', async () => {
    const order = await withRequest('replacement', 'replace');
    await call('PATCH', `/orders/return/${order._id}/shipment/${order.requests[0]._id}`, { shipment: 'PICKUP-2' });
    const [mail] = mailed(1);
    assert.equal(mail.subject, `Replacement is Aligned for Order #${order.orderId} - Pageaters`);
  });

  test('legacy: an unknown request id answers 200 and changes nothing (but still e-mails)', async () => {
    const order = await withRequest('returned', 'return');
    assertBody(
      await call('PATCH', `/orders/return/${order._id}/shipment/${new mongoose.Types.ObjectId()}`, { shipment: 'X' }),
      200,
      ok('ORDER_UPDATE_SUCCESS', {}),
    );
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');
    mailed(1);
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
  // Phase 4 7c: the event must carry the refund entity for the payment that paid the order (legacy needed only the
  // Razorpay order id), and the order stores a payment summary with the UPI id masked (legacy: the raw entity).
  const refundEvent = (orderId = 'order_test_9') => ({
    event: 'refund.processed',
    payload: {
      refund: { entity: { id: 'rfnd_test_9', payment_id: 'pay_test_9', amount: 49900 } },
      payment: { entity: { id: 'pay_test_9', order_id: orderId, method: 'upi', vpa: 'test@upi', amount: 49900, amount_refunded: 49900 } },
    },
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
  const paidWith = (overrides) => orderFor({ razorOrderId: 'order_test_9', razorPaymentId: 'pay_test_9', ...overrides });

  test('marks the order refunded and stores the payment summary', async () => {
    const order = await paidWith({ orderStatus: 'returned' });
    const event = refundEvent();
    assertBody(await webhook(event, true), 200, WEBHOOK_OK);
    const refunded = await Order().findById(order._id);
    assert.equal(refunded.orderStatus, 'refunded');
    assert.deepEqual(refunded.payment, { ...event.payload.payment.entity, vpa: 'te***@upi' });
    assert.deepEqual(
      refunded.orderHistory.map((entry) => entry.title),
      ['refunded'],
    );
  });

  test('legacy: refunds an order in any stage', async () => {
    const order = await paidWith({ orderStatus: 'attempted' });
    await webhook(refundEvent(), true);
    assert.equal((await Order().findById(order._id)).orderStatus, 'refunded');
  });

  test('answers ok and changes nothing without or with a bad signature, or for an unknown order', async () => {
    const order = await paidWith({ orderStatus: 'returned' });
    assertBody(await webhook(refundEvent()), 200, WEBHOOK_OK);
    assertBody(await webhook(refundEvent(), razorpaySignature('{}')), 200, WEBHOOK_OK);
    assertBody(await webhook(refundEvent('order_unknown'), true), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');
  });
});

describe('POST /orders/create-shipment/:orderId (mock shipping adapter)', () => {
  const DIMENSIONS = { width: 20, height: 5, weight: 800 };
  // What the mock courier was asked to ship (the Delhivery request itself is pinned in adapters-shipping.test.js).
  const shipments = () => shipping.list().filter((entry) => entry.type === 'shipment');

  test('creates a prepaid shipment for a paid order and ships it', async () => {
    const order = await orderFor({
      orderStatus: 'paid',
      boxes: [{ quantity: 1, box: orderIds.boxOne }],
      addOns: [{ quantity: 1, addOn: orderIds.addOnOne }],
    });
    const res = await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
    assert.equal(shipments().length, 1);
    const [{ shipment: payload, waybill }] = shipments();
    assert.match(waybill, /^MOCK\d{10}$/);
    assertBody(res, 200, ok('SHIPMENT_CREATE_SUCCESS', { success: true, packages: [{ waybill }] }));

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
    assert.equal(shipped.shipmentTrackingId, `https://tracking.shipping.mock.invalid/package/${waybill}`);
    assert.deepEqual(
      shipped.orderHistory.map((entry) => entry.title),
      ['shipped'],
    );
    const [mail] = mailed(1);
    assert.equal(mail.subject, `Order #${order.orderId} is Shipped - Pageaters`);
  });

  test('a COD (confirmed) order ships as COD for the order total', async () => {
    const order = await orderFor({ orderStatus: 'confirmed' });
    await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
    const [shipment] = shipments()[0].shipment.shipments;
    assert.deepEqual([shipment.payment_mode, shipment.cod_amount], ['COD', 499]);
    mailed(1);
  });

  for (const stage of STAGES) {
    const allowed = ['paid', 'confirmed'].includes(stage);
    test(`${allowed ? 'ships' : 'refuses'} an order in stage '${stage}'`, async () => {
      const order = await orderFor({ orderStatus: stage });
      const res = await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS });
      if (allowed) {
        assert.equal(res.status, 200);
        mailed(1);
      } else {
        assertBody(res, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
        assert.equal(shipments().length, 0);
      }
      assert.equal((await Order().findById(order._id)).orderStatus, allowed ? 'shipped' : stage);
    });
  }

  test('answers SHIPMENT_CREATE_ERROR and keeps the order when the courier refuses', async (t) => {
    const order = await orderFor({ orderStatus: 'paid' });
    t.mock.method(shipping, 'createShipment', async () => ({ success: false, rmk: 'Test refusal' }));
    assertBody(
      await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }),
      400,
      badRequest('SHIPMENT_CREATE_ERROR'),
    );
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  test('answers 500 when the courier is unreachable, logging only the clean error', async (t) => {
    const order = await orderFor({ orderStatus: 'paid' });
    t.mock.method(shipping, 'createShipment', async () => {
      throw Object.assign(new Error('Shipping request failed'), { code: 'ECONNRESET' });
    });
    const logs = captureLogs(t);
    assertBody(await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }), 500, serverError);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
    // Name, code and stack frames only: never the message (a vendor's can quote the address or phone).
    const failures = logs.filter((entry) => entry.level === 'error');
    assert.deepEqual(
      failures.map(({ msg, err }) => [msg, err.type, err.code, err.message]),
      [['request failed', 'Error', 'ECONNRESET', undefined]],
    );
    assert.doesNotMatch(JSON.stringify(logs), /Shipping request failed/);
  });

  // Phase 4: validated with the shared contract (was: missing dimensions threw a TypeError, 500).
  test('refuses missing or non-positive dimensions before calling Delhivery', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    for (const body of [{}, { dimensions: { ...DIMENSIONS, weight: 0 } }, { dimensions: { ...DIMENSIONS, width: '20' } }]) {
      assertBody(await call('POST', `/orders/create-shipment/${order._id}`, body), 400, badRequestObject('INVALID_REQUEST'));
    }
    assert.deepEqual(shipments(), []);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  // Phase 4: the path id is validated after the merge, so a query or body value can't replace it with an operator.
  test('refuses an orderId operator from the query or body', async () => {
    const order = await orderFor({ orderStatus: 'paid' });
    const path = `/orders/create-shipment/${order._id}`;
    assertBody(await call('POST', `${path}?orderId[$ne]=x`, { dimensions: DIMENSIONS }), 400, badRequestObject('INVALID_REQUEST'));
    assertBody(await call('POST', path, { dimensions: DIMENSIONS, orderId: { $ne: 'x' } }), 400, badRequestObject('INVALID_REQUEST'));
    assertBody(await call('POST', path, { dimensions: DIMENSIONS, orderId: 'nope' }), 400, badRequestObject('INVALID_ID'));
    assert.deepEqual(shipments(), []);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  // 7a: ADMIN only (was: guarded only as USER with no owner filter — a shopper could ship any paid order).
  test('a shopper cannot create a shipment, not even for their own order', async () => {
    const other = await createUser();
    const order = await orderFor({ orderStatus: 'paid' });
    for (const cookie of [other.cookie, shopper.cookie]) {
      assertBody(await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: DIMENSIONS }, cookie), 403, forbidden);
    }
    assert.deepEqual(shipments(), []);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });
});
