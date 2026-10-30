const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, loadCatalog, messagesAt, startTestApp } = require('./helpers');
const { createOrder, razorpaySignature } = require('./helpers/fixtures/orders');

// PLAN.md Phase 4 "Fix legacy bugs", sub-step b: cancelling an order (shopper or admin) gives back the store credit it
// spent, with the refunds' durable return (`storeCreditReturn` pending → crediting → returned, one `RF-<order _id>`
// CREDIT row, the balance step keyed by `appliedCreditIds`). A paid order can be cancelled and then refunded (the
// refund webhook applies to a cancelled order), so the credit is given back once per order whichever comes first,
// also when they race. A return cut short answers 500, is logged, and is finished by an admin cancel or a refund event
// (the shopper's cancel route would too, but the storefront offers Cancel only for paid, confirmed or shipped orders).
// Legacy: a cancel gave nothing back (a later full refund did).

const { badRequest, ok, serverError } = envelopes;
const WEBHOOK_OK = { status: 'ok' };
const CANCELLED_OK = ok('ORDER_CANCEL_SUCCESS', {});

const Order = () => mongoose.model('order');
const User = () => mongoose.model('user');
const Transactions = () => mongoose.model('store_credit_transactions');

let api;
let admin;
let shopper;

const balance = async () => (await User().findById(shopper.user._id)).storeCredit;
const credits = () => Transactions().find({ action: 'CREDIT' });
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

// Given back exactly once: the balance, one RF- row for the order, the order marked returned.
const assertReturnedOnce = async (order) => {
  assert.equal(await balance(), 50);
  const rows = await credits();
  assert.deepEqual(
    rows.map((row) => [row.creditId, row.amount, String(row.orderId)]),
    [[`RF-${order._id}`, 50, String(order._id)]],
  );
  assert.equal((await reload(order)).storeCreditReturn, 'returned');
  const user = await User().findById(shopper.user._id).select('+appliedCreditIds');
  assert.deepEqual([...user.appliedCreditIds], [`RF-${order._id}`]);
};

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
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

test('a shopper cancel gives back the store credit the order spent, once', async () => {
  for (const orderStatus of ['paid', 'confirmed']) {
    await Promise.all([Order().deleteMany({}), Transactions().deleteMany({}), User().updateOne({ _id: shopper.user._id }, { storeCredit: 0, $unset: { appliedCreditIds: 1 } })]);
    const order = await creditOrder({ orderStatus });
    assertBody(await shopperCancel(order), 200, CANCELLED_OK);
    const cancelled = await reload(order);
    assert.deepEqual(
      [cancelled.orderStatus, cancelled.orderHistory.map((entry) => entry.title), cancelled.requests.map((r) => r.type)],
      ['cancelled', ['cancelled'], ['cancel']],
    );
    await assertReturnedOnce(order);

    // Cancelling again is refused and gives nothing more.
    assertBody(await shopperCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    await assertReturnedOnce(order);
  }
});

test('an admin cancel (shipped included) gives back the store credit, once', async () => {
  const order = await creditOrder({ orderStatus: 'shipped' });
  await Promise.all([adminCancel(order), adminCancel(order), adminCancel(order)]);
  const cancelled = await reload(order);
  assert.deepEqual([cancelled.orderStatus, cancelled.orderHistory.map((entry) => entry.description)], ['cancelled', ['Out of stock']]);
  await assertReturnedOnce(order);
});

test('an order that spent no credit, or whose debit was never linked, gives nothing back', async () => {
  const none = await creditOrder({ storeCredit: 0, storeCreditTransaction: null });
  assertBody(await shopperCancel(none), 200, CANCELLED_OK);
  const unlinked = await creditOrder({ storeCreditTransaction: null });
  assertBody(await adminCancel(unlinked), 200, CANCELLED_OK);

  for (const order of [none, unlinked]) assert.equal((await reload(order)).storeCreditReturn, undefined);
  assert.equal(await balance(), 0);
  assert.equal((await credits()).length, 0);
});

test('cancelled, then fully refunded: the refund records the order refunded but gives nothing again', async () => {
  const order = await creditOrder();
  assertBody(await shopperCancel(order), 200, CANCELLED_OK);
  assertBody(await refund(), 200, WEBHOOK_OK);
  assertBody(await refund(), 200, WEBHOOK_OK);

  const refunded = await reload(order);
  assert.deepEqual(
    [refunded.orderStatus, refunded.orderHistory.map((entry) => entry.title), [...refunded.refundIds]],
    ['refunded', ['cancelled', 'refunded'], ['rfnd_test_c']],
  );
  await assertReturnedOnce(order);
});

test('fully refunded first: the order can no longer be cancelled, and the credit came back once', async () => {
  const order = await creditOrder({ orderStatus: 'returned' });
  assertBody(await refund(), 200, WEBHOOK_OK);
  assertBody(await shopperCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  assertBody(await adminCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  assert.equal((await reload(order)).orderStatus, 'refunded');
  await assertReturnedOnce(order);
});

test('a cancel and a full refund racing give the credit back once', async () => {
  for (let round = 0; round < 5; round += 1) {
    await Promise.all([Order().deleteMany({}), Transactions().deleteMany({}), User().updateOne({ _id: shopper.user._id }, { storeCredit: 0, $unset: { appliedCreditIds: 1 } })]);
    const order = await creditOrder();
    const [cancel, refunded] = await Promise.all([round % 2 ? adminCancel(order) : shopperCancel(order), refund()]);
    // The loser of the race: 400 when the refund landed before the cancel's read, 409 between its read and write.
    assert.ok([200, 400, 409].includes(cancel.status), JSON.stringify(cancel.body));
    assertBody(refunded, 200, WEBHOOK_OK);
    assert.equal((await reload(order)).orderStatus, 'refunded');
    await assertReturnedOnce(order);
  }
});

test('a refund that read the order before a cancel started its return records the refund without a second return', async (t) => {
  const order = await creditOrder();
  const original = Order().updateOne;
  let cancelledMeanwhile = false;
  t.mock.method(Order(), 'updateOne', async function (filter, ...rest) {
    if (!cancelledMeanwhile && filter?.refundIds) {
      cancelledMeanwhile = true;
      // The cancel lands between the refund's read and its update (the cancel's own return is left pending).
      await Order().collection.updateOne({ _id: order._id }, { $set: { orderStatus: 'cancelled', storeCreditReturn: 'pending' } });
    }
    return original.call(this, filter, ...rest);
  });

  assertBody(await refund(), 200, WEBHOOK_OK);
  assert.ok(cancelledMeanwhile);
  const refunded = await reload(order);
  assert.deepEqual([refunded.orderStatus, [...refunded.refundIds]], ['refunded', ['rfnd_test_c']]);
  // The refund finished the cancel's unfinished return (the same RF- row and credit id), once.
  await assertReturnedOnce(order);
});

test('a cancel whose balance step fails answers 500, stays cancelled and crediting; cancelling again finishes it', async (t) => {
  const logs = captureLogs(t);
  const order = await creditOrder();
  failWhen(t, User(), 'updateOne', isBalanceIncrement);

  assertBody(await shopperCancel(order), 500, serverError);
  const cut = await reload(order);
  assert.deepEqual([cut.orderStatus, cut.storeCreditReturn, await balance()], ['cancelled', 'crediting', 0]);
  assert.equal(
    messagesAt(logs).find((message) => message.startsWith('Cancelled order')),
    `Cancelled order ${order.orderId}: adding CREDIT transaction RF-${order._id} (50) to the balance failed; an admin cancel or a refund event retries it`,
  );
  // The cut-short return is logged with its state, so staff can find and finish it.
  assert.ok(
    messagesAt(logs).includes(
      `Cancelled order ${order.orderId} is cancelled, but its store credit return is left crediting; an admin cancel or a refund event finishes it`,
    ),
  );

  t.mock.restoreAll();
  assertBody(await shopperCancel(order), 200, CANCELLED_OK);
  await assertReturnedOnce(order);
  // The retry only finished the return: one history entry and one request.
  const finished = await reload(order);
  assert.deepEqual([finished.orderHistory.length, finished.requests.length], [1, 1]);
  assertBody(await adminCancel(order), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
});

test('a cancel cut short before its CREDIT row is left pending; an admin cancel or a refund event finishes it', async (t) => {
  const order = await creditOrder({ orderStatus: 'confirmed' });
  failWhen(t, Transactions(), 'findOneAndUpdate', () => true);
  assertBody(await adminCancel(order), 500, serverError);
  assert.deepEqual([(await reload(order)).storeCreditReturn, await balance(), (await credits()).length], ['pending', 0, 0]);
  t.mock.restoreAll();
  assertBody(await adminCancel(order), 200, CANCELLED_OK);
  await assertReturnedOnce(order);

  // The same cut, finished by the refund webhook instead.
  await Promise.all([Order().deleteMany({}), Transactions().deleteMany({}), User().updateOne({ _id: shopper.user._id }, { storeCredit: 0, $unset: { appliedCreditIds: 1 } })]);
  const paid = await creditOrder();
  failWhen(t, Transactions(), 'findOneAndUpdate', () => true);
  assertBody(await shopperCancel(paid), 500, serverError);
  t.mock.restoreAll();
  assertBody(await refund(), 200, WEBHOOK_OK);
  assert.equal((await reload(paid)).orderStatus, 'refunded');
  await assertReturnedOnce(paid);
});
