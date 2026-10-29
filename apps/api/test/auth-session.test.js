const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { createUser, PASSWORD, startTestApp } = require('./helpers');
const t = require('../src/locales/en.json');

// Sessions over HTTP: register, login, logout (token revoke), GET and PUT /auth/me. Envelopes and cookies (names,
// values, flags, expiry) are pinned exactly, so the controller → service refactor can't change them.

const ok = (status, data) => ({ statusCode: 200, status, message: t[status], data });
const badRequest = (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} });
const joiError = (status) => ({ statusCode: 400, status, message: t[status], error: t[status], data: {} });
const unauthorized = (key) => ({ statusCode: 401, status: 'UNAUTHORIZED', message: t[key], data: {}, error: t[key] });

const assertBody = (res, status, body) => {
  assert.equal(res.status, status);
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};

const DAY = 24 * 60 * 60 * 1000;
const User = () => mongoose.model('user');
const Cart = () => mongoose.model('cart');
const AccessTokens = () => mongoose.model('access_token');

// The session cookie's expiry is fixed when the auth controller is loaded (legacy: every session cookie of a
// process expires 30 days after it started), so it lies between these two instants plus 30 days.
let loadedFrom;
let loadedBy;
let api;

before(async () => {
  loadedFrom = Date.now();
  api = await startTestApp();
  loadedBy = Date.now();
});

after(async () => {
  // res.error() writes its request log (log_api) without awaiting it; let the last one land before the client closes.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
});

const cookiesOf = (res) => res.headers.getSetCookie();

// `_PID=<jwt>; Path=/; Expires=<load time + 30 days>; HttpOnly` → the token, after checking the attributes.
const assertSessionCookie = (cookie) => {
  const match = cookie.match(/^_PID=([^;]+); Path=\/; Expires=([^;]+); HttpOnly$/);
  assert.ok(match, `unexpected session cookie: ${cookie}`);
  const expires = Date.parse(match[2]);
  assert.ok(expires >= Math.floor((loadedFrom + 30 * DAY) / 1000) * 1000 && expires <= loadedBy + 30 * DAY, match[2]);
  return match[1];
};

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
    assert.ok(user.isPasswordValid(body.password));
    assert.ok(user.verifyEmailToken);
    assert.ok(await mongoose.model('favorites').findOne({ userId: user._id }));

    const claims = jwt.decode(token);
    assert.deepEqual(
      { userId: claims.userId, role: claims.role, email: claims.email, motive: claims.motive },
      { userId: String(user._id), role: 'USER', email: body.email, motive: 'AUTH' },
    );
    assert.equal(claims.exp - claims.iat, 7 * 24 * 60 * 60);
    const stored = await AccessTokens().findOne({ token });
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
    assert.ok(await AccessTokens().findOne({ token }));
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

describe('POST /auth/logout (revoke token)', () => {
  test('revokes the session token and clears both cookies', async () => {
    const { user, token, cookie } = await createUser();
    const res = await api.request('/auth/logout', { method: 'POST', cookie });

    assertBody(res, 200, ok('TOKEN_REVOKED', {}));
    assert.deepEqual(cookiesOf(res), ['_PID=; Path=/; HttpOnly', '_CID=; Path=/; HttpOnly']);
    const stored = await AccessTokens().findOne({ token, userId: user._id });
    assert.ok(stored.revoked instanceof Date);
    assert.equal(stored.revokedByIp, '127.0.0.1');
  });

  test('legacy: a revoked token still opens a session', async () => {
    const { cookie } = await createUser();
    await api.request('/auth/logout', { method: 'POST', cookie });
    assert.equal((await api.request('/auth/me', { cookie })).status, 200);
  });

  test('a valid token that was never stored answers 401 TOKEN_UNMATCHED', async () => {
    const { token, cookie } = await createUser();
    await AccessTokens().deleteMany({ token });
    assertBody(await api.request('/auth/logout', { method: 'POST', cookie }), 401, unauthorized('TOKEN_UNMATCHED'));
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

  test('legacy: contactNo is validated but ignored; an empty name changes nothing', async () => {
    const { user, cookie } = await createUser();
    const res = await api.request('/auth/me', { method: 'PUT', body: { fullName: '', contactNo: '9000000099' }, cookie });
    assert.equal(res.status, 200);
    const fresh = await User().findById(user._id);
    assert.deepEqual([fresh.fullName, fresh.contactNo], [user.fullName, user.contactNo]);
    assertBody(
      await api.request('/auth/me', { method: 'PUT', body: { contactNo: '12' }, cookie }),
      400,
      joiError('INVALID_PHONE'),
    );
  });
});

describe('account deletion (left in the controller, to be removed)', () => {
  // ACCOUNT_ALREADY_ACTIVE is not in en.json, so i18n answers the key itself.
  test('legacy: GET /auth/recoverAccount always answers ACCOUNT_ALREADY_ACTIVE', async () => {
    const { cookie } = await createUser();
    const key = 'ACCOUNT_ALREADY_ACTIVE';
    assertBody(await api.request('/auth/recoverAccount', { cookie }), 400, { statusCode: 400, status: key, error: key, message: key, data: {} });
  });
});
