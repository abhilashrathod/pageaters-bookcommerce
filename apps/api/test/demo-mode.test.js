// DEMO_MODE is read once, on the first access to src/env.js: switch it on before the harness loads the app.
process.env.DEMO_MODE = 'true';
process.env.CRON_SECRET = 'c'.repeat(32); // fake, test only

const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createAddress, createOrder } = require('./helpers/fixtures/orders');
const { assertBody, createUser, envelopes, ids, loadCatalog, sentEmails, sentTexts, startTestApp } = require('./helpers');

// PLAN.md Phase 5 Batches A–C: with DEMO_MODE=true the demo shopper and demo admin sign in with one click; signup, the
// phone OTP, verify-email and the password reset are off; the demo admin is read-only on the catalog, uploads and store
// credit; the mock e-mail and SMS adapters save to the outbox (GET /outbox); Batch D: the weekly cleanup. test/auth-session.test.js covers the same routes with DEMO_MODE off (demo login is a 404 there).

const { badRequest, ok } = envelopes;
const DEMO_SHOPPER_EMAIL = 'shopper@demo.pageaters.com';
const DEMO_ADMIN_EMAIL = 'admin@demo.pageaters.com';

let api;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
});

const seedDemoShopper = async () => {
  const user = await mongoose.model('user').create({ email: DEMO_SHOPPER_EMAIL, fullName: 'Demo Shopper', role: 'USER', emailVerified: true });
  const cart = await mongoose.model('cart').create({ user: user._id });
  return { user, cart };
};

describe('POST /auth/demo-login', () => {
  test('signs into the demo shopper and sets the session and cart cookies', async () => {
    const { user, cart } = await seedDemoShopper();

    const res = await api.request('/auth/demo-login', { method: 'POST' });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'LOGIN_SUCCESS');
    assert.equal(res.body.data.email, DEMO_SHOPPER_EMAIL);
    const cookies = res.headers.getSetCookie();
    const session = cookies.find((cookie) => cookie.startsWith('_PID='));
    assert.ok(session, 'no session cookie');
    assert.ok(cookies.some((cookie) => cookie.includes(String(cart._id))), 'no cart cookie');

    const me = await api.request('/auth/me', { cookie: session.split(';')[0] });
    assert.equal(me.status, 200);
    assert.equal(String(me.body.data._id), String(user._id));
  });

  test('answers 503 when the seed has not been loaded', async () => {
    const res = await api.request('/auth/demo-login', { method: 'POST' });
    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'DEMO_ACCOUNT_MISSING');
  });
});

describe('routes off in DEMO_MODE', () => {
  test('signup is refused and creates no account', async () => {
    const res = await api.request('/auth/register', { method: 'POST', body: { email: 'visitor@example.com', password: 'secret-123' } });
    assertBody(res, 400, badRequest('OFF_IN_DEMO_MODE'));
    assert.equal(await mongoose.model('user').countDocuments(), 0);
  });

  test('the phone OTP routes are refused and send nothing', async () => {
    const { cookie } = await createUser();
    for (const path of ['/auth/contact/send', '/auth/contact/resend', '/auth/contact/verify']) {
      const res = await api.request(path, { method: 'POST', cookie, body: path.endsWith('send') ? { contactNo: '9000000000' } : { otp: '123456' } });
      assertBody(res, 400, badRequest('OFF_IN_DEMO_MODE'));
    }
    assert.equal(sentTexts().length, 0);
  });

  test('verify-email and the password reset are refused and mail nothing', async () => {
    const { user } = await createUser();
    const requests = [
      ['/auth/verify-email', { email: user.email, token: 'x'.repeat(64) }],
      ['/auth/verify-email/resend', { email: user.email }],
      ['/auth/forgot-password', { email: user.email }],
      ['/auth/forgot-password/resend', { email: user.email }],
      ['/auth/reset-password', { email: user.email, token: 'x'.repeat(64), newPassword: 'secret-123', confirmPassword: 'secret-123' }],
    ];
    for (const [path, body] of requests) {
      const res = await api.request(path, { method: 'POST', body });
      assertBody(res, 400, badRequest('OFF_IN_DEMO_MODE'));
    }
    assert.equal(sentEmails().length, 0);
  });

  test('password login still works (admins sign in with it)', async () => {
    const { user, password } = await createUser({ role: 'ADMIN' });
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password } });
    assertBody(res, 200, ok('LOGIN_SUCCESS', res.body.data));
  });
});

describe('the demo admin', () => {
  const demoAdminCookie = async () => {
    await mongoose.model('user').create({ email: DEMO_ADMIN_EMAIL, fullName: 'Demo Admin', role: 'ADMIN', emailVerified: true });
    const res = await api.request('/auth/demo-login/admin', { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, DEMO_ADMIN_EMAIL);
    return res.headers.getSetCookie().find((cookie) => cookie.startsWith('_PID=')).split(';')[0];
  };

  test('signs in with one click and can still read the catalog', async () => {
    await loadCatalog();
    const cookie = await demoAdminCookie();
    const res = await api.request(`/authors/${ids.authorA}`, { cookie });
    assert.equal(res.status, 200);
  });

  test('is refused catalog writes, uploads and store-credit issuing', async () => {
    await loadCatalog();
    const cookie = await demoAdminCookie();
    const writes = [
      ['DELETE', `/authors/${ids.authorA}`],
      ['PUT', `/categories/${ids.categoryFiction}`, {}],
      ['POST', '/store-books', {}],
      ['POST', '/file/upload'],
      ['POST', '/store-credit', {}],
    ];
    for (const [method, path, body] of writes) {
      const res = await api.request(path, { method, cookie, body });
      assertBody(res, 400, badRequest('DEMO_ADMIN_READ_ONLY'));
    }
    assert.equal(await mongoose.model('author').countDocuments({ _id: ids.authorA, isDeleted: true }), 0);
  });

  test('can reach the order lifecycle actions', async () => {
    const cookie = await demoAdminCookie();
    const res = await api.request('/orders/ship', { method: 'POST', cookie, body: {} });
    assert.equal(res.status, 400);
    assert.notEqual(res.body.status, 'DEMO_ADMIN_READ_ONLY');
  });

  test('any other admin (the super-admin) can still write', async () => {
    await loadCatalog();
    const { cookie } = await createUser({ role: 'ADMIN' });
    const res = await api.request(`/authors/${ids.authorA}`, { method: 'DELETE', cookie });
    assert.equal(res.status, 200);
  });
});

describe('GET /outbox', () => {
  const send = async () => {
    const email = require('../src/adapters/email');
    const sms = require('../src/adapters/sms');
    const shopper = await createUser();
    const other = await createUser();
    await email.send({ from: 'no-reply@demo.pageaters.com', to: shopper.user.email, subject: 'Your order', html: '<p>Shipped</p>' });
    await sms.send({ to: `+91${shopper.user.contactNo}`, body: 'Order shipped' });
    await email.send({ from: 'no-reply@demo.pageaters.com', to: other.user.email, subject: 'Not yours', html: '<p>x</p>' });
    return { shopper, other };
  };

  test('lists the caller’s own e-mails and texts, newest first', async () => {
    const { shopper } = await send();
    const res = await api.request('/outbox', { cookie: shopper.cookie });
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map(({ channel, to, subject, body }) => ({ channel, to, subject, body })),
      [
        { channel: 'sms', to: `+91${shopper.user.contactNo}`, subject: undefined, body: 'Order shipped' },
        { channel: 'email', to: shopper.user.email, subject: 'Your order', body: '<p>Shipped</p>' },
      ],
    );
  });

  test('the super-admin sees everyone’s; the demo admin only its own', async () => {
    await send();
    const superAdmin = await createUser({ role: 'ADMIN' });
    assert.equal((await api.request('/outbox', { cookie: superAdmin.cookie })).body.data.length, 3);

    await mongoose.model('user').create({ email: DEMO_ADMIN_EMAIL, fullName: 'Demo Admin', role: 'ADMIN', emailVerified: true });
    const login = await api.request('/auth/demo-login/admin', { method: 'POST' });
    const cookie = login.headers.getSetCookie().find((c) => c.startsWith('_PID=')).split(';')[0];
    assert.deepEqual((await api.request('/outbox', { cookie })).body.data, []);
  });

  test('needs a session', async () => {
    assert.equal((await api.request('/outbox')).status, 401);
  });
});

describe('GET /demo/cleanup', () => {
  const ADDRESS_ID = '64d000000000000000000b01';
  const bearer = (secret) => ({ headers: { authorization: `Bearer ${secret}` } });
  const cleanup = (secret = process.env.CRON_SECRET) =>
    fetch(`${api.baseUrl}/demo/cleanup`, bearer(secret)).then(async (res) => ({ status: res.status, body: await res.json() }));
  const totalStock = async () =>
    (await mongoose.model('storeBook').find({ isDeleted: false }).lean()).reduce((sum, book) => sum + book.inventory, 0);

  test('refuses a missing or wrong secret', async () => {
    assert.equal((await fetch(`${api.baseUrl}/demo/cleanup`)).status, 401);
    assert.equal((await cleanup('wrong-secret-0123456789xx')).status, 401);
  });

  test('wipes visitor data, puts stock back and places one sample order per stage', async () => {
    await loadCatalog();
    // Two more in-stock books, so there is one per sample stage.
    const one = await mongoose.model('storeBook').findById(ids.bookOne).lean();
    for (const n of [4, 5]) {
      const { _id, ...rest } = one;
      await mongoose.model('storeBook').create({ ...rest, bookId: `test-book-${n}`, ISBN: `999000000000${n}` });
    }
    const { user: shopper } = await seedDemoShopper();
    await mongoose.model('user').create({ email: DEMO_ADMIN_EMAIL, fullName: 'Renamed', role: 'ADMIN', emailVerified: true });
    await createAddress(shopper, { _id: ADDRESS_ID, isDeleted: true, contactNo: '9000000042' });
    await mongoose.model('subscriber').create({ email: 'stranger@example.com' });
    await createAddress(shopper);
    await mongoose.model('favorites').create({ userId: shopper._id, wishlist: [ids.bookTwo] });
    await mongoose.model('cart').create({});
    await mongoose.model('user').updateOne({ _id: shopper._id }, { $set: { fullName: 'Visitor was here' } });
    await createOrder(shopper, { orderStatus: 'paid' });
    await createOrder(shopper, { orderStatus: 'cancelled' });
    await require('../src/adapters/email').send({ from: 'a@example.com', to: DEMO_SHOPPER_EMAIL, subject: 's', html: 'h' });
    const stockBefore = await totalStock();

    const res = await cleanup();

    assert.equal(res.status, 200);
    assert.equal(res.body.data.ordersRemoved, 2);
    const stages = (await mongoose.model('order').find({}).lean()).map((order) => order.orderStatus).sort();
    assert.deepEqual(stages, ['cancelled', 'confirmed', 'fulfilled', 'shipped']);
    assert.ok(stages.every(Boolean));
    // +1 from the visitor's paid order; −1 for each sample order that wasn't cancelled.
    assert.equal(await totalStock(), stockBefore + 1 - 3);
    const addresses = await mongoose.model('address').find({}).lean();
    assert.deepEqual(
      addresses.map((a) => [String(a._id), a.isDeleted, a.contactNo, a.addressLine1]),
      [[ADDRESS_ID, false, '9000000000', '42 Demo Lane']],
    );
    assert.equal(await mongoose.model('subscriber').countDocuments(), 0);
    assert.equal(await mongoose.model('cart').countDocuments(), 1);
    assert.deepEqual((await mongoose.model('favorites').findOne({ userId: shopper._id }).lean()).wishlist, []);
    // The visitor's message is gone; the sample orders' own e-mails (shipped, delivered, cancelled) are the outbox now.
    assert.equal(await mongoose.model('outbox').countDocuments({ subject: 's' }), 0);
    assert.equal((await mongoose.model('user').findById(shopper._id).lean()).fullName, 'Demo Shopper');
    assert.equal((await mongoose.model('user').findOne({ email: DEMO_ADMIN_EMAIL }).lean()).fullName, 'Demo Admin');
  });

  test('answers 503 when the seed has not been loaded', async () => {
    assert.equal((await cleanup()).status, 503);
  });
});
