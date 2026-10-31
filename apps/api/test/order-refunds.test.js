const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, loadCatalog, startTestApp } = require('./helpers');
const { createOrder, razorpaySignature } = require('./helpers/fixtures/orders');
const { storeCreditSchema } = require('@pageaters/shared');

// PLAN.md Phase 4 "Fix legacy bugs" (refunds): the refund webhook records each refund id once and keeps the latest
// payment summary. A refund returns only the money paid: store credit applied to the order is spent like a coupon and
// never comes back.

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

test('a full refund marks the order refunded once and gives no store credit back', async () => {
  const order = await paidOrder();
  await Promise.all([refund(FULL), refund(FULL)]);
  await refund({ ...FULL, refundId: 'rfnd_test_c' });

  assert.equal((await reload(order)).orderStatus, 'refunded');
  assert.deepEqual(await titles(order), ['refunded']);
  assert.equal(await balance(), 0);
  assert.equal((await credits()).length, 0);
});

test('a full refund after partial refunds records each once and gives no store credit back', async () => {
  const order = await paidOrder();
  await refund({ refundId: 'rfnd_test_a', amount: 20000, refunded: 20000 });
  await refund({ refundId: 'rfnd_test_b', amount: 10000, refunded: 30000 });
  await refund({ refundId: 'rfnd_test_c', amount: 19900, refunded: 49900 });

  assert.deepEqual(await titles(order), ['Partial refund', 'Partial refund', 'refunded']);
  assert.equal((await reload(order)).payment.amount_refunded, 49900);
  assert.equal(await balance(), 0);
  assert.equal((await credits()).length, 0);
});

test('after a full refund the store-credit history holds only the DEBIT and matches the shared contract', async () => {
  await paidOrder();
  await refund(FULL);
  const res = await api.request('/store-credit/history?page=1&limit=10', { cookie: shopper.cookie });
  assert.equal(res.status, 200);
  const { docs } = res.body.data;
  assert.deepEqual(docs.map((doc) => doc.creditId), ['SC-0000000001']);
  for (const doc of docs) {
    const parsed = storeCreditSchema.safeParse(doc);
    assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  }
});
