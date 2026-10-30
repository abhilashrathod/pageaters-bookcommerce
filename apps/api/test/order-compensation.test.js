const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, ids, loadCatalog, messagesAt, startTestApp } = require('./helpers');
const { createAddress, createOrder, fillCart, loadOrderCatalog, razorpaySignature } = require('./helpers/fixtures/orders');

// PLAN.md Phase 4 "Fix legacy bugs", sub-step a (orders: payment and placement): compensating a store-credit debit
// after a failed write. Fresh reads catch writes whose acknowledgement was lost or that land late, so a paid or
// confirmed order never gets its credit back; a COD order that can't go back to pending (a newer checkout exists) is
// cancelled; what can't be settled is logged.

const { badRequest, ok } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const GIFT = { isGift: false };

const Order = () => mongoose.model('order');
const User = () => mongoose.model('user');
const Cart = () => mongoose.model('cart');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
let shopper;
let address;
let cartCookie;

const post = (path, body) => api.request(path, { method: 'POST', body, cookie: cartCookie });
const attempt = () => post('/orders/attempt', { address: String(address._id) });
const placeCod = () => post('/orders/create', { method: 'cod', giftOptions: GIFT });
const patchCredit = (uniqueId, amount) =>
  api.request('/orders/credit', { method: 'PATCH', body: { uniqueId, amount }, cookie: shopper.cookie });
const setBalance = (storeCredit) => User().updateOne({ _id: shopper.user._id }, { storeCredit });
const balance = async () => (await User().findById(shopper.user._id)).storeCredit;

const confirmPayment = async (orderId, amount) => {
  const raw = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_test_a', order_id: orderId, method: 'upi', status: 'captured', currency: 'INR', amount } } },
  });
  const headers = { 'content-type': 'application/json', 'x-razorpay-signature': razorpaySignature(raw) };
  const res = await fetch(`${api.baseUrl}/orders/confirm`, { method: 'POST', headers, body: raw, signal: AbortSignal.timeout(10_000) });
  return { status: res.status, body: await res.json() };
};

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
const lostAck = async (original, args) => {
  await original(...args);
  throw new Error('Test lost acknowledgement');
};
const failure = () => Promise.reject(new Error('Test write failure'));

const isPaidWrite = (filter, update) => update?.$set?.orderStatus === 'paid';
const isLinkWrite = (filter, update) => update?.$set?.storeCreditTransaction !== undefined;
const isRevertWrite = (filter, update) => update?.$pull?.orderHistory !== undefined;
const isDebit = (filter, update) => update?.$inc?.storeCredit < 0;
const isCreditBack = (filter, update) => update?.$inc?.storeCredit > 0;

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

describe('payment webhook: a failed paid write never returns credit for a paid order', () => {
  let order;
  beforeEach(async () => {
    await setBalance(100);
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    order = await createOrder(shopper.user, { orderStatus: 'created', razorOrderId: 'order_test_a', storeCredit: 100, total: 399 });
  });

  const assertPaidWithCreditSpent = async () => {
    const paid = await Order().findById(order._id);
    assert.deepEqual([paid.orderStatus, paid.razorPaymentId], ['paid', 'pay_test_a']);
    assert.equal(await balance(), 0);
    assert.equal(await Transactions().countDocuments({ action: 'DEBIT' }), 1);
  };

  test('the write landed but its acknowledgement was lost: the order completes', async (t) => {
    intercept(t, Order(), 'updateOne', isPaidWrite, lostAck);
    assertBody(await confirmPayment('order_test_a', 39900), 200, WEBHOOK_OK);
    await assertPaidWithCreditSpent();
    assert.equal((await Cart().findOne({ user: shopper.user._id })).products.length, 0);
  });

  test('the write lands late, after the re-read: the release matches nothing, and the order completes', async (t) => {
    // The paid write times out without landing; it reaches the database just before the release.
    let landLate;
    const updateOne = Order().updateOne;
    t.mock.method(Order(), 'updateOne', async function (filter, update) {
      if (isPaidWrite(filter, update)) {
        landLate = () => updateOne.call(this, filter, update);
        throw new Error('Test write timeout');
      }
      if (update?.$set?.razorPaymentId === '' && landLate) await landLate();
      return updateOne.call(this, filter, update);
    });

    assertBody(await confirmPayment('order_test_a', 39900), 200, WEBHOOK_OK);
    await assertPaidWithCreditSpent();
  });

  test('when the order cannot be read back nothing is undone, and it is logged', async (t) => {
    const logs = captureLogs(t);
    intercept(t, Order(), 'updateOne', isPaidWrite, lostAck);
    t.mock.method(Order(), 'findById', () => ({ select: () => failure() }));

    assert.equal((await confirmPayment('order_test_a', 39900)).status, 500);
    t.mock.restoreAll();
    await assertPaidWithCreditSpent();
    // Then the 500 itself ('request failed').
    assert.deepEqual(messagesAt(logs), [
      `Payment pay_test_a: order ${order.orderId} could not be settled after marking it paid failed; check the order and the balance`,
      'request failed',
    ]);
  });

  test('the claim is released but the credit cannot be given back: logged with the order, transaction and amount', async (t) => {
    const logs = captureLogs(t);
    intercept(t, Order(), 'updateOne', isPaidWrite, failure);
    intercept(t, User(), 'updateOne', isCreditBack, failure);

    assert.equal((await confirmPayment('order_test_a', 39900)).status, 500);
    const [debit] = await Transactions().find({ action: 'DEBIT' });
    const released = await Order().findById(order._id);
    assert.deepEqual([released.orderStatus, released.razorPaymentId], ['created', '']);
    assert.equal(await balance(), 0);
    assert.equal(
      messagesAt(logs)[0],
      `Order ${order.orderId}: store credit 100 of DEBIT transaction ${debit._id} may not have been given back; check the balance before crediting it by hand`,
    );
  });
});

describe('COD: compensation after a failed write', () => {
  let attempted;
  beforeEach(async () => {
    await setBalance(100);
    attempted = await attemptBook();
    await patchCredit(attempted.orderId, 50);
  });

  test('the transaction link landed but its acknowledgement was lost: the order is confirmed, the credit spent', async (t) => {
    intercept(t, Order(), 'updateOne', isLinkWrite, lostAck);
    assertBody(await placeCod(), 200, ok('ORDER_CREATE_SUCCESS', { total: 449, orderId: attempted.orderId }));
    const order = await Order().findById(attempted._id);
    const [debit] = await Transactions().find({ userId: shopper.user._id });
    assert.equal(order.orderStatus, 'confirmed');
    assert.equal(String(order.storeCreditTransaction), String(debit._id));
    assert.equal(await balance(), 50);
  });

  test('the link and the put-back both fail: the credit stays spent on the confirmed order, logged', async (t) => {
    const logs = captureLogs(t);
    intercept(t, Order(), 'updateOne', (filter, update) => isLinkWrite(filter, update) || isRevertWrite(filter, update), failure);

    assert.equal((await placeCod()).status, 500);
    t.mock.restoreAll();
    const [debit] = await Transactions().find({ userId: shopper.user._id });
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'confirmed');
    assert.equal(await balance(), 50);
    assert.equal(
      messagesAt(logs)[0],
      `Order ${attempted.orderId}: store credit transaction ${debit._id} could not be linked or undone; check the order and the balance`,
    );
  });

  test('a newer checkout started meanwhile: the order is cancelled instead of put back, nothing debited', async (t) => {
    const logs = captureLogs(t);
    // While the order is confirmed, another tab starts a checkout; then the balance no longer covers the credit.
    intercept(t, User(), 'findOneAndUpdate', isDebit, async () => {
      await Order().create({ userId: shopper.user._id, orderId: 'OD-0000000002', orderStatus: 'attempted' });
      return null;
    });

    assertBody(await placeCod(), 400, badRequest('STORE_CREDIT_UNAVAILABLE'));
    const order = await Order().findById(attempted._id);
    assert.deepEqual([order.orderStatus, order.orderHistory.map((entry) => entry.title)], ['cancelled', ['confirmed', 'cancelled']]);
    assert.equal((await Order().findOne({ orderId: 'OD-0000000002' })).orderStatus, 'attempted');
    assert.equal(await balance(), 100);
    assert.deepEqual(messagesAt(logs, 'warn'), [
      `Order ${attempted.orderId}: its COD place failed and a newer checkout exists, so it was cancelled`,
    ]);
  });

  test('a newer checkout blocks the put-back after the debit: the order is cancelled, then the credit given back', async (t) => {
    // The link fails; meanwhile another tab started a checkout, so the order can't go back to attempted.
    intercept(t, Order(), 'updateOne', isLinkWrite, async () => {
      await Order().create({ userId: shopper.user._id, orderId: 'OD-0000000003', orderStatus: 'attempted' });
      throw new Error('Test write failure');
    });

    assert.equal((await placeCod()).status, 500);
    const order = await Order().findById(attempted._id);
    assert.deepEqual([order.orderStatus, order.storeCreditTransaction], ['cancelled', null]);
    assert.equal(await balance(), 100);
    assert.equal(await Transactions().countDocuments(), 0);
  });

  test('the credit cannot be given back after the put-back: logged with the order, transaction and amount', async (t) => {
    const logs = captureLogs(t);
    intercept(t, Order(), 'updateOne', isLinkWrite, failure);
    intercept(t, User(), 'updateOne', isCreditBack, failure);

    assert.equal((await placeCod()).status, 500);
    const [debit] = await Transactions().find({ action: 'DEBIT' });
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
    assert.equal(await balance(), 50);
    assert.equal(
      messagesAt(logs)[0],
      `Order ${attempted.orderId}: store credit 50 of DEBIT transaction ${debit._id} may not have been given back; check the balance before crediting it by hand`,
    );
  });

  test('the put-back fails after a refused debit: logged, nothing debited', async (t) => {
    const logs = captureLogs(t);
    intercept(t, User(), 'findOneAndUpdate', isDebit, async () => null);
    intercept(t, Order(), 'updateOne', isRevertWrite, failure);

    assertBody(await placeCod(), 400, badRequest('STORE_CREDIT_UNAVAILABLE'));
    assert.equal(await balance(), 100);
    assert.deepEqual(messagesAt(logs), [
      `Order ${attempted.orderId} could not be put back after its COD place failed: it may be confirmed without its store credit debit`,
    ]);
  });
});
