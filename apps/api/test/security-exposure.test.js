const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const ejs = require('ejs');
const {
  adminUserDetailsResponseSchema,
  adminUserListResponseSchema,
  adminUserSearchResponseSchema,
  orderPaymentSchema,
  userSchema,
} = require('@pageaters/shared');

const { assertBody, createUser, envelopes, ids, loadCatalog, sentEmails, startTestApp } = require('./helpers');
const { createOrder, loadOrderCatalog } = require('./helpers/fixtures/orders');
const { loadStore } = require('./helpers/fixtures/store');

// PLAN.md Phase 4 step 7d (data exposure): what the API sends and stores. Each test pins one fixed leak.

const { ok } = envelopes;

const User = () => mongoose.model('user');
const Book = () => mongoose.model('storeBook');
const EmailLog = () => mongoose.model('log_email');

// The storefront origin under test (STOREFRONT_URL's default; tests don't set it).
const STOREFRONT = 'http://localhost:3000';
const ROOT_DOMAIN = /https?:\/\/(www\.)?pageaters\.com/;

// Everything that must never reach an admin client about a user.
const USER_SECRETS = [
  'password',
  'salt',
  'contactOtp',
  'verifyEmailToken',
  'forgotPasswordToken',
  'lastVerifyEmailSentOn',
  'lastForgotPasswordSentOn',
  'lastMessageSentOn',
  'razorPayCustId',
  'isDeleted',
];
const USER_FIELDS = Object.keys(userSchema.shape);

const assertOnlyUserFields = (user) => {
  for (const key of Object.keys(user)) assert.ok(USER_FIELDS.includes(key), `unexpected user key ${key}`);
  for (const key of USER_SECRETS) assert.equal(Object.hasOwn(user, key), false, `${key} leaked`);
};

// A full Razorpay payment entity as orders stored it before 7c (fake values only).
const CARD_ENTITY = {
  id: 'pay_test_7d',
  entity: 'payment',
  method: 'card',
  amount: 49900,
  email: 'payer@example.com',
  contact: '+919000000077',
  card_id: 'card_test_7d',
  card: { id: 'card_test_7d', name: 'Test Card', last4: '1111', network: 'Visa', type: 'credit', issuer: 'TEST' },
  acquirer_data: { auth_code: '000000' },
};
const CARD_SUMMARY = { method: 'card', name: 'Test Card', last4: '1111', network: 'Visa' };

let api;
let admin;
let shopper;

const asAdmin = (p, options = {}) => api.request(p, { ...options, cookie: admin.cookie });

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
  // Give the shopper every secret the model holds, so a leak would show.
  await User().updateOne(
    { _id: shopper.user._id },
    { contactOtp: '123456', verifyEmailToken: 'test-verify-token', forgotPasswordToken: 'test-reset-token', razorPayCustId: 'cust_test_7d' },
  );
});

describe('admin users answer userSchema fields only', () => {
  test('GET /users: no hash, salt, OTP, tokens or razorPayCustId; matches the shared contract', async () => {
    const res = await asAdmin('/users?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.docs.length, 1);
    assertOnlyUserFields(res.body.data.docs[0]);
    adminUserListResponseSchema.parse(res.body);
  });

  test('GET /users/search: userSchema fields only', async () => {
    const res = await asAdmin(`/users/search?q=${encodeURIComponent(shopper.user.email)}`);
    assert.equal(res.body.data.length, 1);
    assertOnlyUserFields(res.body.data[0]);
    adminUserSearchResponseSchema.parse(res.body);
  });

  test('GET /users/:id: the user part is userSchema fields only', async () => {
    const res = await asAdmin(`/users/${shopper.user._id}`);
    assertOnlyUserFields(res.body.data.user);
    assert.equal(res.body.data.user.email, shopper.user.email);
    adminUserDetailsResponseSchema.shape.data.shape.user.parse(res.body.data.user);
  });
});

describe('admin search takes q as literal text', () => {
  test('users: regex syntax matches nothing, an invalid pattern is not a 500, special characters match literally', async () => {
    const plus = await User().create({ fullName: 'Test Plus', email: 'test+tag@example.com' });
    assertBody(await asAdmin('/users/search?q=.*'), 200, ok('USER_LIST_SUCCESS', []));
    assertBody(await asAdmin('/users/search?q=('), 200, ok('USER_LIST_SUCCESS', []));
    assertBody(await asAdmin('/users/search?q=%5B'), 200, ok('USER_LIST_SUCCESS', []));
    const res = await asAdmin(`/users/search?q=${encodeURIComponent('+TAG@')}`);
    assert.deepEqual(res.body.data.map((u) => String(u._id)), [String(plus._id)]);
  });

  test('users: an empty or missing q answers no accounts (was every account)', async () => {
    assertBody(await asAdmin('/users/search?q='), 200, ok('USER_LIST_SUCCESS', []));
    assertBody(await asAdmin('/users/search'), 200, ok('USER_LIST_SUCCESS', []));
  });

  test('users: q is cut to 100 characters (a catastrophic-backtracking pattern is just text)', async () => {
    const res = await asAdmin(`/users/search?q=${encodeURIComponent('(a+)+$'.repeat(50))}`);
    assertBody(res, 200, ok('USER_LIST_SUCCESS', []));
    const { literalPattern } = require('../src/helpers/search-pattern.helper');
    assert.equal(literalPattern('x'.repeat(500)).length, 100);
    assert.equal(literalPattern({ $ne: '' }), '\\[object Object\\]');
  });

  test('orders: regex syntax matches nothing; the literal id fragment still matches', async () => {
    await loadOrderCatalog();
    const order = await createOrder(shopper.user, { orderId: 'OD-7000000001' });
    assertBody(await asAdmin('/orders/search?q=.*'), 200, ok('ORDER_LIST_SUCCESS', []));
    assertBody(await asAdmin('/orders/search?q=('), 200, ok('ORDER_LIST_SUCCESS', []));
    assertBody(await asAdmin('/orders/search'), 200, ok('ORDER_LIST_SUCCESS', []));
    const res = await asAdmin('/orders/search?q=od-70000');
    assert.deepEqual(res.body.data.map((o) => o.orderId), [order.orderId]);
  });
});

describe('admin orders answer the payment summary, never the Razorpay entity', () => {
  beforeEach(async () => {
    await loadOrderCatalog();
  });

  test('getById: an old order holding the full entity answers the summary', async () => {
    const order = await createOrder(shopper.user, { payment: CARD_ENTITY });
    const res = await asAdmin(`/orders/getById/${order._id}`);
    assert.equal(JSON.stringify(res.body.data.payment), JSON.stringify(CARD_SUMMARY));
    orderPaymentSchema.parse(res.body.data.payment);
    assert.doesNotMatch(JSON.stringify(res.body), /payer@example\.com|9000000077|card_test_7d|auth_code/);
  });

  test('getById: an order holding a summary (7c stores one) answers it unchanged, for every method', async () => {
    const summaries = [
      CARD_SUMMARY,
      { method: 'netbanking', bank: 'TESTBANK' },
      { method: 'upi', upi_id: 'test@upi' },
      { method: 'wallet', wallet: 'testwallet' },
      { method: 'emi', name: 'TESTBANK', last4: 1200, network: 6 },
      { method: 'cod' },
    ];
    for (const payment of summaries) {
      const order = await createOrder(shopper.user, { payment });
      const res = await asAdmin(`/orders/getById/${order._id}`);
      assert.equal(JSON.stringify(res.body.data.payment), JSON.stringify(payment), payment.method);
    }
  });

  test('getById: a UPI entity answers only the VPA; an order without a payment answers null', async () => {
    const upi = await createOrder(shopper.user, { payment: { id: 'pay_test_upi', method: 'upi', vpa: 'test@upi', email: 'payer@example.com', contact: '+919000000077' } });
    assert.equal(JSON.stringify((await asAdmin(`/orders/getById/${upi._id}`)).body.data.payment), JSON.stringify({ method: 'upi', upi_id: 'test@upi' }));
    const unpaid = await createOrder(shopper.user, { payment: null });
    const res = await asAdmin(`/orders/getById/${unpaid._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.payment, null);
  });

  test('ship and complete shipment answer the summary', async () => {
    const order = await createOrder(shopper.user, { orderStatus: 'paid', payment: CARD_ENTITY });
    const shipped = await asAdmin('/orders/ship', { method: 'POST', body: { orderId: String(order._id), shipmentTrackingId: 'TRACK-TEST-1' } });
    assert.equal(shipped.status, 200);
    assert.equal(JSON.stringify(shipped.body.data.payment), JSON.stringify(CARD_SUMMARY));
    const delivered = await asAdmin(`/orders/ship/${order._id}/complete`, { method: 'PATCH' });
    assert.equal(delivered.status, 200);
    assert.equal(JSON.stringify(delivered.body.data.payment), JSON.stringify(CARD_SUMMARY));
    assert.doesNotMatch(JSON.stringify([shipped.body, delivered.body]), /payer@example\.com|9000000077|card_test_7d/);
  });

  test('search: each order answers the summary', async () => {
    await createOrder(shopper.user, { orderId: 'OD-7000000002', payment: CARD_ENTITY });
    const res = await asAdmin('/orders/search?q=OD-7000000002');
    assert.equal(JSON.stringify(res.body.data[0].payment), JSON.stringify(CARD_SUMMARY));
  });
});

describe('wholeSalePriceHistory never leaves the database and is never set through the API', () => {
  beforeEach(async () => {
    await loadStore();
    await Book().updateOne({ _id: ids.bookOne }, { wholeSalePriceHistory: [1, 2] });
  });

  test('the model selects it away by default', () => {
    assert.equal(Book().schema.path('wholeSalePriceHistory').options.select, false);
  });

  test('public GET /store-books/unique/:id and admin GET /store-books/get/:id leave it out', async () => {
    const pub = await api.request('/store-books/unique/test-book-one');
    assert.equal(pub.status, 200);
    assert.equal(Object.hasOwn(pub.body.data, 'wholeSalePriceHistory'), false);
    const adm = await asAdmin(`/store-books/get/${ids.bookOne}`);
    assert.equal(adm.status, 200);
    assert.equal(Object.hasOwn(adm.body.data, 'wholeSalePriceHistory'), false);
    assert.doesNotMatch(JSON.stringify([pub.body, adm.body]), /wholeSalePriceHistory/);
  });

  test('create and update ignore it in the request and keep the stored value', async () => {
    const body = { title: 'Test Book 7d', categories: [String(ids.categoryFiction)], relatedBooks: [], wholeSalePriceHistory: [9] };
    const created = await asAdmin('/store-books', { method: 'POST', body });
    assert.equal(created.status, 200);
    assert.equal(Object.hasOwn(created.body.data, 'wholeSalePriceHistory'), false);
    const stored = await Book().findOne({ title: 'Test Book 7d' }).select('+wholeSalePriceHistory').lean();
    assert.equal(stored.wholeSalePriceHistory, undefined);

    const updated = await asAdmin(`/store-books/${ids.bookOne}`, {
      method: 'PUT',
      body: { title: 'Test Book One', categories: [String(ids.categoryFiction)], relatedBooks: [], wholeSalePriceHistory: [9] },
    });
    assert.equal(updated.status, 200);
    assert.equal(Object.hasOwn(updated.body.data, 'wholeSalePriceHistory'), false);
    assert.deepEqual((await Book().findById(ids.bookOne).select('+wholeSalePriceHistory').lean()).wholeSalePriceHistory, [1, 2]);
  });
});

describe('log_email keeps module, recipient, subject and time only', () => {
  const sendTemplateMail = (mail) => require('../src/services/mail.service').sendTemplateMail(mail);

  test('a reset e-mail is logged without its html or token', async () => {
    await sendTemplateMail({
      emailModule: 'FORGOT_PASSWORD',
      to: 'reader@example.com',
      subject: 'Test reset',
      data: { FULL_NAME: 'Test Reader', LINK: `${STOREFRONT}/auth/reset?token=test-secret-token` },
    });
    assert.ok(sentEmails()[0].html.includes('test-secret-token'), 'the e-mail itself carries the link');
    const logs = await EmailLog().find().lean();
    assert.equal(logs.length, 1);
    const { _id, createdAt, updatedAt, ...fields } = logs[0];
    assert.ok(_id && createdAt instanceof Date && updatedAt instanceof Date);
    assert.deepEqual(fields, { emailModule: 'FORGOT_PASSWORD', to: 'reader@example.com', subject: 'Test reset' });
    assert.doesNotMatch(JSON.stringify(logs), /test-secret-token|Test Reader|html|from/);
  });

  test('records expire 30 days after createdAt (TTL index)', async () => {
    await EmailLog().syncIndexes();
    const ttl = (await EmailLog().collection.indexes()).find((index) => index.key.createdAt === 1);
    assert.equal(ttl.expireAfterSeconds, 30 * 24 * 60 * 60);
  });
});

describe('links use the storefront from config, never the reserved root domain', () => {
  const origin = () => api.baseUrl.replace(/\/api\/v1$/, '');

  // Files under src/ whose text matches `pattern`, relative to apps/api.
  const srcFilesMatching = (pattern) => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (pattern.test(fs.readFileSync(file, 'utf8'))) offenders.push(path.relative(path.join(__dirname, '..'), file));
      }
    };
    walk(path.join(__dirname, '..', 'src'));
    return offenders;
  };

  test('no file under src/ links to https://pageaters.com', () => {
    assert.deepEqual(srcFilesMatching(ROOT_DOMAIN), []);
  });

  // The e-mail logo and the sitemap banner lived on the old store's image account, which is closed.
  test('no file under src/ loads an image from the closed image account', () => {
    assert.deepEqual(srcFilesMatching(/res\.[a-z]+\.com\/pageaters\//), []);
  });

  test('sitemap.xml and googleproducts.xml link to the storefront', async () => {
    await loadStore();
    for (const file of ['/sitemap.xml', '/googleproducts.xml']) {
      const xml = await (await fetch(`${origin()}${file}`)).text();
      assert.doesNotMatch(xml, ROOT_DOMAIN, file);
      assert.ok(xml.includes(`${STOREFRONT}/books/test-book-one`), file);
    }
  });

  test('templates link to the storefront', async () => {
    await require('../src/services/mail.service').sendTemplateMail({
      emailModule: 'CANCEL_ORDER',
      to: 'reader@example.com',
      subject: 'Test',
      data: { ORDER_ID: 'OD-TEST-7D', FULL_NAME: 'Test Reader', STOREFRONT_URL: 'https://evil.example.com' },
    });
    const { html } = sentEmails()[0];
    assert.doesNotMatch(html, ROOT_DOMAIN);
    assert.ok(html.includes(`href="${STOREFRONT}/account/orders/OD-TEST-7D"`));
    assert.ok(html.includes(`href="${STOREFRONT}/privacy-policy"`));
    assert.equal(html.includes('evil.example.com'), false, 'data cannot replace STOREFRONT_URL');
  });

  test('stock alert e-mails link to the storefront book page', async (t) => {
    await loadStore();
    await mongoose.model('stock_alert').create({ user: shopper.user._id, product: ids.bookOne });
    // The STOCK_ALERT template ships as en.html (legacy bug, never renders): render its data instead.
    t.mock.method(ejs, 'renderFile', async (file, data) => JSON.stringify(data));
    const res = await asAdmin(`/stock-alerts/${ids.bookOne}/users`, { method: 'POST' });
    assert.equal(res.status, 200);
    const data = JSON.parse(sentEmails()[0].html);
    assert.equal(data.LINK, `${STOREFRONT}/books/test-book-one`);
  });
});
