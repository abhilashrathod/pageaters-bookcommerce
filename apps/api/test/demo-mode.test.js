// DEMO_MODE is read once, on the first access to src/env.js: switch it on before the harness loads the app.
process.env.DEMO_MODE = 'true';

const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, sentTexts, startTestApp } = require('./helpers');

// PLAN.md Phase 5 Batch A: with DEMO_MODE=true the demo shopper signs in with one click; signup and the phone OTP are
// off. test/auth-session.test.js covers the same routes with DEMO_MODE off (demo login is a 404 there).

const { badRequest, ok } = envelopes;
const DEMO_SHOPPER_EMAIL = 'shopper@demo.pageaters.com';

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
    assert.equal(res.body.status, 'DEMO_SHOPPER_MISSING');
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

  test('password login still works (admins sign in with it)', async () => {
    const { user, password } = await createUser({ role: 'ADMIN' });
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password } });
    assertBody(res, 200, ok('LOGIN_SUCCESS', res.body.data));
  });
});
