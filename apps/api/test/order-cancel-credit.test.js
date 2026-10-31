const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, loadCatalog, startTestApp } = require('./helpers');
const { createOrder, razorpaySignature } = require('./helpers/fixtures/orders');

// Store credit works like a coupon: once applied to a placed order it is spent. Cancelling the order (shopper or
// admin) or refunding it never gives it back; a refund returns only the money paid. No cancel after shipping, by the
// shopper or the admin.

const { badRequest, ok } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const CANCELLED_OK = ok('ORDER_CANCEL_SUCCESS', {});

const Order = () => mongoose.model('order');
const User = () => mongoose.model('user');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
let admin;
let shopper;

const balance = async () => (await User().findById(shopper.user._id)).storeCredit;
const reload = (order) => Order().findById(order._id);

// An order that spent 50 of store credit (its DEBIT recorded and linked, the balance already debited), paid online.
const creditOrder = async (overrides) => {
  const debit = await Transactions().create({ userId: shopper.user._id, amount: 50, action: 'DEBIT', creditId: 'SC-0000000002' });
  return createOrder(shopper.user, {
    orderStatus: 'paid',
    razorOrderId: 'order_test_c',
    razorPaymentId: 'pay_test_c',
    storeCredit: 50,
    storeCreditTransaction: debit._id,
    total: 449,
    ...overrides,
  });
};

const shopperCancel = (order) =>
  api.request(`/orders/cancel/${order.orderId}`, { method: 'POST', body: { reason: 'Changed mind' }, cookie: shopper.cookie });
const adminCancel = (order) =>
  api.request(`/orders/admin-cancel/${order._id}`, {
    method: 'POST',
    body: { uniqueId: order.orderId, userId: String(shopper.user._id), reason: 'Out of stock' },
    cookie: admin.cookie,
  });

const FULL_REFUND = {
  event: 'refund.processed',
  payload: {
    refund: { entity: { id: 'rfnd_test_c', payment_id: 'pay_test_c', amount: 44900 } },
    payment: { entity: { id: 'pay_test_c', order_id: 'order_test_c', method: 'upi', amount: 44900, amount_refunded: 44900 } },
  },
};
const refund = async () => {
  const raw = JSON.stringify(FULL_REFUND);
  const res = await fetch(`${api.baseUrl}/orders/refund/processed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': razorpaySignature(raw) },
    body: raw,
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: await res.json() };
};

// The credit stays spent: the balance is unchanged and the only ledger row is the order's DEBIT.
const assertCreditSpent = async () => {
  assert.equal(await balance(), 0);
  assert.deepEqual(
    (await Transactions().find({})).map((row) => [row.action, row.amount]),
    [['DEBIT', 50]],
  );
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
});

test('a shopper or admin cancel of a paid or confirmed order gives no store credit back', async () => {
  for (const cancel of [shopperCancel, adminCancel]) {
    for (const orderStatus of ['paid', 'confirmed']) {
      await Promise.all([Order().deleteMany({}), Transactions().deleteMany({})]);
      const order = await creditOrder({ orderStatus });
      assertBody(await cancel(order), 200, CANCELLED_OK);
      assert.equal((await reload(order)).orderStatus, 'cancelled');
      await assertCreditSpent();

      // Cancelling again is refused.
      assertBody(await cancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    }
  }
});

test('no cancel after shipping: shopper and admin get ORDER_CANCEL_INVALID and the order is unchanged', async () => {
  for (const orderStatus of ['shipped', 'fulfilled', 'return in progress']) {
    await Promise.all([Order().deleteMany({}), Transactions().deleteMany({})]);
    const order = await creditOrder({ orderStatus });
    assertBody(await adminCancel(order), 400, badRequest('ORDER_CANCEL_INVALID'));
    if (orderStatus === 'shipped') assertBody(await shopperCancel(order), 400, badRequest('ORDER_CANCEL_INVALID'));
    assert.deepEqual([(await reload(order)).orderStatus, (await reload(order)).orderHistory.length], [orderStatus, 0]);
    await assertCreditSpent();
  }
});

test('cancelled, then fully refunded: the refund returns only the money paid', async () => {
  const order = await creditOrder();
  assertBody(await shopperCancel(order), 200, CANCELLED_OK);
  assertBody(await refund(), 200, WEBHOOK_OK);
  assertBody(await refund(), 200, WEBHOOK_OK);

  const refunded = await reload(order);
  assert.deepEqual(
    [refunded.orderStatus, refunded.orderHistory.map((entry) => entry.title), [...refunded.refundIds]],
    ['refunded', ['cancelled', 'refunded'], ['rfnd_test_c']],
  );
  await assertCreditSpent();
});

test('fully refunded first: the order can no longer be cancelled and no credit comes back', async () => {
  const order = await creditOrder({ orderStatus: 'returned' });
  assertBody(await refund(), 200, WEBHOOK_OK);
  assertBody(await shopperCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  assertBody(await adminCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  assert.equal((await reload(order)).orderStatus, 'refunded');
  await assertCreditSpent();
});
