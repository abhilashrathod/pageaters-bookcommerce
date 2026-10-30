const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, loadCatalog, messagesAt, startTestApp } = require('./helpers');
const { createOrder, razorpaySignature } = require('./helpers/fixtures/orders');
const { storeCreditSchema } = require('@pageaters/shared');

// PLAN.md Phase 4 "Fix legacy bugs", sub-step a (refunds): the refund webhook records each refund id once, keeps the
// latest payment summary, and gives back the store credit a fully refunded order spent, durably: a return cut short
// is left `pending` (a redelivered event finishes it) or `crediting` (the CREDIT transaction exists; only the
// balance needs a check), never issued twice.

const { serverError } = envelopes;
const WEBHOOK_OK = { status: 'ok' };

const Order = () => mongoose.model('order');
const User = () => mongoose.model('user');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
let shopper;

const balance = async () => (await User().findById(shopper.user._id)).storeCredit;
const credits = () => Transactions().find({ action: 'CREDIT' });

const refundEvent = ({ refundId = 'rfnd_test_a', amount = 20000, refunded = 20000 } = {}) => ({
  event: 'refund.processed',
  payload: {
    refund: { entity: { id: refundId, payment_id: 'pay_test_r', amount } },
    payment: {
      entity: { id: 'pay_test_r', order_id: 'order_test_r', method: 'upi', status: 'refunded', amount: 49900, amount_refunded: refunded },
    },
  },
});
const FULL = { refundId: 'rfnd_test_full', amount: 49900, refunded: 49900 };

const refund = async (options) => {
  const raw = JSON.stringify(refundEvent(options));
  const headers = { 'content-type': 'application/json', 'x-razorpay-signature': razorpaySignature(raw) };
  const res = await fetch(`${api.baseUrl}/orders/refund/processed`, {
    method: 'POST',
    headers,
    body: raw,
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: await res.json() };
};

// A returned order paid with Razorpay and 50 of store credit (its DEBIT transaction recorded).
const paidOrder = async (overrides) => {
  const debit = await Transactions().create({ userId: shopper.user._id, amount: 50, action: 'DEBIT', creditId: 'SC-0000000001' });
  return createOrder(shopper.user, {
    orderStatus: 'returned',
    razorOrderId: 'order_test_r',
    razorPaymentId: 'pay_test_r',
    storeCredit: 50,
    storeCreditTransaction: debit._id,
    total: 449,
    ...overrides,
  });
};
const reload = (order) => Order().findById(order._id);
const titles = async (order) => (await reload(order)).orderHistory.map((entry) => entry.title);

// Makes model[method] reject for the matching calls; other calls go through.
const failWhen = (t, model, method, matches) => {
  const original = model[method];
  t.mock.method(model, method, function (...args) {
    if (matches(...args)) return Promise.reject(new Error('Test write failure'));
    return original.apply(this, args);
  });
};
const isBalanceIncrement = (filter, update) => update?.$inc?.storeCredit > 0;

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

test('a redelivered partial refund is recorded once; another refund id is recorded too', async () => {
  const order = await paidOrder();
  await Promise.all([refund(), refund(), refund()]);
  await refund();
  assert.deepEqual(await titles(order), ['Partial refund']);
  assert.deepEqual([...(await reload(order)).refundIds], ['rfnd_test_a']);

  await refund({ refundId: 'rfnd_test_b', amount: 10000, refunded: 30000 });
  assert.deepEqual(await titles(order), ['Partial refund', 'Partial refund']);
  assert.equal(await balance(), 0);
});

test('a refund event without a refund id does nothing', async () => {
  const order = await paidOrder();
  assertBody(await refund({ refundId: '' }), 200, WEBHOOK_OK);
  assert.deepEqual(await titles(order), []);
});

test('an older refund arriving late does not replace the newer payment summary', async () => {
  const order = await paidOrder();
  await refund({ refundId: 'rfnd_test_b', amount: 10000, refunded: 30000 });
  await refund({ refundId: 'rfnd_test_a', amount: 20000, refunded: 20000 });
  const late = await reload(order);
  assert.deepEqual(await titles(order), ['Partial refund', 'Partial refund']);
  assert.equal(late.payment.amount_refunded, 30000);
});

test('a full refund gives back the store credit the order spent, once', async () => {
  const order = await paidOrder();
  await Promise.all([refund(FULL), refund(FULL)]);
  await refund({ ...FULL, refundId: 'rfnd_test_c' });

  const refunded = await reload(order);
  assert.deepEqual([refunded.orderStatus, refunded.storeCreditReturn], ['refunded', 'returned']);
  assert.deepEqual(await titles(order), ['refunded']);
  assert.equal(await balance(), 50);
  const [credit, ...more] = await credits();
  assert.equal(more.length, 0);
  assert.deepEqual(
    [credit.amount, String(credit.orderId), String(credit.userId), credit.creditId],
    [50, String(order._id), String(shopper.user._id), `RF-${order._id}`],
  );
});

test('a full refund after partial refunds gives the credit back once', async () => {
  const order = await paidOrder();
  await refund({ refundId: 'rfnd_test_a', amount: 20000, refunded: 20000 });
  await refund({ refundId: 'rfnd_test_b', amount: 10000, refunded: 30000 });
  await refund({ refundId: 'rfnd_test_c', amount: 19900, refunded: 49900 });

  assert.deepEqual(await titles(order), ['Partial refund', 'Partial refund', 'refunded']);
  assert.equal((await reload(order)).payment.amount_refunded, 49900);
  assert.equal(await balance(), 50);
  assert.equal((await credits()).length, 1);
});

test('a partial refund, or an order whose credit was never debited, gives no credit back', async () => {
  await paidOrder();
  await refund();
  assert.equal(await balance(), 0);

  await Order().deleteMany({});
  const order = await paidOrder({ storeCreditTransaction: null });
  await refund(FULL);
  assert.equal((await reload(order)).storeCreditReturn, undefined);
  assert.equal(await balance(), 0);
  assert.equal((await credits()).length, 0);
});

test('a return cut short before its transaction is left pending, and a redelivery finishes it', async (t) => {
  const order = await paidOrder();
  failWhen(t, Transactions(), 'findOneAndUpdate', () => true);

  assertBody(await refund(FULL), 500, serverError);
  const pending = await reload(order);
  assert.deepEqual([pending.orderStatus, pending.storeCreditReturn], ['refunded', 'pending']);
  assert.equal(await balance(), 0);

  t.mock.restoreAll();
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.equal((await reload(order)).storeCreditReturn, 'returned');
  assert.equal(await balance(), 50);
  assert.equal((await credits()).length, 1);
});

test('an order left pending by a crash is finished by any later refund event for it', async () => {
  const order = await paidOrder({ orderStatus: 'refunded', storeCreditReturn: 'pending', refundIds: ['rfnd_test_full'] });
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.equal((await reload(order)).storeCreditReturn, 'returned');
  assert.equal(await balance(), 50);
  assert.deepEqual(await titles(order), []);
});

test('a failed balance increment is logged and left crediting; a redelivery adds it once', async (t) => {
  const logs = captureLogs(t);
  const order = await paidOrder();
  failWhen(t, User(), 'updateOne', isBalanceIncrement);

  assertBody(await refund(FULL), 500, serverError);
  assert.equal((await reload(order)).storeCreditReturn, 'crediting');
  assert.equal(
    messagesAt(logs)[0],
    `Refunded order ${order.orderId}: adding CREDIT transaction RF-${order._id} (50) to the balance failed; a redelivered refund event retries it`,
  );

  t.mock.restoreAll();
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.equal((await reload(order)).storeCreditReturn, 'returned');
  assert.equal(await balance(), 50);
  assert.equal((await credits()).length, 1);
});

test('a crash after the balance increment: a redelivery marks it returned without adding it again', async (t) => {
  const logs = captureLogs(t);
  const order = await paidOrder();
  failWhen(t, Order(), 'updateOne', (filter, update) => update?.$set?.storeCreditReturn === 'returned');

  assertBody(await refund(FULL), 500, serverError);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance()], ['crediting', 50]);
  assert.equal(
    messagesAt(logs)[0],
    `Refunded order ${order.orderId}: store credit given back (RF-${order._id}), but marking the return returned failed; a redelivered refund event finishes it`,
  );

  t.mock.restoreAll();
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance()], ['returned', 50]);
  assert.equal((await credits()).length, 1);
});

test('a failed pending → crediting write is logged and rejects; a redelivery finishes the return', async (t) => {
  const logs = captureLogs(t);
  const order = await paidOrder();
  failWhen(t, Order(), 'updateOne', (filter, update) => update?.$set?.storeCreditReturn === 'crediting');

  assertBody(await refund(FULL), 500, serverError);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance()], ['pending', 0]);
  assert.equal(
    messagesAt(logs)[0],
    `Refunded order ${order.orderId}: CREDIT transaction RF-${order._id} is recorded, but marking the return crediting failed; a redelivered refund event retries it`,
  );

  t.mock.restoreAll();
  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance()], ['returned', 50]);
  assert.equal((await credits()).length, 1);
});

test('a duplicate key on the RF- upsert (a concurrent insert) is retried and finds the one row', async (t) => {
  const order = await paidOrder();
  const original = Transactions().findOneAndUpdate;
  let thrown = false;
  t.mock.method(Transactions(), 'findOneAndUpdate', function (...args) {
    if (!thrown) {
      thrown = true;
      // The concurrent caller's row lands first; this upsert loses with a duplicate key.
      return original.apply(this, args).then(() => Promise.reject(Object.assign(new Error('E11000 duplicate key'), { code: 11000 })));
    }
    return original.apply(this, args);
  });

  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.ok(thrown);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance()], ['returned', 50]);
  assert.equal((await credits()).length, 1);
});

test('concurrent returns of the same order record one CREDIT row and credit the balance once', async () => {
  const order = await paidOrder({ orderStatus: 'refunded', storeCreditReturn: 'pending', refundIds: ['rfnd_test_full'] });
  await Promise.all([refund(FULL), refund(FULL), refund(FULL), refund(FULL)]);
  assert.equal((await reload(order)).storeCreditReturn, 'returned');
  assert.equal(await balance(), 50);
  assert.equal((await credits()).length, 1);

  // The return steps themselves, run side by side.
  const { addToBalance, recordStoreCreditReturn } = require('../src/services/order-fulfilment.service');
  const other = new mongoose.Types.ObjectId();
  const ids = await Promise.all([1, 2, 3, 4].map(() => recordStoreCreditReturn(other, shopper.user._id, 20)));
  const outcomes = await Promise.all(ids.map((creditId) => addToBalance(shopper.user._id, creditId, 20)));
  assert.equal(await Transactions().countDocuments({ creditId: `RF-${other}` }), 1);
  assert.deepEqual(outcomes.sort(), ['already-applied', 'already-applied', 'already-applied', 'applied']);
  assert.equal(await balance(), 70);
});

test('RF- credit ids are unique; CR- and SC- ids are not constrained', async () => {
  const index = (await Transactions().collection.indexes()).find((entry) => entry.name === 'one_refund_credit_per_order');
  assert.deepEqual([index.key, index.unique], [{ creditId: 1 }, true]);
  const row = { userId: shopper.user._id, amount: 1, action: 'CREDIT' };
  await Transactions().create([{ ...row, creditId: 'CR-0000000001' }, { ...row, creditId: 'CR-0000000001' }]);
  await Transactions().create({ ...row, creditId: 'RF-64d000000000000000000f01' });
  await assert.rejects(Transactions().create({ ...row, creditId: 'RF-64d000000000000000000f01' }), { code: 11000 });
});

test('a missing user is logged and the return left crediting', async (t) => {
  const logs = captureLogs(t);
  const order = await paidOrder();
  await User().deleteOne({ _id: shopper.user._id });

  assertBody(await refund(FULL), 200, WEBHOOK_OK);
  assert.equal((await reload(order)).storeCreditReturn, 'crediting');
  assert.deepEqual(messagesAt(logs), [
    `Refunded order ${order.orderId}: its user no longer exists, so CREDIT transaction RF-${order._id} is on no balance`,
  ]);
});

test('the store-credit history with a returned credit matches the shared contract', async () => {
  await paidOrder();
  await refund(FULL);
  const res = await api.request('/store-credit/history?page=1&limit=10', { cookie: shopper.cookie });
  assert.equal(res.status, 200);
  const { docs } = res.body.data;
  assert.deepEqual(docs.map((doc) => doc.creditId).sort(), [`RF-${docs.find((doc) => doc.action === 'CREDIT').orderId}`, 'SC-0000000001']);
  for (const doc of docs) {
    const parsed = storeCreditSchema.safeParse(doc);
    assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  }
});
