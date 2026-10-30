const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, ids, loadCatalog, messagesAt, sentEmails, startTestApp } = require('./helpers');
const { createAddress, createOrder } = require('./helpers/fixtures/orders');
const environment = require('../src/helpers/environment.helper');
const shipping = require('../src/adapters/shipping');

// PLAN.md Phase 4 "Fix legacy bugs", sub-step b (review): every order transition (ship, Delhivery shipment, deliver,
// cancel) is conditional on the stage it read, so one that loses a race with another changes nothing and answers 409
// ORDER_CHANGED_CONFLICT. Each test forces the race by landing the competing change between the read and the write.
// Legacy saved unconditionally: a ship after a shopper's cancel shipped the books while the shopper kept the credit.

const { ok } = envelopes;
const CONFLICT = { statusCode: 409, status: 'ORDER_CHANGED_CONFLICT', message: '', error: '', data: {} };
const CANCELLED_OK = ok('ORDER_CANCEL_SUCCESS', {});

const Order = () => mongoose.model('order');
const Book = () => mongoose.model('storeBook');
const User = () => mongoose.model('user');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
let admin;
let shopper;
let address;

const call = (method, path, body, cookie = admin.cookie) => api.request(path, { method, body, cookie });
const reload = (order) => Order().findById(order._id);
const stock = async () => (await Book().findById(ids.bookOne)).inventory;
const balance = async () => (await User().findById(shopper.user._id)).storeCredit;

// A paid order of one Test Book One that spent 50 of store credit (debit recorded and linked).
const creditOrder = async (overrides) => {
  const debit = await Transactions().create({ userId: shopper.user._id, amount: 50, action: 'DEBIT', creditId: 'SC-0000000003' });
  return createOrder(shopper.user, { deliveryAddress: address._id, storeCredit: 50, storeCreditTransaction: debit._id, ...overrides });
};

const assertConflict = (res) => {
  assert.equal(res.status, 409);
  assert.deepEqual({ ...res.body, message: '', error: '' }, CONFLICT);
  assert.equal(res.body.message, 'This order changed in the meantime. Please reload it and try again.');
};

// Runs `competitor` once, just before the first order write whose $set matches `matches`, then lets the write go on.
const before1stWrite = (t, matches, competitor) => {
  const original = Order().updateOne;
  let ran = false;
  t.mock.method(Order(), 'updateOne', async function (filter, update, ...rest) {
    if (!ran && matches(update?.$set ?? {})) {
      ran = true;
      await competitor();
    }
    return original.call(this, filter, update, ...rest);
  });
  return () => ran;
};
const shopperCancel = (order) => call('POST', `/orders/cancel/${order.orderId}`, { reason: 'Changed mind' }, shopper.cookie);
const adminCancel = (order) =>
  call('POST', `/orders/admin-cancel/${order._id}`, { uniqueId: order.orderId, userId: String(shopper.user._id), reason: 'Out of stock' });

// The shopper's cancel landed in full: cancelled, stock back, credit given back once.
const assertCancelledInFull = async (order, stockBefore) => {
  const current = await reload(order);
  assert.deepEqual([current.orderStatus, current.storeCreditReturn, current.shipmentTrackingId], ['cancelled', 'returned', '']);
  assert.equal(await stock(), stockBefore + 1);
  assert.equal(await balance(), 50);
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
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
  address = await createAddress(shopper.user);
});

describe('a ship that loses to a cancel changes nothing', () => {
  test('POST /orders/ship', async (t) => {
    const order = await creditOrder();
    const stockBefore = await stock();
    const raced = before1stWrite(t, (set) => set.orderStatus === 'shipped', () => shopperCancel(order).then((res) => assertBody(res, 200, CANCELLED_OK)));

    assertConflict(await call('POST', '/orders/ship', { orderId: String(order._id), shipmentTrackingId: 'TRACK-1' }));
    assert.ok(raced());
    await assertCancelledInFull(order, stockBefore);
    assert.deepEqual(
      (await reload(order)).orderHistory.map((entry) => entry.title),
      ['cancelled'],
    );
    assert.deepEqual(sentEmails(), []);
  });

  test('POST /orders/create-shipment: the booked waybill is logged for staff to cancel with the courier', async (t) => {
    const logs = captureLogs(t);
    const order = await creditOrder();
    const stockBefore = await stock();
    shipping.clear();
    const raced = before1stWrite(t, (set) => set.orderStatus === 'shipped', () => shopperCancel(order).then((res) => assertBody(res, 200, CANCELLED_OK)));

    assertConflict(await call('POST', `/orders/create-shipment/${order._id}`, { dimensions: { width: 20, height: 5, weight: 400 } }));
    assert.ok(raced());
    await assertCancelledInFull(order, stockBefore);
    const [{ waybill }] = shipping.list().filter((entry) => entry.type === 'shipment');
    assert.ok(
      messagesAt(logs).includes(
        `Order ${order.orderId} changed while its shipment was booked, so it is not shipped; cancel waybill ${waybill} with the courier`,
      ),
    );
    assert.deepEqual(sentEmails(), []);
  });

  test('PATCH /orders/ship/:id/complete', async (t) => {
    const order = await creditOrder({ orderStatus: 'shipped' });
    const stockBefore = await stock();
    const raced = before1stWrite(t, (set) => set.orderStatus === 'fulfilled', () => adminCancel(order).then((res) => assertBody(res, 200, CANCELLED_OK)));

    assertConflict(await call('PATCH', `/orders/ship/${order._id}/complete`));
    assert.ok(raced());
    await assertCancelledInFull(order, stockBefore);
  });
});

describe('a cancel that loses to another change changes nothing', () => {
  for (const [who, cancel] of [
    ['shopper', shopperCancel],
    ['admin', adminCancel],
  ]) {
    test(`${who} cancel after a ship landed`, async (t) => {
      const order = await creditOrder();
      const stockBefore = await stock();
      const raced = before1stWrite(
        t,
        (set) => set.orderStatus === 'cancelled',
        () => Order().collection.updateOne({ _id: order._id }, { $set: { orderStatus: 'shipped' } }),
      );

      assertConflict(await cancel(order));
      assert.ok(raced());
      const current = await reload(order);
      assert.deepEqual([current.orderStatus, current.storeCreditReturn, current.requests.length], ['shipped', undefined, 0]);
      assert.equal(await stock(), stockBefore);
      assert.equal(await balance(), 0);
    });
  }
});

test('a cancellation e-mail that fails (the buyer was deleted) still restores the stock and answers success', async (t) => {
  const logs = captureLogs(t);
  t.mock.method(environment, 'isProduction', () => true);
  const order = await creditOrder({ storeCredit: 0, storeCreditTransaction: null });
  const stockBefore = await stock();
  await User().deleteOne({ _id: shopper.user._id });

  const res = await call('POST', `/orders/admin-cancel/${order._id}`, {
    uniqueId: order.orderId,
    userId: String(shopper.user._id),
    reason: 'Out of stock',
    notify: true,
  });
  assertBody(res, 200, CANCELLED_OK);
  assert.equal((await reload(order)).orderStatus, 'cancelled');
  assert.equal(await stock(), stockBefore + 1);
  assert.ok(messagesAt(logs).includes(`Cancelled order ${order.orderId}: the cancellation e-mail could not be sent`));
});
