const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, fillCart, loadOrderCatalog, orderIds, razorpaySignature } = require('./helpers/fixtures/orders');
const payments = require('../src/adapters/payments');

// PLAN.md Phase 4 step 7c (order money and cart integrity): the pay-less attack end to end, one pending order per
// user, store credit that can't be spent twice or exceed what the order costs, atomic placing and payment (races and
// compensation after a failed write), the payment and refund webhooks (event, status, currency, amount, refund
// ownership, a payment summary instead of the raw entity), and cart writes that can only reach the shopper's own cart.

const { badRequest, ok } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const GIFT = { isGift: false };

const Order = () => mongoose.model('order');
const User = () => mongoose.model('user');
const Cart = () => mongoose.model('cart');
const Book = () => mongoose.model('storeBook');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
// Loaded once the app has registered the models.
let cartBooks;
let cartExtras;
let shopper;
let address;
let cartCookie;

const post = (path, body) => api.request(path, { method: 'POST', body, cookie: cartCookie });
const attempt = () => post('/orders/attempt', { address: String(address._id) });
const placeCod = () => post('/orders/create', { method: 'cod', giftOptions: GIFT });
const placeOnline = () => post('/orders/create', { method: 'online', giftOptions: GIFT });
const patchCredit = (uniqueId, amount) => api.request('/orders/credit', { method: 'PATCH', body: { uniqueId, amount }, cookie: shopper.cookie });

// Posts a webhook signed over its exact body (`signed: false` sends no signature); `query` is appended to the URL.
const webhook = async (path, payload, { signed = true, query = '' } = {}) => {
  const raw = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json' };
  if (signed) headers['x-razorpay-signature'] = razorpaySignature(raw);
  const res = await fetch(`${api.baseUrl}${path}${query}`, { method: 'POST', headers, body: raw, signal: AbortSignal.timeout(10_000) });
  return { status: res.status, body: await res.json() };
};

const captured = (orderId, amount, entity = {}) => ({
  event: 'payment.captured',
  payload: {
    payment: { entity: { id: 'pay_test_7c', order_id: orderId, method: 'upi', status: 'captured', currency: 'INR', amount, ...entity } },
  },
});

// Attempts an order for `quantity` copies of Test Book One (one: 449 + 50 shipping = 499; two: 898, ships free).
const attemptBooks = async (quantity = 1) => {
  await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity }] });
  assert.equal((await attempt()).status, 200);
  return Order().findOne({ userId: shopper.user._id, orderStatus: 'attempted' });
};

const setBalance = (storeCredit) => User().updateOne({ _id: shopper.user._id }, { storeCredit });
const balance = async () => (await User().findById(shopper.user._id)).storeCredit;
const stockOfBookOne = async () => (await Book().findById(ids.bookOne)).inventory;
const muteErrors = (t) => t.mock.method(console, 'error', () => {});
const logged = (errors) => errors.mock.calls.map((c) => c.arguments[0]);

// Makes Model.updateOne (or another static) reject when `matches(filter, update)`; other calls go through.
const failWhen = (t, model, method, matches) => {
  const original = model[method];
  t.mock.method(model, method, function (...args) {
    if (matches(...args)) return Promise.reject(new Error('Test write failure'));
    return original.apply(this, args);
  });
};

before(async () => {
  api = await startTestApp();
  cartBooks = require('../src/services/cart-books.service');
  cartExtras = require('../src/services/cart-extras.service');
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

describe('the pay-less attack (credit applied, online order created, credit removed, reduced amount paid)', () => {
  test('end to end: the credit can no longer be removed once the order is placed, and the paid order debits it', async () => {
    await setBalance(100);
    const attempted = await attemptBooks();
    const stock = await stockOfBookOne();

    assertBody(await patchCredit(attempted.orderId, 100), 200, ok('ORDER_UPDATE_SUCCESS', {}));
    const created = await placeOnline();
    assert.equal(created.body.data.total, 399);
    const [paymentOrder] = payments.list();
    assert.equal(paymentOrder.amount, 39900);

    // The attack's next step: take the credit off the placed order. Refused.
    assertBody(await patchCredit(attempted.orderId, 0), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    assert.equal((await Order().findById(attempted._id)).storeCredit, 100);

    // The shopper pays the reduced amount; the webhook debits the credit that paid the rest.
    assertBody(await webhook('/orders/confirm', captured(paymentOrder.id, 39900)), 200, WEBHOOK_OK);
    const paid = await Order().findById(attempted._id);
    assert.equal(paid.orderStatus, 'paid');
    assert.equal(await balance(), 0);
    const [transaction] = await Transactions().find({ userId: shopper.user._id });
    assert.deepEqual([transaction.amount, transaction.action], [100, 'DEBIT']);
    assert.equal(String(paid.storeCreditTransaction), String(transaction._id));
    assert.equal(await stockOfBookOne(), stock - 1);
  });

  test('a captured amount or currency other than the order total leaves the order unpaid and moves nothing', async (t) => {
    const errors = muteErrors(t);
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 40);
    await placeOnline();
    const [paymentOrder] = payments.list();
    assert.equal(paymentOrder.amount, 45900);
    const stock = await stockOfBookOne();

    for (const amount of [35900, 45899, 45901, 49900, '45900']) {
      assertBody(await webhook('/orders/confirm', captured(paymentOrder.id, amount)), 200, WEBHOOK_OK);
    }
    for (const currency of ['USD', undefined]) {
      assertBody(await webhook('/orders/confirm', captured(paymentOrder.id, 45900, { currency })), 200, WEBHOOK_OK);
    }

    const order = await Order().findById(attempted._id);
    assert.deepEqual([order.orderStatus, order.razorPaymentId, order.payment], ['created', '', null]);
    assert.equal(await balance(), 100);
    assert.equal(await Transactions().countDocuments(), 0);
    assert.equal(await stockOfBookOne(), stock);
    assert.equal((await Cart().findOne({ user: shopper.user._id })).products.length, 1);
    assert.equal(errors.mock.callCount(), 7);
    assert.equal(
      logged(errors)[0],
      `Payment refused: payment pay_test_7c (Razorpay order ${paymentOrder.id}) is 35900 INR, order ${order.orderId} total is 45900 INR (paise)`,
    );

    // The right amount still confirms it.
    await webhook('/orders/confirm', captured(paymentOrder.id, 45900));
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'paid');
    assert.equal(await balance(), 60);
  });
});

describe('one pending order per user', () => {
  test('a new attempt takes over the created order, so the credit can be applied again (no lockout)', async () => {
    await setBalance(100);
    const first = await attemptBooks();
    await patchCredit(first.orderId, 100);
    await placeOnline();

    const again = await attemptBooks();
    assert.equal(String(again._id), String(first._id));
    assert.equal(await Order().countDocuments({ userId: shopper.user._id }), 1);
    assert.deepEqual([again.orderStatus, again.razorOrderId, again.storeCredit, again.total], ['attempted', '', 0, 499]);
    assert.notEqual(again.orderId, first.orderId);

    const retrieved = await api.request('/orders/retrieve', { cookie: shopper.cookie });
    assert.equal(retrieved.body.data.orderId, again.orderId);
    assertBody(await patchCredit(again.orderId, 50), 200, ok('ORDER_UPDATE_SUCCESS', {}));
    assert.equal((await placeOnline()).body.data.total, 449);
  });

  test('credit then re-attempt: the applied credit is reset', async () => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 100);
    const again = await attemptBooks();
    assert.deepEqual([String(again._id), again.storeCredit, again.total], [String(attempted._id), 0, 499]);
    assert.equal((await placeCod()).body.data.total, 499);
    assert.equal(await balance(), 100);
  });

  test('a payment for the Razorpay order a re-attempt dropped confirms nothing and is logged by id', async (t) => {
    const errors = muteErrors(t);
    await setBalance(100);
    const first = await attemptBooks();
    await patchCredit(first.orderId, 100);
    await placeOnline();
    const [abandoned] = payments.list();

    await attemptBooks();
    await patchCredit((await Order().findById(first._id)).orderId, 100);
    assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 399, orderId: (await Order().findById(first._id)).orderId }));
    assert.equal(await balance(), 0);

    // The old Razorpay order is paid after all: no order awaits it, nothing is debited again.
    assertBody(await webhook('/orders/confirm', captured(abandoned.id, 39900, { email: 'payer@example.com', contact: '+919000000000' })), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(first._id)).orderStatus, 'confirmed');
    assert.equal(await balance(), 0);
    assert.equal(await Transactions().countDocuments(), 1);
    assert.deepEqual(logged(errors), [`Captured payment pay_test_7c (Razorpay order ${abandoned.id}) matches no order awaiting payment`]);
  });

  test('refuses to place or re-attempt an order whose payment is being claimed', async () => {
    const claimed = await createOrder(shopper.user, { orderStatus: 'created', razorOrderId: 'order_test_7c', razorPaymentId: 'pay_test_busy' });
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    const stock = await stockOfBookOne();

    assertBody(await placeCod(), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    assertBody(await attempt(), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    const order = await Order().findById(claimed._id);
    assert.deepEqual([order.orderStatus, order.razorOrderId, order.orderId], ['created', 'order_test_7c', claimed.orderId]);
    assert.equal(await stockOfBookOne(), stock);
  });
});

describe('store credit can be spent only once, and never beyond what the order costs', () => {
  test('credit then shrink cart: credit above the new total is refused when placing', async () => {
    await setBalance(1000);
    const attempted = await attemptBooks(2);
    assertBody(await patchCredit(attempted.orderId, 800), 200, ok('ORDER_UPDATE_SUCCESS', {}));
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    const stock = await stockOfBookOne();

    assertBody(await placeCod(), 400, badRequest('STORE_CREDIT_SURPLUS'));
    assertBody(await placeOnline(), 400, badRequest('STORE_CREDIT_SURPLUS'));
    assert.deepEqual(payments.list(), []);
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
    assert.equal(await balance(), 1000);
    assert.equal(await stockOfBookOne(), stock);
  });

  test('a total under ₹1 is refused online and placed COD with the credit alone', async () => {
    await setBalance(1000);
    let attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 498.5);
    assertBody(await placeOnline(), 400, badRequest('INVALID_PAYMENT_METHOD'));
    await patchCredit(attempted.orderId, 499);
    assertBody(await placeOnline(), 400, badRequest('INVALID_PAYMENT_METHOD'));
    assert.deepEqual(payments.list(), []);

    const stock = await stockOfBookOne();
    assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 0, orderId: attempted.orderId }));
    attempted = await Order().findById(attempted._id);
    assert.deepEqual([attempted.orderStatus, attempted.total, attempted.storeCredit], ['confirmed', 0, 499]);
    assert.equal(await balance(), 501);
    assert.equal(await stockOfBookOne(), stock - 1);
  });

  test('COD: credit the balance no longer covers is refused before the order is confirmed', async () => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 100);
    await setBalance(30);
    const stock = await stockOfBookOne();

    assertBody(await placeCod(), 400, badRequest('STORE_CREDIT_UNAVAILABLE'));
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
    assert.equal(await balance(), 30);
    assert.equal(await Transactions().countDocuments(), 0);
    assert.equal(await stockOfBookOne(), stock);
  });

  test('online: credit the balance no longer covers is refused before a payment order is made', async () => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 100);
    await setBalance(99.5);

    assertBody(await placeOnline(), 400, badRequest('STORE_CREDIT_UNAVAILABLE'));
    assert.deepEqual(payments.list(), []);
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
  });

  test('the payment webhook refuses an order whose credit the balance no longer covers', async (t) => {
    const errors = muteErrors(t);
    await setBalance(30);
    const order = await createOrder(shopper.user, { orderStatus: 'created', razorOrderId: 'order_test_7c', storeCredit: 100, total: 399 });

    assertBody(await webhook('/orders/confirm', captured('order_test_7c', 39900)), 200, WEBHOOK_OK);

    const refused = await Order().findById(order._id);
    assert.deepEqual(
      [refused.orderStatus, refused.razorPaymentId, refused.storeCreditTransaction, refused.payment],
      ['created', '', null, null],
    );
    assert.equal(await balance(), 30);
    assert.equal(await Transactions().countDocuments(), 0);
    assert.deepEqual(logged(errors), [
      `Payment refused: payment pay_test_7c (Razorpay order order_test_7c): store credit applied to order ${order.orderId} exceeds the balance`,
    ]);

    // Once the balance covers it again, a redelivery confirms the order.
    await setBalance(100);
    await webhook('/orders/confirm', captured('order_test_7c', 39900));
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
    assert.equal(await balance(), 0);
  });
});

describe('races: one winner, one debit, one stock deduction', () => {
  test('two concurrent deliveries of the same payment debit once and record one history entry', async (t) => {
    muteErrors(t);
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 50);
    await placeOnline();
    const [paymentOrder] = payments.list();
    const stock = await stockOfBookOne();

    const event = captured(paymentOrder.id, 44900);
    await Promise.all([webhook('/orders/confirm', event), webhook('/orders/confirm', event), webhook('/orders/confirm', event)]);

    const paid = await Order().findById(attempted._id);
    assert.equal(paid.orderStatus, 'paid');
    assert.deepEqual(
      paid.orderHistory.map((entry) => entry.title),
      ['paid'],
    );
    assert.equal(await balance(), 50);
    assert.equal(await Transactions().countDocuments(), 1);
    assert.equal(await stockOfBookOne(), stock - 1);
  });

  test('two concurrent COD places: one is confirmed, the other refused', async () => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 50);
    const stock = await stockOfBookOne();

    const results = await Promise.all([placeCod(), placeCod(), placeCod()]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400, 400]);
    for (const refused of results.filter((r) => r.status === 400)) assertBody(refused, 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));

    const order = await Order().findById(attempted._id);
    assert.deepEqual(
      [order.orderStatus, order.orderHistory.map((entry) => entry.title)],
      ['confirmed', ['confirmed']],
    );
    assert.equal(await balance(), 50);
    assert.equal(await Transactions().countDocuments(), 1);
    assert.equal(await stockOfBookOne(), stock - 1);
  });

  test('payment webhook against a COD place of the same created order: exactly one wins', async (t) => {
    muteErrors(t);
    for (let round = 0; round < 3; round += 1) {
      await setBalance(100);
      const attempted = await attemptBooks();
      await patchCredit(attempted.orderId, 50);
      await placeOnline();
      const paymentOrder = payments.list().at(-1);
      const stock = await stockOfBookOne();

      const [, cod] = await Promise.all([webhook('/orders/confirm', captured(paymentOrder.id, 44900, { id: `pay_test_race_${round}` })), placeCod()]);

      const order = await Order().findById(attempted._id);
      assert.equal(order.orderStatus, cod.status === 200 ? 'confirmed' : 'paid');
      assert.equal(order.orderHistory.length, 1);
      assert.equal(await balance(), 50);
      assert.equal(await Transactions().countDocuments({ orderId: order._id }), 1);
      assert.equal(await stockOfBookOne(), stock - 1);
      await Order().deleteOne({ _id: order._id });
    }
  });
});

describe('compensation when a write fails after the store credit was debited', () => {
  test('payment webhook: the credit and the claim are put back, and a redelivery confirms the order', async (t) => {
    await setBalance(100);
    const order = await createOrder(shopper.user, { orderStatus: 'created', razorOrderId: 'order_test_7c', storeCredit: 100, total: 399 });
    failWhen(t, Order(), 'updateOne', (filter, update) => update?.$set?.orderStatus === 'paid');

    assert.equal((await webhook('/orders/confirm', captured('order_test_7c', 39900))).status, 500);
    const failed = await Order().findById(order._id);
    assert.deepEqual([failed.orderStatus, failed.razorPaymentId, failed.orderHistory.length], ['created', '', 0]);
    assert.equal(await balance(), 100);
    assert.equal(await Transactions().countDocuments(), 0);

    t.mock.restoreAll();
    assertBody(await webhook('/orders/confirm', captured('order_test_7c', 39900)), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
    assert.equal(await balance(), 0);
  });

  test('COD: a failure after the debit puts the credit back and the order back to attempted', async (t) => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 50);
    const stock = await stockOfBookOne();
    failWhen(t, Order(), 'updateOne', (filter, update) => update?.$set?.storeCreditTransaction !== undefined);

    assert.equal((await placeCod()).status, 500);
    const order = await Order().findById(attempted._id);
    assert.deepEqual([order.orderStatus, order.orderHistory.length, order.payment], ['attempted', 0, null]);
    assert.equal(await balance(), 100);
    assert.equal(await Transactions().countDocuments(), 0);
    assert.equal(await stockOfBookOne(), stock);

    t.mock.restoreAll();
    assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 449, orderId: attempted.orderId }));
    assert.equal(await balance(), 50);
  });

  test('recording the DEBIT fails: the balance is put back and the order isn\'t confirmed', async (t) => {
    await setBalance(100);
    const attempted = await attemptBooks();
    await patchCredit(attempted.orderId, 50);
    failWhen(t, Transactions(), 'create', () => true);

    assert.equal((await placeCod()).status, 500);
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
    assert.equal(await balance(), 100);
  });
});

describe('payment webhook: only a captured INR payment event counts', () => {
  let order;

  beforeEach(async () => {
    order = await createOrder(shopper.user, { orderStatus: 'created', razorOrderId: 'order_test_7c', total: 499 });
  });

  test('ignores other signed events and payments that are not captured', async () => {
    const events = [
      { ...captured('order_test_7c', 49900), event: 'payment.authorized' },
      { ...captured('order_test_7c', 49900), event: 'payment.failed' },
      { ...captured('order_test_7c', 49900), event: 'refund.processed' },
      { payload: captured('order_test_7c', 49900).payload },
      captured('order_test_7c', 49900, { status: 'authorized' }),
      captured('order_test_7c', 49900, { status: 'failed' }),
      captured('order_test_7c', 49900, { status: undefined }),
      captured('order_test_7c', 49900, { id: undefined }),
    ];
    for (const event of events) assertBody(await webhook('/orders/confirm', event), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
  });

  test('acts on the signed body only: query parameters cannot change the event', async () => {
    const event = captured('order_test_7c', 49900, { status: 'failed' });
    const query = '?payload[payment][entity][status]=captured&event=payment.captured';
    assertBody(await webhook('/orders/confirm', event, { query }), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
  });

  test('a signed body that names no order, or an operator object, does nothing', async () => {
    for (const event of [captured('', 49900), captured(undefined, 49900), captured({ $ne: null }, 49900)]) {
      assertBody(await webhook('/orders/confirm', event), 200, WEBHOOK_OK);
    }
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
  });

  test('stores a payment summary, not the raw entity (no payer contact, card holder, card ids, acquirer data or notes)', async () => {
    const entity = {
      id: 'pay_test_7c',
      entity: 'payment',
      order_id: 'order_test_7c',
      method: 'card',
      status: 'captured',
      captured: true,
      amount: 49900,
      currency: 'INR',
      created_at: 1767225600,
      email: 'payer@example.com',
      contact: '+919000000000',
      card_id: 'card_test_1',
      card: { id: 'card_test_1', name: 'Test Payer', last4: '1111', network: 'Visa', type: 'credit', issuer: 'TEST', international: false },
      notes: { address: 'Test Street' },
      acquirer_data: { auth_code: '123456', rrn: '000000000000' },
      fee: 1000,
      tax: 180,
      description: 'Test order',
    };
    await webhook('/orders/confirm', captured('order_test_7c', 49900, entity));

    const paid = await Order().findById(order._id);
    assert.equal(paid.orderStatus, 'paid');
    assert.deepEqual(paid.payment, {
      id: 'pay_test_7c',
      order_id: 'order_test_7c',
      method: 'card',
      amount: 49900,
      currency: 'INR',
      status: 'captured',
      captured: true,
      created_at: 1767225600,
      card: { last4: '1111', network: 'Visa' },
    });
  });

  test('stores a UPI id masked to its first two characters and handle', async () => {
    await webhook('/orders/confirm', captured('order_test_7c', 49900, { vpa: 'test.payer@okbank' }));
    assert.equal((await Order().findById(order._id)).payment.vpa, 'te***@okbank');
  });
});

describe('refund webhook: a full refund.processed for the order\'s own payment, once', () => {
  const refundEvent = ({ event = 'refund.processed', paymentId = 'pay_test_r', refunded = 49900, amount = 49900 } = {}) => ({
    event,
    payload: {
      refund: { entity: { id: 'rfnd_test_r', payment_id: paymentId, amount } },
      payment: {
        entity: {
          id: paymentId,
          order_id: 'order_test_r',
          method: 'upi',
          vpa: 'test@upi',
          status: 'refunded',
          amount: 49900,
          amount_refunded: refunded,
          email: 'payer@example.com',
          contact: '+919000000000',
        },
      },
    },
  });
  const paidOrder = (overrides) => createOrder(shopper.user, { orderStatus: 'returned', razorOrderId: 'order_test_r', razorPaymentId: 'pay_test_r', ...overrides });

  test('ignores other signed events', async () => {
    const order = await paidOrder();
    for (const event of ['payment.captured', 'refund.created', 'refund.failed', undefined]) {
      // Set after building: the helper's default would replace an undefined event.
      const body = { ...refundEvent(), event };
      assertBody(await webhook('/orders/refund/processed', body), 200, WEBHOOK_OK);
    }
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');
  });

  test('marks the order refunded with a payment summary', async () => {
    const order = await paidOrder();
    assertBody(await webhook('/orders/refund/processed', refundEvent()), 200, WEBHOOK_OK);
    const done = await Order().findById(order._id);
    assert.equal(done.orderStatus, 'refunded');
    assert.deepEqual(done.payment, {
      id: 'pay_test_r',
      order_id: 'order_test_r',
      method: 'upi',
      amount: 49900,
      amount_refunded: 49900,
      status: 'refunded',
      vpa: 'te***@upi',
    });
  });

  test('ignores a refund of another payment, an order without a payment, and an order already refunded', async () => {
    const order = await paidOrder();
    assertBody(await webhook('/orders/refund/processed', refundEvent({ paymentId: 'pay_test_other' })), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'returned');

    const cod = await paidOrder({ razorOrderId: 'order_test_r2', razorPaymentId: '' });
    const codEvent = refundEvent({ paymentId: '' });
    codEvent.payload.payment.entity.order_id = 'order_test_r2';
    await webhook('/orders/refund/processed', codEvent);
    assert.equal((await Order().findById(cod._id)).orderStatus, 'returned');

    await webhook('/orders/refund/processed', refundEvent());
    await webhook('/orders/refund/processed', refundEvent());
    assert.equal((await Order().findById(order._id)).orderHistory.length, 1);
  });

  test('a partial refund is recorded in the history and leaves the order stage alone', async () => {
    const order = await paidOrder();
    await webhook('/orders/refund/processed', refundEvent({ refunded: 20000, amount: 20000 }));
    const partial = await Order().findById(order._id);
    assert.equal(partial.orderStatus, 'returned');
    assert.deepEqual(
      partial.orderHistory.map((entry) => [entry.title, entry.description]),
      [['Partial refund', 'A refund of INR 200 is processed.']],
    );
    assert.equal(partial.payment.amount_refunded, 20000);

    await webhook('/orders/refund/processed', refundEvent({ refunded: 49900, amount: 29900 }));
    assert.equal((await Order().findById(order._id)).orderStatus, 'refunded');
  });
});

describe('cart writes reach only the found cart (operator id in place of the cart id)', () => {
  // The cookie check (5b) refuses a non-id cart cookie before the services run; these call the services directly
  // with the operator object a forged `_CID=j:{"$in":[victim, own]}` decoded to.
  const ITEMS = {
    products: [{ product: ids.bookTwo, quantity: 1 }],
    bundles: [{ bundle: orderIds.bundleOne, quantity: 1 }],
    mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1 }],
    addOns: [{ addOn: orderIds.addOnOne, quantity: 1 }],
  };
  const EMPTY = {};
  const OWN_LINES = { products: ITEMS.products, addOns: ITEMS.addOns };

  const writes = [
    ['addBook', EMPTY, (input) => cartBooks.addBook({ ...input, product: String(ids.bookOne), quantity: 1 })],
    ['setBookQuantity', OWN_LINES, (input) => cartBooks.setBookQuantity({ ...input, id: String(ids.bookTwo), quantity: 2 })],
    ['removeBook', OWN_LINES, (input) => cartBooks.removeBook({ ...input, id: String(ids.bookTwo) })],
    ['emptyCart', OWN_LINES, (input) => cartBooks.emptyCart(input)],
    ['addBundle', EMPTY, (input) => cartExtras.addBundle({ ...input, bundle: String(orderIds.bundleOne) })],
    ['removeBundle', { bundles: ITEMS.bundles }, (input) => cartExtras.removeBundle({ ...input, bundleId: String(orderIds.bundleOne) })],
    ['addBox', EMPTY, (input) => cartExtras.addBox({ ...input, box: String(orderIds.boxOne) })],
    ['removeBox', { mysteryBoxes: ITEMS.mysteryBoxes }, (input) => cartExtras.removeBox({ ...input, boxId: String(orderIds.boxOne) })],
    ['addAddOn', EMPTY, (input) => cartExtras.addAddOn({ ...input, addOn: String(orderIds.addOnOne), quantity: 1 })],
    ['setAddOnQuantity', OWN_LINES, (input) => cartExtras.setAddOnQuantity({ ...input, id: String(orderIds.addOnOne), quantity: 3 })],
    ['removeAddOn', OWN_LINES, (input) => cartExtras.removeAddOn({ ...input, addOnId: String(orderIds.addOnOne) })],
  ];

  const lines = (cart) => JSON.stringify([cart.products, cart.bundles, cart.mysteryBoxes, cart.addOns]);

  for (const [name, ownItems, write] of writes) {
    test(`${name} leaves another user's cart alone`, async () => {
      // The victim's cart is created first, so an unfiltered write on `$in` would match it first.
      const victim = await createUser();
      const attacker = await createUser();
      const victimCart = await fillCart(victim.user, ITEMS);
      const ownCart = await fillCart(attacker.user, ownItems);
      const before = lines(victimCart.toObject());

      const cartId = { $in: [String(victimCart._id), String(ownCart._id)] };
      await write({ cartId, userId: String(attacker.user._id) }).catch(() => undefined);

      assert.equal(lines((await Cart().findById(victimCart._id)).toObject()), before);
    });
  }

  test("the write lands on the shopper's own cart", async () => {
    const victim = await createUser();
    const attacker = await createUser();
    const victimCart = await fillCart(victim.user, {});
    const ownCart = await fillCart(attacker.user, {});
    await cartBooks.addBook({ cartId: String(ownCart._id), userId: String(attacker.user._id), product: String(ids.bookOne), quantity: 1 });
    assert.equal((await Cart().findById(ownCart._id)).products.length, 1);
    assert.equal((await Cart().findById(victimCart._id)).products.length, 0);
  });
});
