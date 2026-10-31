const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { assertBody, createUser, envelopes, PASSWORD, startTestApp } = require('./helpers');
const { hashSessionToken } = require('../src/helpers/encryption.helper');

// Sessions over HTTP: register, login, logout (token revoke), GET and PUT /auth/me. Envelopes and cookies (names,
// values, flags, expiry) are pinned exactly, so the controller → service refactor can't change them.

const { badRequest, ok, serverError, unauthorized } = envelopes;
const joiError = envelopes.badRequestObject;

const DAY = 24 * 60 * 60 * 1000;
const User = () => mongoose.model('user');
const Cart = () => mongoose.model('cart');
const AccessTokens = () => mongoose.model('access_token');

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

const cookiesOf = (res) => res.headers.getSetCookie();

// `_PID=<jwt>; Max-Age=<30 days>; Path=/; Expires=<now + 30 days>; HttpOnly; SameSite=Lax` (no `Secure` under
// APP_ENV=test) → the token, after checking the attributes.
const assertSessionCookie = (cookie) => {
  const match = cookie.match(/^_PID=([^;]+); Max-Age=2592000; Path=\/; Expires=([^;]+); HttpOnly; SameSite=Lax$/);
  assert.ok(match, `unexpected session cookie: ${cookie}`);
  const expires = Date.parse(match[2]);
  assert.ok(Math.abs(expires - (Date.now() + 30 * DAY)) < 5000, match[2]);
  return match[1];
};

const CLEARED_SESSION_COOKIE = '_PID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';

const cartCookie = (cartId) => `_CID=j%3A%22${cartId}%22; Path=/; HttpOnly`;

// GET /auth/me's profile projection (User.getProfile) for a createUser() account.
const profileOf = (user) => ({
  _id: String(user._id),
  fullName: user.fullName,
  dateOfBirth: '',
  gender: '',
  email: user.email,
  contactNo: user.contactNo,
  emailVerified: user.emailVerified,
  contactVerified: false,
  lastPasswordSetAt: user.lastPasswordSetAt,
  lastLoginAt: user.lastLoginAt,
  storeCredit: 0,
  id: String(user._id),
});

const waitFor = async (check) => {
  for (let i = 0; i < 50; i += 1) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail('condition not met in time');
};

describe('POST /auth/register', () => {
  const body = { email: 'new-shopper@example.com', password: 'test-password-2' };

  test('creates the account, its cart, favourites and session, and sets both cookies', async () => {
    const res = await api.request('/auth/register', { method: 'POST', body });

    assertBody(res, 200, ok('REGISTRATION_SUCCESS', {}));
    const user = await User().findOne({ email: body.email });
    const cart = await Cart().findOne({ user: user._id });
    const [session, cartSet] = cookiesOf(res);
    const token = assertSessionCookie(session);
    assert.equal(cartSet, cartCookie(cart._id));

    assert.equal(user.role, 'USER');
    assert.equal(user.emailVerified, false);
    assert.ok(await user.isPasswordValid(body.password));
    assert.ok(user.verifyEmailToken);
    assert.ok(await mongoose.model('favorites').findOne({ userId: user._id }));

    const claims = jwt.decode(token);
    assert.deepEqual(
      { userId: claims.userId, role: claims.role, email: claims.email, motive: claims.motive },
      { userId: String(user._id), role: 'USER', email: body.email, motive: 'AUTH' },
    );
    assert.equal(claims.exp - claims.iat, 7 * 24 * 60 * 60);
    const stored = await AccessTokens().findOne({ token: hashSessionToken(token) });
    assert.ok(stored);
    assert.equal(stored.revoked, null);

    // The new session works.
    const me = await api.request('/auth/me', { cookie: `_PID=${token}` });
    assert.equal(me.status, 200);
  });

  test('an email already registered answers USER_ALREADY_REGISTERED', async () => {
    await api.request('/auth/register', { method: 'POST', body });
    const res = await api.request('/auth/register', { method: 'POST', body });
    assertBody(res, 400, badRequest('USER_ALREADY_REGISTERED'));
    assert.deepEqual(cookiesOf(res), []);
    assert.equal(await User().countDocuments({ email: body.email }), 1);
  });

  test('a failed account write answers 500 and starts no session (every write is awaited)', async (t) => {
    t.mock.method(User().prototype, 'save', async () => {
      throw new Error('write failed');
    });
    const res = await api.request('/auth/register', { method: 'POST', body });
    assertBody(res, 500, serverError);
    assert.deepEqual(cookiesOf(res), []);
    assert.equal(await AccessTokens().countDocuments(), 0);
  });

  test('validates the payload', async () => {
    assertBody(await api.request('/auth/register', { method: 'POST', body: { ...body, email: 'nope' } }), 400, joiError('INVALID_EMAIL'));
    assertBody(await api.request('/auth/register', { method: 'POST', body: { email: body.email } }), 400, joiError('INVALID_PASSWORD'));
  });
});

describe('POST /auth/login', () => {
  test('answers the profile and sets the session and cart cookies', async () => {
    const { user } = await createUser();
    const cart = await Cart().findOne({ user: user._id });

    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: PASSWORD } });

    assert.equal(res.status, 200);
    const fresh = await waitFor(async () => {
      const found = await User().findById(user._id);
      return found.lastLoginAt ? found : null;
    });
    assertBody(res, 200, ok('LOGIN_SUCCESS', profileOf({ ...fresh.toObject(), lastLoginAt: res.body.data.lastLoginAt })));
    assert.ok(res.body.data.lastLoginAt);
    const [session, cartSet] = cookiesOf(res);
    const token = assertSessionCookie(session);
    assert.equal(cartSet, cartCookie(cart._id));
    assert.ok(await AccessTokens().findOne({ token: hashSessionToken(token) }));
  });

  test('an unverified email answers EMAIL_VERIFICATION_PENDING with the profile', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { emailVerified: false });
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'EMAIL_VERIFICATION_PENDING');
    assert.equal(res.body.data.email, user.email);
    assert.equal(cookiesOf(res).length, 2);
  });

  test('an account without a cart gets an empty cart cookie', async () => {
    const { user } = await createUser();
    await Cart().deleteMany({ user: user._id });
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    assert.equal(cookiesOf(res)[1], '_CID=; Path=/; HttpOnly');
  });

  test('a wrong password, an unknown email or an inactive account answer INVALID_LOGIN_ATTEMPT without cookies', async () => {
    const { user } = await createUser();
    const blocked = await createUser();
    await User().updateOne({ _id: blocked.user._id }, { status: 'BLOCKED' });

    for (const body of [
      { email: user.email, password: 'wrong-password' },
      { email: 'nobody@example.com', password: PASSWORD },
      { email: blocked.user.email, password: PASSWORD },
    ]) {
      const res = await api.request('/auth/login', { method: 'POST', body });
      assertBody(res, 400, badRequest('INVALID_LOGIN_ATTEMPT'));
      assert.deepEqual(cookiesOf(res), []);
    }
    assert.equal(await AccessTokens().countDocuments(), 2);
  });
});

test('POST /auth/demo-login is an unknown route without DEMO_MODE (test/demo-mode.test.js covers it on)', async () => {
  const res = await api.request('/auth/demo-login', { method: 'POST' });
  assert.equal(res.status, 404);
});

test('without DEMO_MODE the outbox stores nothing and GET /outbox is an unknown route', async () => {
  const { cookie, user } = await createUser();
  await require('../src/adapters/email').send({ from: 'no-reply@demo.pageaters.com', to: user.email, subject: 'Reset', html: '<p>token</p>' });
  assert.equal(await mongoose.model('outbox').countDocuments(), 0);
  assert.equal((await api.request('/outbox', { cookie })).status, 404);
});

describe('POST /auth/login: a failed write', () => {
  test('answers 500 and starts no session (the login stamp is awaited)', async (t) => {
    const { user } = await createUser();
    await AccessTokens().deleteMany({});
    t.mock.method(User(), 'updateOne', async () => {
      throw new Error('write failed');
    });
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    assertBody(res, 500, serverError);
    assert.deepEqual(cookiesOf(res), []);
    assert.equal(await AccessTokens().countDocuments(), 0);
  });
});

describe('POST /auth/logout (revoke token)', () => {
  test('revokes the session token and clears both cookies', async () => {
    const { user, token, cookie } = await createUser();
    const res = await api.request('/auth/logout', { method: 'POST', cookie });

    assertBody(res, 200, ok('TOKEN_REVOKED', {}));
    assert.deepEqual(cookiesOf(res), [CLEARED_SESSION_COOKIE, '_CID=; Path=/; HttpOnly']);
    const stored = await AccessTokens().findOne({ token: hashSessionToken(token), userId: user._id });
    assert.ok(stored.revoked instanceof Date);
    assert.equal(stored.revokedByIp, '127.0.0.1');
  });

  test('a revoked token no longer opens a session (401 INVALID_TOKEN)', async () => {
    const { cookie } = await createUser();
    await api.request('/auth/logout', { method: 'POST', cookie });
    assertBody(await api.request('/auth/me', { cookie }), 401, unauthorized('INVALID_TOKEN'));
  });

  test('a valid JWT without a stored session answers 401 INVALID_TOKEN (the middleware refuses it)', async () => {
    const { token, cookie } = await createUser();
    await AccessTokens().deleteMany({ token: hashSessionToken(token) });
    assertBody(await api.request('/auth/logout', { method: 'POST', cookie }), 401, unauthorized('INVALID_TOKEN'));
    assertBody(await api.request('/auth/me', { cookie }), 401, unauthorized('INVALID_TOKEN'));
  });

  test('without a session answers 401 NO_AUTH_HEADER', async () => {
    assertBody(await api.request('/auth/logout', { method: 'POST' }), 401, unauthorized('NO_AUTH_HEADER'));
  });
});

describe('GET /auth/me', () => {
  test('answers the profile', async () => {
    const { user, cookie } = await createUser();
    const fresh = await User().findById(user._id);
    assertBody(await api.request('/auth/me', { cookie }), 200, ok('ME_SUCCESS', profileOf(fresh)));
  });

  test('without a session answers 401', async () => {
    assertBody(await api.request('/auth/me'), 401, unauthorized('NO_AUTH_HEADER'));
    assertBody(await api.request('/auth/me', { cookie: '_PID=not-a-jwt' }), 401, unauthorized('INVALID_TOKEN'));
  });
});

describe('PUT /auth/me', () => {
  test('updates the full name and answers the profile', async () => {
    const { user, cookie } = await createUser();
    const res = await api.request('/auth/me', { method: 'PUT', body: { fullName: 'Test Renamed' }, cookie });
    const fresh = await User().findById(user._id);
    assert.equal(fresh.fullName, 'Test Renamed');
    assertBody(res, 200, ok('PROFILE_UPDATED', profileOf(fresh)));
  });

  test('an empty name changes nothing', async () => {
    const { user, cookie } = await createUser();
    assert.equal((await api.request('/auth/me', { method: 'PUT', body: { fullName: '' }, cookie })).status, 200);
    assert.equal((await User().findById(user._id)).fullName, user.fullName);
  });

  test('refuses a contact number: it changes only through the OTP flow', async () => {
    const { user, cookie } = await createUser();
    for (const body of [{ fullName: 'Test Renamed', contactNo: '9000000099' }, { contactNo: '' }, { contactNo: '12' }]) {
      assertBody(await api.request('/auth/me', { method: 'PUT', body, cookie }), 400, joiError('INVALID_REQUEST'));
    }
    const fresh = await User().findById(user._id);
    assert.deepEqual([fresh.fullName, fresh.contactNo, fresh.contactVerified], [user.fullName, user.contactNo, user.contactVerified]);
  });
});
