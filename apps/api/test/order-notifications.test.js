const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, ids, loadCatalog, sentEmails, sentTexts, startTestApp } = require('./helpers');

const { createAddress, createOrder, fillCart, loadOrderCatalog, orderIds, razorpaySignature } = require('./helpers/fixtures/orders');
const email = require('../src/adapters/email');
const sms = require('../src/adapters/sms');
const environment = require('../src/helpers/environment.helper');

// The legacy production-only notifications, through the mock adapters: the order confirmation e-mail (public image
// URLs, gift and store-credit lines) and SMS after COD checkout and after the payment webhook, and the
// CANCEL_ORDER / CLOSE_ORDER e-mails. Each test switches the production gate on with
// t.mock.method(environment, 'isProduction'); outside production nothing is sent.

const Order = () => mongoose.model('order');
const Cart = () => mongoose.model('cart');
const User = () => mongoose.model('user');
const EmailLog = () => mongoose.model('log_email');

const POSTER = 'https://images.example.com/test-cover.png';
const GIFT = { isGift: true, details: { package: 'Test wrap', from: 'Test Sender', message: 'Enjoy', cost: 30 } };
const CART = {
  products: [{ product: ids.bookOne, quantity: 2 }],
  bundles: [{ bundle: orderIds.bundleOne, quantity: 1 }],
  mysteryBoxes: [{ box: orderIds.boxOne, quantity: 1, preferences: { preferredGenres: 'Test genre' } }],
};

let api;
let admin;
let shopper;
let address;
let cartCookie;

const production = (t) => t.mock.method(environment, 'isProduction', () => true);
const call = (method, path, body, cookie) => api.request(path, { method, body, cookie });

// Attempts an order for CART (store credit applied when `storeCredit` > 0) and places it cash on delivery.
const checkoutCod = async ({ giftOptions = { isGift: false }, storeCredit = 0 } = {}) => {
  await fillCart(shopper.user, CART);
  assert.equal((await call('POST', '/orders/attempt', { address: String(address._id) }, cartCookie)).status, 200);
  const attempted = await Order().findOne({ userId: shopper.user._id, orderStatus: 'attempted' });
  if (storeCredit > 0) {
    await User().updateOne({ _id: shopper.user._id }, { storeCredit });
    await Order().updateOne({ _id: attempted._id }, { storeCredit });
  }
  const res = await call('POST', '/orders/create', { method: 'cod', giftOptions }, cartCookie);
  assert.equal(res.status, 200);
  return attempted;
};

const smsText = (orderId) =>
  `Hi ${shopper.user.fullName}, Your order#${orderId} has been confirmed! Track your order progress in Account > Orders section. Happy Reading! -- Team Pageaters.`;

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
  const cart = await Cart().findOne({ user: shopper.user._id });
  cartCookie = `${shopper.cookie}; _CID=${cart._id}`;
});

describe('order confirmation (COD checkout)', () => {
  test('outside production nothing is sent', async () => {
    await checkoutCod({ giftOptions: GIFT, storeCredit: 40 });
    assert.deepEqual(sentEmails(), []);
    assert.deepEqual(sentTexts(), []);
    assert.equal(await EmailLog().countDocuments(), 0);
  });

  test('in production: the confirmation e-mail with image URLs, gift and store-credit lines, logged', async (t) => {
    production(t);
    const order = await checkoutCod({ giftOptions: GIFT, storeCredit: 40 });

    const mails = sentEmails();
    assert.equal(mails.length, 1);
    const [mail] = mails;
    assert.deepEqual(
      { from: mail.from, to: mail.to, subject: mail.subject },
      { from: 'no-reply@demo.pageaters.com', to: shopper.user.email, subject: `Order Confirmation #${order.orderId} - Pageaters` },
    );
    // 6b: book, bundle and box images are their stored public URLs, unchanged (was: CDN resizer URLs built from S3
    // keys).
    assert.ok(mail.html.includes(`src="${POSTER}"`), 'book poster URL');
    // Legacy, pinned: checkout stores bundle lines unpopulated, so the bundle has no poster (now an empty src) and
    // its title is empty (the webhook test below has the populated bundle).
    assert.ok(mail.html.includes('src=""'), 'bundle line without its poster');
    assert.ok(mail.html.includes('src="https://images.example.com/test-box.png"'), 'box image URL');
    assert.ok(mail.html.includes('Test Book One') && mail.html.includes('Test Mystery Box'));
    assert.equal(mail.html.includes('Test Bundle One'), false);
    assert.ok(mail.html.includes(shopper.user.fullName));
    assert.ok(mail.html.includes(address.addressLine1));
    // 2 × 449 + 639 + 949 = 2486 (free shipping), + 30 gift − 40 credit.
    assert.match(mail.html, />INR 2486</);
    assert.match(mail.html, /Gift Charges[\s\S]*>INR 30</);
    assert.match(mail.html, /Store Credit[\s\S]*>INR 40</);
    assert.match(mail.html, />INR 2476</);

    const logs = await EmailLog().find().lean();
    assert.equal(logs.length, 1);
    assert.deepEqual(
      { from: logs[0].from, to: logs[0].to, subject: logs[0].subject, html: logs[0].html, emailModule: logs[0].emailModule },
      { ...mail, emailModule: 'ORDER_CONFIRMATION' },
    );
  });

  test('in production: no gift or store-credit line when there is neither', async (t) => {
    production(t);
    await checkoutCod();
    const [mail] = sentEmails();
    assert.match(mail.html, />INR 2486</);
    // GIFT_CHARGES is -1 without a gift; STORE_CREDIT 0.
    assert.doesNotMatch(mail.html, /Gift Charges|Store Credit/);
  });

  test('in production: the confirmation SMS to +91<number>', async (t) => {
    production(t);
    const order = await checkoutCod();
    assert.deepEqual(sentTexts(), [{ to: `+91${shopper.user.contactNo}`, body: smsText(order.orderId) }]);
  });

  test('in production: no SMS for an account without a number; a nameless account is greeted by its e-mail', async (t) => {
    production(t);
    await User().updateOne({ _id: shopper.user._id }, { contactNo: '' });
    await checkoutCod();
    assert.deepEqual(sentTexts(), []);
    assert.equal(sentEmails().length, 1);

    await User().updateOne({ _id: shopper.user._id }, { contactNo: '9000000077', fullName: '' });
    const order = await checkoutCod();
    assert.deepEqual(sentTexts(), [
      {
        to: '+919000000077',
        body: `Hi ${shopper.user.email.split('@')[0]}, Your order#${order.orderId} has been confirmed! Track your order progress in Account > Orders section. Happy Reading! -- Team Pageaters.`,
      },
    ]);
  });

  test('a failed SMS or e-mail never fails the order; the failure is logged without the recipient', async (t) => {
    production(t);
    t.mock.method(sms, 'send', async () => {
      throw new Error(`SMS down for ${shopper.user.contactNo}`);
    });
    t.mock.method(email, 'send', async (message) => {
      throw new Error(`Mail down for ${message.to}`);
    });
    const errors = t.mock.method(console, 'error', () => {});

    const order = await checkoutCod({ giftOptions: GIFT });
    assert.equal((await Order().findById(order._id)).orderStatus, 'confirmed');
    assert.equal(await EmailLog().countDocuments(), 0);
    const logged = errors.mock.calls.map((c) => c.arguments.join(' '));
    assert.deepEqual(logged, ['Email ORDER_CONFIRMATION not sent (Error)']);
  });
});

describe('order confirmation (payment webhook)', () => {
  const confirm = async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_1', order_id: 'order_test_1', amount: 49900 } } },
    };
    const raw = JSON.stringify(payload);
    const res = await fetch(`${api.baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': razorpaySignature(raw) },
      body: raw,
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(res.status, 200);
  };

  const createdOrder = () =>
    createOrder(shopper.user, {
      orderStatus: 'created',
      razorOrderId: 'order_test_1',
      deliveryAddress: address._id,
      storeCredit: 20,
      giftOptions: GIFT,
      products: [{ quantity: 1, price: 499, discount: 10, productTotal: 449.1, product: ids.bookOne }],
      bundles: [{ quantity: 1, price: 799, discount: 20, total: 639.2, bundle: orderIds.bundleOne }],
      subTotal: 1088,
      shipping: 0,
      total: 1098,
    });

  test('outside production the paid order sends nothing', async () => {
    await createdOrder();
    await confirm();
    assert.deepEqual(sentEmails(), []);
    assert.deepEqual(sentTexts(), []);
  });

  test('in production: the confirmation SMS and e-mail once the payment is captured', async (t) => {
    production(t);
    await User().updateOne({ _id: shopper.user._id }, { storeCredit: 100 });
    const order = await createdOrder();
    await confirm();

    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
    assert.deepEqual(sentTexts(), [{ to: `+91${shopper.user.contactNo}`, body: smsText(order.orderId) }]);
    const [mail] = sentEmails();
    assert.equal(sentEmails().length, 1);
    assert.equal(mail.subject, `Order Confirmation #${order.orderId} - Pageaters`);
    assert.ok(mail.html.includes(`src="${POSTER}"`));
    assert.ok(mail.html.includes('src="https://images.example.com/test-bundle.png"'));
    assert.ok(mail.html.includes('Test Book One') && mail.html.includes('Test Bundle One'));
    assert.match(mail.html, /Gift Charges[\s\S]*>INR 30</);
    assert.match(mail.html, /Store Credit[\s\S]*>INR 20</);
  });
});

describe('cancellation e-mails', () => {
  const paidOrder = () => createOrder(shopper.user, { orderStatus: 'paid', deliveryAddress: address._id });

  test('CANCEL_ORDER: a shopper cancellation e-mails the shopper in production only', async (t) => {
    const first = await paidOrder();
    await call('POST', `/orders/cancel/${first.orderId}`, { reason: 'Changed mind' }, shopper.cookie);
    assert.equal((await Order().findById(first._id)).orderStatus, 'cancelled');
    assert.deepEqual(sentEmails(), []);

    production(t);
    const order = await paidOrder();
    await call('POST', `/orders/cancel/${order.orderId}`, { reason: 'Changed mind' }, shopper.cookie);
    const mails = sentEmails();
    assert.equal(mails.length, 1);
    assert.deepEqual(
      { to: mails[0].to, subject: mails[0].subject },
      { to: shopper.user.email, subject: `Order ${order.orderId} Cancellation Confirmation  - Pageaters` },
    );
    assert.ok(mails[0].html.includes(order.orderId));
    assert.ok(mails[0].html.includes(shopper.user.fullName));
    assert.equal((await EmailLog().findOne()).emailModule, 'CANCEL_ORDER');
  });

  const adminCancel = (order, notify) =>
    call(
      'POST',
      `/orders/admin-cancel/${order._id}`,
      { uniqueId: order.orderId, userId: String(shopper.user._id), reason: 'Test reason out of stock', notify },
      admin.cookie,
    );

  test('CLOSE_ORDER: an admin cancellation e-mails the reason in production, only when notify is set', async (t) => {
    const first = await paidOrder();
    assert.equal((await adminCancel(first, true)).status, 200);
    assert.deepEqual(sentEmails(), []);

    production(t);
    assert.equal((await adminCancel(await paidOrder(), false)).status, 200);
    assert.deepEqual(sentEmails(), []);

    const order = await paidOrder();
    assert.equal((await adminCancel(order, true)).status, 200);
    const mails = sentEmails();
    assert.equal(mails.length, 1);
    assert.deepEqual(
      { to: mails[0].to, subject: mails[0].subject },
      { to: shopper.user.email, subject: `Order ${order.orderId} Cancellation Confirmation  - Pageaters` },
    );
    assert.ok(mails[0].html.includes('Test reason out of stock'));
    assert.ok(mails[0].html.includes(shopper.user.fullName));
    assert.equal((await EmailLog().findOne()).emailModule, 'CLOSE_ORDER');
  });
});
