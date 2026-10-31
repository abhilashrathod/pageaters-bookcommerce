const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, eventually, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, fillCart, loadOrderCatalog, orderIds, razorpaySignature } = require('./helpers/fixtures/orders');
const payments = require('../src/adapters/payments');

// Checkout over HTTP: POST /orders/attempt, POST /orders/create (pricing, COD and online), PATCH /orders/credit,
// GET /orders/retrieve and the Razorpay payment webhook POST /orders/confirm. Written against the legacy controller
// first; envelopes are pinned as raw JSON (key order included).

const { badRequest, forbidden, ok, serverError } = envelopes;
const joiError = envelopes.badRequestObject;
const unauthorized = envelopes.unauthorized('NO_AUTH_HEADER');
const WEBHOOK_OK = { status: 'ok' };

const Order = () => mongoose.model('order');
const Book = () => mongoose.model('storeBook');
const User = () => mongoose.model('user');
const Cart = () => mongoose.model('cart');

const unit = (price, discount) => price - (discount * price) / 100;
const GIFT = { isGift: false };

let api;
let shopper;
let address;
let cartCookie;

const post = (path, body, cookie = cartCookie) => api.request(path, { method: 'POST', body, cookie });

// The webhook needs the x-razorpay-signature header, which api.request doesn't send.
const webhook = async (path, payload, signature) => {
  const raw = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json' };
  if (signature !== undefined) headers['x-razorpay-signature'] = signature === true ? razorpaySignature(raw) : signature;
  const res = await fetch(`${api.baseUrl}${path}`, { method: 'POST', headers, body: raw, signal: AbortSignal.timeout(10_000) });
  return { status: res.status, body: await res.json() };
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
  await loadOrderCatalog();
  shopper = await createUser();
  address = await createAddress(shopper.user);
  const cart = await Cart().findOne({ user: shopper.user._id });
  cartCookie = `${shopper.cookie}; _CID=${cart._id}`;
});

describe('auth on checkout routes', () => {
  for (const [method, path] of [
    ['POST', '/orders/attempt'],
    ['POST', '/orders/create'],
    ['GET', '/orders/retrieve'],
    ['PATCH', '/orders/credit'],
  ]) {
    test(`${method} ${path} without a session answers 401`, async () => {
      assertBody(await api.request(path, { method, body: method === 'GET' ? undefined : {} }), 401, unauthorized);
    });
  }
});

describe('POST /orders/attempt', () => {
  test('creates an attempted order priced from the cart, with flat shipping under 600', async () => {
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    assertBody(await post('/orders/attempt', { address: String(address._id) }), 200, ok('ORDER_ADDRESS_SUCCESS', {}));

    const orders = await Order().find({ userId: shopper.user._id });
    assert.equal(orders.length, 1);
    const [order] = orders;
    assert.match(order.orderId, /^OD-\d{10}$/);
    assert.equal(order.orderStatus, 'attempted');
    assert.equal(String(order.deliveryAddress), String(address._id));
    assert.deepEqual([order.subTotal, order.shipping, order.total], [449, 50, 499]);
  });

  test('ships free above 599 even with a mystery box', async () => {
    await fillCart(shopper.user, { mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1 }] });
    await post('/orders/attempt', { address: String(address._id) });
    const order = await Order().findOne({ userId: shopper.user._id });
    assert.deepEqual([order.subTotal, order.shipping, order.total], [949, 0, 949]);
  });

  test('charges 125 shipping for a mystery box order of 599 or less', async () => {
    await mongoose.model('mystery_box').updateOne({ _id: orderIds.boxOne }, { price: 599, currentDiscount: 0 });
    await fillCart(shopper.user, { mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1 }] });
    await post('/orders/attempt', { address: String(address._id) });
    const order = await Order().findOne({ userId: shopper.user._id });
    assert.deepEqual([order.subTotal, order.shipping, order.total], [599, 125, 724]);
  });

  test('the free-shipping threshold is strictly above 599', async () => {
    await Book().updateOne({ _id: ids.bookOne }, { price: 600, currentDiscount: 0 });
    await Book().updateOne({ _id: ids.bookTwo }, { price: 599, currentDiscount: 0 });
    await fillCart(shopper.user, { products: [{ product: ids.bookTwo, quantity: 1 }] });
    await post('/orders/attempt', { address: String(address._id) });
    assert.equal((await Order().findOne({ userId: shopper.user._id })).shipping, 50);

    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    await post('/orders/attempt', { address: String(address._id) });
    assert.equal((await Order().findOne({ userId: shopper.user._id })).shipping, 0);
  });

  test('floors each cart line: 2 × (499 − 10%) + bundle + box + 3 add-ons', async () => {
    await fillCart(shopper.user, {
      products: [{ product: ids.bookOne, quantity: 2 }],
      bundles: [{ bundle: orderIds.bundleOne, quantity: 1 }],
      mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1 }],
      addOns: [{ addOn: orderIds.addOnOne, quantity: 3 }],
    });
    await post('/orders/attempt', { address: String(address._id) });
    const order = await Order().findOne({ userId: shopper.user._id });
    assert.equal(order.subTotal, 2 * 449 + 639 + 949 + 3 * 84);
  });

  // Phase 4 7c: a restart resets the applied store credit (legacy kept it; it could then exceed a smaller cart).
  test('a second attempt updates the same order, with a new order id, and resets applied store credit', async () => {
    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 1 }] });
    await post('/orders/attempt', { address: String(address._id) });
    const first = await Order().findOne({ userId: shopper.user._id });
    await Order().updateOne({ _id: first._id }, { storeCredit: 20 });

    await fillCart(shopper.user, { products: [{ product: ids.bookOne, quantity: 2 }] });
    await post('/orders/attempt', { address: String(address._id) });
    const orders = await Order().find({ userId: shopper.user._id });
    assert.equal(orders.length, 1);
    assert.equal(String(orders[0]._id), String(first._id));
    assert.notEqual(orders[0].orderId, first.orderId);
    assert.equal(orders[0].subTotal, 898);
    assert.equal(orders[0].storeCredit, 0);
  });

  test('refuses without a cart cookie', async () => {
    assertBody(
      await post('/orders/attempt', { address: String(address._id) }, shopper.cookie),
      400,
      badRequest('ORDER_INFO_ATTEMPT_FAILED'),
    );
  });

  test('refuses an unknown cart', async () => {
    const cookie = `${shopper.cookie}; _CID=${new mongoose.Types.ObjectId()}`;
    assertBody(await post('/orders/attempt', { address: String(address._id) }, cookie), 400, badRequest('CART_NOT_EXIST'));
  });

  // Phase 4: a cart cookie that is not a cart id counts as none (was: 'nope' answered 500, and a JSON cookie such as
  // `j:{"$ne":null}` reached Cart.findOne as an operator and priced whichever cart matched).
  test('a malformed cart cookie, operator objects included, counts as no cart', async () => {
    const other = await createUser();
    await fillCart(other.user, { products: [{ product: ids.bookTwo, quantity: 3 }] });
    for (const value of ['nope', encodeURIComponent('j:{"$ne":null}')]) {
      const cookie = `${shopper.cookie}; _CID=${value}`;
      assertBody(await post('/orders/attempt', { address: String(address._id) }, cookie), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    }
    assert.equal(await Order().countDocuments(), 0);
  });

  // Phase 4 7c: the cart must be the shopper's own (legacy priced another user's cart).
  test("refuses another user's cart", async () => {
    const other = await createUser();
    await fillCart(other.user, { products: [{ product: ids.bookTwo, quantity: 3 }] });
    const otherCart = await Cart().findOne({ user: other.user._id });
    const res = await post('/orders/attempt', { address: String(address._id) }, `${shopper.cookie}; _CID=${otherCart._id}`);
    assertBody(res, 400, badRequest('CART_NOT_EXIST'));
    assert.equal(await Order().countDocuments(), 0);
  });

  test("refuses another user's address, a deleted address and an unknown address", async () => {
    const other = await createUser();
    const othersAddress = await createAddress(other.user);
    const deleted = await createAddress(shopper.user, { isDeleted: true });
    for (const id of [othersAddress._id, deleted._id, new mongoose.Types.ObjectId()]) {
      assertBody(await post('/orders/attempt', { address: String(id) }), 400, badRequest('ORDER_ADDRESS_ATTEMPT_FAILED'));
    }
    assert.equal(await Order().countDocuments(), 0);
  });

  test('refuses a malformed address id (validator)', async () => {
    assertBody(await post('/orders/attempt', { address: 'nope' }), 400, joiError('INVALID_ID'));
  });

  // Phase 4: the address id is required (was: a missing address reached the service, ORDER_ADDRESS_ATTEMPT_FAILED).
  test('refuses a missing address id (validator)', async () => {
    assertBody(await post('/orders/attempt', {}), 400, joiError('INVALID_ID'));
  });
});

const attemptWith = async (items) => {
  await fillCart(shopper.user, items);
  const res = await post('/orders/attempt', { address: String(address._id) });
  assert.equal(res.status, 200);
  return Order().findOne({ userId: shopper.user._id });
};

const FULL_CART = {
  products: [{ product: ids.bookOne, quantity: 2 }],
  bundles: [{ bundle: orderIds.bundleOne, quantity: 1 }],
  mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1, preferences: { preferredGenres: 'Test genre' } }],
  addOns: [{ addOn: orderIds.addOnOne, quantity: 3 }],
};

describe('POST /orders/create — pricing', () => {
  beforeEach(async () => {
    await Book().updateOne({ _id: ids.bookOne }, { weight: 300 });
  });

  test('COD: totals, floored order lines, weight, gift charges and confirmation', async () => {
    const attempted = await attemptWith(FULL_CART);
    const giftOptions = { isGift: true, details: { package: 'Standard', from: 'Test Sender', message: 'Enjoy', cost: 79 } };
    const res = await post('/orders/create', { method: 'cod', instructions: 'Ring twice', giftOptions });

    const subTotal = 2 * 449 + 639 + 949 + 3 * 84;
    assertBody(res, 200, ok('ORDER_CREATE_SUCCESS', { total: subTotal + 0 + 79, orderId: attempted.orderId }));

    const order = await Order().findById(attempted._id);
    assert.equal(order.orderStatus, 'confirmed');
    assert.deepEqual([order.subTotal, order.shipping, order.storeCredit, order.total], [subTotal, 0, 0, subTotal + 79]);
    assert.equal(order.weight, 2 * 300 + 700 + 900);
    assert.equal(order.deliveryInstructions, 'Ring twice');
    assert.equal(order.razorOrderId, '');
    assert.deepEqual(order.payment, { method: 'cod' });
    assert.deepEqual(order.toObject().giftOptions, giftOptions);
    assert.equal(order.giftCard, null);
    assert.equal(order.discount, null);
    assert.ok(!Number.isNaN(Date.parse(order.orderDate)));
    assert.deepEqual(
      order.orderHistory.map((entry) => entry.title),
      ['confirmed'],
    );

    // Phase 4 7c: order lines are floored per unit like the cart, so they add up to the subtotal (legacy stored
    // 898.2 here while the subtotal counted 898).
    const [product] = order.products;
    assert.deepEqual(
      [product.quantity, product.price, product.discount, product.productTotal, product.weight],
      [2, 499, 10, 2 * Math.floor(unit(499, 10)), 600],
    );
    assert.equal(String(product.product), String(ids.bookOne));
    const [bundle] = order.bundles;
    assert.deepEqual([bundle.quantity, bundle.price, bundle.discount, bundle.total, bundle.weight], [1, 799, 20, 639, 700]);
    assert.equal(String(bundle.bundle), String(orderIds.bundleOne));
    // Stored as references, though the placed order in memory holds the populated product and bundle (for the e-mail).
    const stored = await mongoose.connection.collection('orders').findOne({ _id: order._id });
    assert.ok(stored.bundles[0].bundle instanceof mongoose.Types.ObjectId && stored.products[0].product instanceof mongoose.Types.ObjectId);
    const [box] = order.boxes;
    assert.deepEqual([box.quantity, box.price, box.discount, box.total, box.weight], [1, 999, 5, 949, 900]);
    assert.equal(box.preferences.preferredGenres, 'Test genre');
    const [addOn] = order.addOns;
    assert.deepEqual([addOn.quantity, addOn.price, addOn.discount, addOn.total], [3, 99, 15, 3 * 84]);
    assert.equal(product.productTotal + bundle.total + box.total + addOn.total, order.subTotal);
  });

  test('gift charges count only when isGift is true', async () => {
    await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    const res = await post('/orders/create', { method: 'cod', giftOptions: { isGift: false, details: { package: 'Premium', cost: 30 } } });
    assert.equal(res.body.data.total, 449 + 50);
  });

  // Phase 4 7c: legacy charged the cost the request sent (any amount, 0 included).
  test('charges the server price of the gift package and stores it, whatever cost the request sends', async () => {
    for (const [name, price] of [['Basic', 49], ['Standard', 79], ['Premium', 99]]) {
      await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
      const res = await post('/orders/create', { method: 'cod', giftOptions: { isGift: true, details: { package: name, cost: 0 } } });
      assert.equal(res.body.data.total, 449 + 50 + price);
      assert.equal((await Order().findOne({ orderId: res.body.data.orderId })).giftOptions.details.cost, price);
    }
  });

  test('refuses a gift without a known package, before anything changes', async () => {
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    for (const giftOptions of [{ isGift: true }, { isGift: true, details: { cost: 49 } }, { isGift: true, details: { package: 'Gold', cost: 1 } }]) {
      assertBody(await post('/orders/create', { method: 'cod', giftOptions }), 400, badRequest('INVALID_REQUEST'));
    }
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
  });

  test('subtracts store credit applied to the order and debits it from the user', async () => {
    await User().updateOne({ _id: shopper.user._id }, { storeCredit: 100 });
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    await Order().updateOne({ _id: attempted._id }, { storeCredit: 40 });

    const res = await post('/orders/create', { method: 'cod', giftOptions: GIFT });
    assertBody(res, 200, ok('ORDER_CREATE_SUCCESS', { total: 449 + 50 - 40, orderId: attempted.orderId }));

    assert.equal((await User().findById(shopper.user._id)).storeCredit, 60);
    const transactions = await mongoose.model('store_credit_transactions').find({ userId: shopper.user._id });
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].action, 'DEBIT');
    assert.equal(transactions[0].amount, 40);
    assert.equal(String(transactions[0].orderId), String(attempted._id));
    assert.match(transactions[0].creditId, /^SC-\d{10}$/);
    const order = await Order().findById(attempted._id);
    assert.equal(String(order.storeCreditTransaction), String(transactions[0]._id));
  });

  test('COD deducts book stock (bundled books too), not boxes or add-ons, and empties the cart', async () => {
    await attemptWith(FULL_CART);
    await post('/orders/create', { method: 'cod', giftOptions: GIFT });

    const inventories = async () =>
      (
        await Book()
          .find({ _id: mongoose.trusted({ $in: [ids.bookOne, ids.bookTwo] }) })
          .sort({ _id: 1 })
      ).map((b) => b.inventory);
    assert.deepEqual(
      await eventually(async () => {
        const values = await inventories();
        return values[0] === 25 - 2 - 1 && values[1] === 25 - 1 ? values : undefined;
      }),
      [22, 24],
    );
    assert.equal((await mongoose.model('mystery_box').findById(orderIds.boxOne)).inventory, 10);
    assert.equal((await mongoose.model('add_on').findById(orderIds.addOnOne)).inventory, 50);

    const cart = await Cart().findOne({ user: shopper.user._id });
    assert.deepEqual(
      [cart.products.length, cart.bundles.length, cart.mysteryBoxes.length, cart.addOns.length, cart.subTotal],
      [0, 0, 0, 0, 0],
    );
  });
});

describe('POST /orders/create — online payment (mock payments adapter)', () => {
  test('creates a payment order for the total in paise and waits for payment', async () => {
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });

    const res = await post('/orders/create', { method: 'online', giftOptions: GIFT });
    const created = payments.list();
    assert.equal(created.length, 1);
    const [paymentOrder] = created;
    assert.match(paymentOrder.id, /^order_mock[0-9a-f]{14}$/);
    assertBody(res, 200, ok('ORDER_CREATE_SUCCESS', { razorOrderId: paymentOrder.id, razorKeyId: 'rzp_test_mock', total: 499, orderId: attempted.orderId }));
    assert.equal(
      JSON.stringify({ amount: paymentOrder.amount, currency: paymentOrder.currency, receipt: paymentOrder.receipt }),
      JSON.stringify({ amount: 49900, currency: 'INR', receipt: `${attempted.orderId}-RCPTID` }),
    );

    const order = await Order().findById(attempted._id);
    assert.equal(order.orderStatus, 'created');
    assert.equal(order.razorOrderId, paymentOrder.id);
    assert.equal(order.payment, null);
    assert.deepEqual(order.orderHistory, []);
    // Nothing is deducted until the payment webhook.
    assert.equal((await Book().findById(ids.bookOne)).inventory, 25);
    assert.equal((await Cart().findOne({ user: shopper.user._id })).products.length, 1);
  });

  test('a created (unpaid) order can be created again with a new payment order', async () => {
    await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    const first = await post('/orders/create', { method: 'online', giftOptions: GIFT });
    const res = await post('/orders/create', { method: 'online', giftOptions: GIFT });
    const [one, two] = payments.list();
    assert.equal(res.body.data.razorOrderId, two.id);
    assert.equal(first.body.data.razorOrderId, one.id);
    assert.notEqual(one.id, two.id);
    assert.equal(await Order().countDocuments({ userId: shopper.user._id }), 1);
  });

  test('answers 500 and leaves the order attempted when the payment order fails', async (t) => {
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    t.mock.method(payments, 'createOrder', async () => {
      throw Object.assign(new Error('Payment order failed'), { status: 503 });
    });
    assertBody(await post('/orders/create', { method: 'online', giftOptions: GIFT }), 500, serverError);
    assert.equal((await Order().findById(attempted._id)).orderStatus, 'attempted');
  });

  test('end to end: checkout, then the signed payment webhook marks the order paid', async () => {
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    const res = await post('/orders/create', { method: 'online', giftOptions: GIFT });
    const { razorOrderId } = res.body.data;
    const event = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_e2e', order_id: razorOrderId, method: 'upi', status: 'captured', currency: 'INR', amount: 49900 } } },
    };
    assertBody(await webhook('/orders/confirm', event, true), 200, WEBHOOK_OK);

    const paid = await Order().findById(attempted._id);
    assert.deepEqual([paid.orderStatus, paid.razorPaymentId], ['paid', 'pay_test_e2e']);
    assert.equal((await Cart().findOne({ user: shopper.user._id })).products.length, 0);
    assert.equal(await eventually(async () => ((await Book().findById(ids.bookOne)).inventory === 24 ? 24 : undefined)), 24);
  });
});

describe('POST /orders/create — refusals', () => {
  test('refuses an unknown payment method (validator)', async () => {
    assertBody(await post('/orders/create', { method: 'cash', giftOptions: GIFT }), 400, joiError('INVALID_PAYMENT_METHOD'));
  });

  test('refuses without a cart cookie', async () => {
    await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    assertBody(
      await post('/orders/create', { method: 'cod', giftOptions: GIFT }, shopper.cookie),
      400,
      badRequest('ORDER_INFO_ATTEMPT_FAILED'),
    );
  });

  test('refuses without an attempted or created order', async () => {
    await createOrder(shopper.user, { orderStatus: 'paid' });
    assertBody(await post('/orders/create', { method: 'cod', giftOptions: GIFT }), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  });

  test("refuses another user's cart", async () => {
    await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    const other = await createUser();
    const otherCart = await Cart().findOne({ user: other.user._id });
    const res = await post('/orders/create', { method: 'cod', giftOptions: GIFT }, `${shopper.cookie}; _CID=${otherCart._id}`);
    assertBody(res, 400, badRequest('CART_NOT_EXIST'));
  });

  // Phase 4 legacy bugs: no giftOptions means no gift (legacy answered 500; the request contract makes it optional).
  test('places the order without gift charges when giftOptions is missing', async () => {
    const attempted = await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    assertBody(await post('/orders/create', { method: 'cod' }), 200, ok('ORDER_CREATE_SUCCESS', { total: 449 + 50, orderId: attempted.orderId }));
    const order = await Order().findById(attempted._id);
    assert.equal(order.orderStatus, 'confirmed');
    assert.equal(order.giftOptions.isGift, false);
  });

  test('legacy: answers 500 when the cart holds a book soft-deleted since', async () => {
    await attemptWith({ products: [{ product: ids.bookOne, quantity: 1 }] });
    await Book().updateOne({ _id: ids.bookOne }, { isDeleted: true });
    assertBody(await post('/orders/create', { method: 'cod', giftOptions: GIFT }), 500, serverError);
  });
});

describe('PATCH /orders/credit', () => {
  let order;
  const patch = (body) => api.request('/orders/credit', { method: 'PATCH', body, cookie: shopper.cookie });

  beforeEach(async () => {
    await User().updateOne({ _id: shopper.user._id }, { storeCredit: 100 });
    order = await createOrder(shopper.user, { orderStatus: 'attempted', total: 80 });
  });

  test('applies credit up to the user balance and the order total', async () => {
    assertBody(await patch({ uniqueId: order.orderId, amount: 80 }), 200, ok('ORDER_UPDATE_SUCCESS', {}));
    assert.equal((await Order().findById(order._id)).storeCredit, 80);
    // The user's balance moves only when the order is confirmed or paid.
    assert.equal((await User().findById(shopper.user._id)).storeCredit, 100);
  });

  test('refuses more than the balance (checked before negative amounts and the total)', async () => {
    assertBody(await patch({ uniqueId: order.orderId, amount: 101 }), 400, badRequest('STORE_CREDIT_UNAVAILABLE'));
  });

  // Phase 4: the validator refuses it (object-form 400; was the service's string-form STORE_CREDIT_NEGATIVE), and a
  // non-number (was a cast error, 500), more than two decimals or more than 100000 with INVALID_AMOUNT.
  test('refuses a negative, non-numeric, sub-paise or huge amount, and a malformed order id', async () => {
    assertBody(await patch({ uniqueId: order.orderId, amount: -1 }), 400, joiError('STORE_CREDIT_NEGATIVE'));
    for (const amount of ['5', null, 1.005, 100_001]) {
      assertBody(await patch({ uniqueId: order.orderId, amount }), 400, joiError('INVALID_AMOUNT'));
    }
    assertBody(await patch({ uniqueId: { $ne: null }, amount: 1 }), 400, joiError('ORDER_INFO_ATTEMPT_FAILED'));
    assert.equal((await Order().findById(order._id)).storeCredit, 0);
  });

  test('refuses more than the order total', async () => {
    assertBody(await patch({ uniqueId: order.orderId, amount: 81 }), 400, badRequest('STORE_CREDIT_SURPLUS'));
  });

  test("refuses another user's order and an unknown order", async () => {
    const other = await createUser();
    const othersOrder = await createOrder(other.user, { orderStatus: 'attempted' });
    for (const uniqueId of [othersOrder.orderId, 'OD-0000000000']) {
      assertBody(await patch({ uniqueId, amount: 1 }), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
    }
    assert.equal((await Order().findById(othersOrder._id)).storeCredit, 0);
  });

  // Phase 4 7c: legacy applied credit to an order in any stage, even a delivered one.
  test('refuses an order that is no longer attempted', async () => {
    // One pending order per user (unique index): the attempted one from beforeEach goes, so a created one can exist.
    await Order().deleteOne({ _id: order._id });
    for (const orderStatus of ['created', 'confirmed', 'paid', 'fulfilled']) {
      const placed = await createOrder(shopper.user, { orderStatus, storeCredit: 5 });
      assertBody(await patch({ uniqueId: placed.orderId, amount: 10 }), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
      assert.equal((await Order().findById(placed._id)).storeCredit, 5);
    }
  });
});

describe('GET /orders/retrieve', () => {
  test("returns the shopper's attempted order with the checkout projection", async () => {
    await createOrder(shopper.user, { orderStatus: 'paid' });
    const attempted = await createOrder(shopper.user, { orderStatus: 'attempted', deliveryAddress: address._id, storeCredit: 5 });
    const res = await api.request('/orders/retrieve', { cookie: shopper.cookie });
    assert.equal(res.status, 200);
    assert.equal(JSON.stringify(Object.keys(res.body)), JSON.stringify(['statusCode', 'status', 'message', 'data']));
    assert.equal(res.body.status, 'ORDER_LIST_SUCCESS');
    const { data } = res.body;
    assert.equal(data.orderId, attempted.orderId);
    // Phase 4 legacy bugs (b): `boxes` is selected (legacy misspelt it `boxed`; populated, it joined anyway).
    assert.deepEqual(Object.keys(data).sort(), [
      '_id',
      'addOns',
      'boxes',
      'bundles',
      'deliveryAddress',
      'deliveryInstructions',
      'giftOptions',
      'id',
      'orderDate',
      'orderHistory',
      'orderId',
      'products',
      'shipping',
      'storeCredit',
      'subTotal',
      'total',
      'userId',
    ]);
    assert.equal(data.deliveryAddress.addressLine1, address.addressLine1);
    assert.deepEqual(Object.keys(data.products[0].product).sort(), [
      '_id',
      'author',
      'bookId',
      'currentDiscount',
      'id',
      'poster',
      'price',
      'title',
    ]);
    assert.equal(
      JSON.stringify(data.products[0].product.author),
      JSON.stringify({ _id: String(ids.authorA), name: 'Test Author A', avatar: '', id: String(ids.authorA) }),
    );
  });

  test('returns a created (awaiting payment) order too', async () => {
    const created = await createOrder(shopper.user, { orderStatus: 'created' });
    const res = await api.request('/orders/retrieve', { cookie: shopper.cookie });
    assert.equal(res.body.data.orderId, created.orderId);
  });

  test("refuses when there is none, and never returns another user's", async () => {
    const other = await createUser();
    await createOrder(other.user, { orderStatus: 'attempted' });
    assertBody(await api.request('/orders/retrieve', { cookie: shopper.cookie }), 400, badRequest('ORDER_INFO_ATTEMPT_FAILED'));
  });
});

describe('POST /orders/confirm (Razorpay payment webhook)', () => {
  let order;
  const paymentEvent = (orderId = 'order_test_1') => ({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_1',
          order_id: orderId,
          method: 'card',
          status: 'captured',
          currency: 'INR',
          amount: 49900,
          card: { name: 'Test Card', last4: '1111', network: 'Visa' },
        },
      },
    },
  });

  beforeEach(async () => {
    await User().updateOne({ _id: shopper.user._id }, { storeCredit: 100 });
    await fillCart(shopper.user, {
      products: [{ product: ids.bookOne, quantity: 2 }],
      bundles: [{ bundle: orderIds.bundleOne, quantity: 1 }],
    });
    order = await createOrder(shopper.user, {
      orderStatus: 'created',
      razorOrderId: 'order_test_1',
      storeCredit: 30,
      products: [{ quantity: 2, price: 499, discount: 10, productTotal: 898.2, product: ids.bookOne }],
      bundles: [{ quantity: 1, price: 799, discount: 20, total: 639.2, bundle: orderIds.bundleOne }],
    });
  });

  test('marks a created order paid with a valid signature and runs the post-payment steps', async () => {
    const event = paymentEvent();
    assertBody(await webhook('/orders/confirm', event, true), 200, WEBHOOK_OK);

    const paid = await Order().findById(order._id);
    assert.equal(paid.orderStatus, 'paid');
    assert.equal(paid.razorPaymentId, 'pay_test_1');
    // Phase 4 7c: a payment summary, without the card holder name (legacy stored the raw entity).
    const { card, ...rest } = event.payload.payment.entity;
    assert.deepEqual(paid.payment, { ...rest, card: { last4: card.last4, network: card.network } });
    assert.deepEqual(
      paid.orderHistory.map((entry) => entry.title),
      ['paid'],
    );

    assert.equal((await User().findById(shopper.user._id)).storeCredit, 70);
    const transaction = await mongoose.model('store_credit_transactions').findOne({ userId: shopper.user._id });
    assert.equal(transaction.amount, 30);
    assert.equal(String(paid.storeCreditTransaction), String(transaction._id));

    assert.equal((await Cart().findOne({ user: shopper.user._id })).products.length, 0);
    const stock = await eventually(async () => {
      const books = await Book()
        .find({ _id: mongoose.trusted({ $in: [ids.bookOne, ids.bookTwo] }) })
        .sort({ _id: 1 });
      const values = books.map((b) => b.inventory);
      return values[0] === 22 && values[1] === 24 ? values : undefined;
    });
    assert.deepEqual(stock, [22, 24]);
  });

  test('answers ok and changes nothing without a signature', async () => {
    assertBody(await webhook('/orders/confirm', paymentEvent()), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
  });

  test('answers ok and changes nothing with a wrong signature or one over another body', async () => {
    const event = paymentEvent();
    for (const signature of ['0'.repeat(64), razorpaySignature(JSON.stringify(event), 'not-the-secret'), razorpaySignature('{}')]) {
      assertBody(await webhook('/orders/confirm', event, signature), 200, WEBHOOK_OK);
    }
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
    assert.equal((await User().findById(shopper.user._id)).storeCredit, 100);
  });

  test('answers ok for an unknown Razorpay order', async () => {
    assertBody(await webhook('/orders/confirm', paymentEvent('order_unknown'), true), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'created');
  });

  test('a replayed event does nothing once the order is paid', async () => {
    await webhook('/orders/confirm', paymentEvent(), true);
    assertBody(await webhook('/orders/confirm', paymentEvent(), true), 200, WEBHOOK_OK);
    assert.equal((await User().findById(shopper.user._id)).storeCredit, 70);
    assert.equal((await Order().findById(order._id)).orderHistory.length, 1);
  });

  test('ignores an order that is only attempted', async () => {
    await Order().updateOne({ _id: order._id }, { orderStatus: 'attempted' });
    assertBody(await webhook('/orders/confirm', paymentEvent(), true), 200, WEBHOOK_OK);
    assert.equal((await Order().findById(order._id)).orderStatus, 'attempted');
  });
});

describe('admin-only reads refuse a shopper', () => {
  test('a shopper gets 403 on the admin order list', async () => {
    assertBody(await api.request('/orders', { cookie: shopper.cookie }), 403, forbidden);
  });
});
