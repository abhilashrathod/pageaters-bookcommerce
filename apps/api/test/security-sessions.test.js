const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { assertBody, createUser, envelopes, PASSWORD, sentEmails, sentTexts, startTestApp } = require('./helpers');
const { TEST_ENV } = require('./helpers/env');
const { hashOneTimeToken, hashSessionToken } = require('../src/helpers/encryption.helper');

// PLAN.md Phase 4 step 7b (sessions and passwords): revoked sessions, scrypt with rehash on login, expiring single-use
// mail tokens stored as hashes, the JWT subkey, contact OTP limits, and the removed account-deletion routes.

const { badRequest, okString, unauthorized } = envelopes;

const User = () => mongoose.model('user');
const AccessTokens = () => mongoose.model('access_token');
const MINUTE = 60 * 1000;

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

const login = (email, password) => api.request('/auth/login', { method: 'POST', body: { email, password } });
const sessionCookie = (res) => res.headers.getSetCookie()[0].split(';')[0];
const me = (cookie) => api.request('/auth/me', { cookie });
const withFields = (id, fields) => User().findById(id).select(fields.map((field) => `+${field}`).join(' '));

// The legacy hash (and the seed's, seed/src/accounts.ts): HMAC-SHA512 hex keyed by a 16-character hex salt.
const legacyHash = (password, salt) => crypto.createHmac('sha512', salt).update(password).digest('hex');

describe('sessions', () => {
  test('a logged-out session is refused on every guarded route', async () => {
    const { cookie } = await createUser();
    assert.equal((await me(cookie)).status, 200);
    assert.equal((await api.request('/auth/logout', { method: 'POST', cookie })).status, 200);
    assertBody(await me(cookie), 401, unauthorized('INVALID_TOKEN'));
    assertBody(await api.request('/favorites', { cookie }), 401, unauthorized('INVALID_TOKEN'));
  });

  test('changing the password revokes every session of the account, and only that account', async () => {
    const { user, cookie } = await createUser();
    const other = await createUser();
    const second = sessionCookie(await login(user.email, PASSWORD));
    assert.equal((await me(second)).status, 200);

    const body = { password: PASSWORD, newPassword: 'test-password-new', confirmPassword: 'test-password-new' };
    assertBody(await api.request('/auth/password', { method: 'PUT', body, cookie }), 200, okString('PASSWORD_UPDATED'));

    assertBody(await me(cookie), 401, unauthorized('INVALID_TOKEN'));
    assertBody(await me(second), 401, unauthorized('INVALID_TOKEN'));
    assert.equal(await AccessTokens().countDocuments({ userId: user._id, revoked: null }), 0);
    assert.equal((await me(other.cookie)).status, 200);

    const fresh = sessionCookie(await login(user.email, 'test-password-new'));
    assert.equal((await me(fresh)).status, 200);
  });

  test('a password reset revokes every session of the account', async () => {
    const { user, cookie } = await createUser();
    const token = await (await User().findById(user._id)).generateForgotPasswordToken();
    const body = { token, email: user.email, newPassword: 'test-password-reset', confirmPassword: 'test-password-reset' };

    assertBody(await api.request('/auth/reset-password', { method: 'POST', body }), 200, okString('PASSWORD_UPDATED'));
    assertBody(await me(cookie), 401, unauthorized('INVALID_TOKEN'));
    const stored = await AccessTokens().findOne({ userId: user._id });
    assert.ok(stored.revoked instanceof Date);
  });

  test('a JWT signed with the raw ENCRYPTION_KEY is refused (sessions are signed with an HKDF subkey)', async () => {
    const { user, token } = await createUser();
    const { exp, iat, ...claims } = jwt.decode(token);
    assert.ok(exp > iat);
    const forged = jwt.sign(claims, TEST_ENV.ENCRYPTION_KEY, { expiresIn: '7d' });
    await AccessTokens().create({ userId: user._id, token: hashSessionToken(forged) });
    assertBody(await me(`_PID=${forged}`), 401, unauthorized('INVALID_TOKEN'));
  });

  test('the session record carries the JWT expiry', async () => {
    const { user } = await createUser();
    const res = await login(user.email, PASSWORD);
    const token = sessionCookie(res).slice('_PID='.length);
    const stored = await AccessTokens().findOne({ token: hashSessionToken(token) });
    const { exp } = jwt.decode(token);
    assert.ok(Math.abs(stored.expires.getTime() - exp * 1000) < 5000);
  });

  test('req.user carries only the JWT claims, never the account document', async () => {
    const permission = require('../src/middlewares/permissionVerification.middleware');
    const { user, token } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', lastMessageSentOn: new Date().toISOString() });

    const req = { cookies: { _PID: token } };
    const res = { unauthorized: (key) => assert.fail(`unauthorized ${key}`), forbidden: () => assert.fail('forbidden') };
    for (const step of permission('USER')) {
      await new Promise((resolve) => step(req, res, resolve));
    }
    assert.deepEqual(Object.keys(req.user).sort(), ['createdAt', 'createdByIp', 'email', 'exp', 'iat', 'motive', 'role', 'sessionVersion', 'userId']);
  });
});

describe('session cookie', () => {
  test('is Secure outside development and test, SameSite=Lax, and lasts 30 days from when it is set', async (t) => {
    const appConfig = require('../src/appConfig');
    const authSession = require('../src/services/auth-session.service');
    const controllerPath = require.resolve('../src/controllers/auth.controller');
    t.mock.property(appConfig, 'ENVIRONMENT', 'staging');
    delete require.cache[controllerPath];
    t.after(() => delete require.cache[controllerPath]);
    const controller = require(controllerPath);
    t.mock.method(authSession, 'login', async () => ({ token: 'jwt', cartId: '', profile: { emailVerified: true } }));
    t.mock.method(authSession, 'revokeToken', async () => {});

    const cookies = [];
    const res = { cookie: (name, value, options) => cookies.push({ name, value, options }), ok: () => {} };
    await controller.login({ validated: { email: 'a@example.com', password: 'p' }, ip: '127.0.0.1' }, res);
    await controller.revokeToken({ cookies: { _PID: 'jwt' }, user: { userId: 'x' }, ip: '127.0.0.1' }, res);

    const [set, , cleared] = cookies;
    assert.deepEqual(set, { name: '_PID', value: 'jwt', options: { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 30 * 24 * 60 * MINUTE } });
    assert.deepEqual(cleared, { name: '_PID', value: '', options: { httpOnly: true, sameSite: 'lax', secure: true, expires: new Date(0) } });
  });
});

describe('passwords', () => {
  test('new passwords are stored as scrypt hashes with their parameters and no separate salt', async () => {
    const { user } = await createUser();
    const stored = await User().findById(user._id);
    assert.match(stored.password, /^scrypt\$32768\$8\$3\$[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{86}==$/);
    assert.equal(stored.salt, '');
    assert.equal(await stored.isPasswordValid(PASSWORD), true);
    assert.equal(await stored.isPasswordValid('wrong-password'), false);
  });

  test('a legacy (and seed) HMAC-SHA512 account logs in and is upgraded to scrypt', async () => {
    const { user } = await createUser();
    const salt = crypto.randomBytes(8).toString('hex');
    await User().updateOne({ _id: user._id }, { salt, password: legacyHash(PASSWORD, salt) });

    assertBody(await login(user.email, 'wrong-password'), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    assert.equal((await User().findById(user._id)).salt, salt, 'a failed login does not touch the hash');

    assert.equal((await login(user.email, PASSWORD)).status, 200);
    const upgraded = await User().findById(user._id);
    assert.match(upgraded.password, /^scrypt\$/);
    assert.equal(upgraded.salt, '');
    assert.equal((await login(user.email, PASSWORD)).status, 200);
  });

  test('a scrypt hash with weaker parameters is redone at the next login', async () => {
    const { user } = await createUser();
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(PASSWORD, salt, 64, { N: 2 ** 14, r: 8, p: 1 });
    const weak = ['scrypt', 2 ** 14, 8, 1, salt.toString('base64'), hash.toString('base64')].join('$');
    await User().updateOne({ _id: user._id }, { password: weak });

    assert.equal((await login(user.email, PASSWORD)).status, 200);
    assert.match((await User().findById(user._id)).password, /^scrypt\$32768\$8\$3\$/);
  });

  test('a malformed or absurd stored hash never verifies', async () => {
    const { user } = await createUser();
    for (const password of ['', 'scrypt$', `scrypt$${2 ** 30}$8$1$c2FsdA==$aGFzaA==`, 'not-a-hash']) {
      await User().updateOne({ _id: user._id }, { password, salt: '' });
      assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    }
  });
});

describe('password-reset tokens', () => {
  const reset = (body) => api.request('/auth/reset-password', { method: 'POST', body });
  const passwords = { newPassword: 'test-password-reset', confirmPassword: 'test-password-reset' };

  test('only the hash is stored, with a one-hour expiry', async () => {
    const { user } = await createUser();
    const token = await (await User().findById(user._id)).generateForgotPasswordToken();
    const stored = await withFields(user._id, ['forgotPasswordTokenExpiresAt']);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(stored.forgotPasswordToken, hashOneTimeToken(token));
    const ttl = stored.forgotPasswordTokenExpiresAt.getTime() - Date.now();
    assert.ok(ttl > 59 * MINUTE && ttl <= 60 * MINUTE, String(ttl));
  });

  test('an expired token is refused', async () => {
    const { user } = await createUser();
    const token = await (await User().findById(user._id)).generateForgotPasswordToken();
    await User().updateOne({ _id: user._id }, { forgotPasswordTokenExpiresAt: new Date(Date.now() - 1000) });
    assertBody(await reset({ token, email: user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));
    assert.equal((await login(user.email, PASSWORD)).status, 200);
  });

  test('the stored hash itself is not a token', async () => {
    const { user } = await createUser();
    await (await User().findById(user._id)).generateForgotPasswordToken();
    const { forgotPasswordToken } = await User().findById(user._id);
    assertBody(await reset({ token: forgotPasswordToken, email: user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));
  });

  test('two concurrent resets with one token: exactly one succeeds', async () => {
    const { user } = await createUser();
    const token = await (await User().findById(user._id)).generateForgotPasswordToken();
    const results = await Promise.all([reset({ token, email: user.email, ...passwords }), reset({ token, email: user.email, ...passwords })]);
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 400]);
  });

  test('a new request replaces the pending token', async () => {
    const { user } = await createUser();
    const first = await (await User().findById(user._id)).generateForgotPasswordToken();
    await (await User().findById(user._id)).generateForgotPasswordToken();
    assertBody(await reset({ token: first, email: user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));
  });
});

describe('verify-email tokens', () => {
  const verify = (body) => api.request('/auth/verify-email', { method: 'POST', body });

  test('only the hash is stored, with a 24-hour expiry; an expired token is refused', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { emailVerified: false });
    const token = await (await User().findById(user._id)).generateVerifyEmailToken();
    const stored = await withFields(user._id, ['verifyEmailTokenExpiresAt']);
    assert.equal(stored.verifyEmailToken, hashOneTimeToken(token));
    const ttl = stored.verifyEmailTokenExpiresAt.getTime() - Date.now();
    assert.ok(ttl > 23.9 * 60 * MINUTE && ttl <= 24 * 60 * MINUTE, String(ttl));

    await User().updateOne({ _id: user._id }, { verifyEmailTokenExpiresAt: new Date(Date.now() - 1000) });
    assertBody(await verify({ email: user.email, token }), 400, badRequest('INVALID_TOKEN'));
    assert.equal((await User().findById(user._id)).emailVerified, false);
  });

  test('the resend limit applies (the field name was misspelt)', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { emailVerified: false, lastVerifyEmailSentOn: new Date().toISOString() });
    assertBody(
      await api.request('/auth/verify-email/resend', { method: 'POST', body: { email: user.email } }),
      400,
      badRequest('VERIFY_EMAIL_LIMIT_EXCEEDED'),
    );
    assert.equal(sentEmails().length, 0);
  });
});

describe('contact OTP', () => {
  const send = (cookie, contactNo = '9000000042') => api.request('/auth/contact/send', { method: 'POST', body: { contactNo }, cookie });
  const resend = (cookie) => api.request('/auth/contact/resend', { method: 'POST', cookie });
  const verify = (cookie, otp) => api.request('/auth/contact/verify', { method: 'POST', body: { otp }, cookie });
  const otpFields = ['contactOtp', 'contactOtpExpiresAt', 'contactOtpAttempts', 'contactOtpSendCount', 'contactOtpSendWindowStart'];
  const allowAnotherText = (id) => User().updateOne({ _id: id }, { lastMessageSentOn: new Date(Date.now() - 2 * MINUTE).toISOString() });

  test('the code comes from crypto.randomInt and expires in 10 minutes', async (t) => {
    const randomInt = t.mock.method(crypto, 'randomInt', () => 424242);
    const { user, cookie } = await createUser();
    assert.equal((await send(cookie)).status, 200);
    assert.deepEqual(randomInt.mock.calls[0].arguments, [100000, 1000000]);
    const stored = await withFields(user._id, otpFields);
    assert.equal(stored.contactOtp, '424242');
    const ttl = stored.contactOtpExpiresAt.getTime() - Date.now();
    assert.ok(ttl > 9 * MINUTE && ttl <= 10 * MINUTE, String(ttl));
  });

  test('the first send is limited too: a second send within a minute answers RESEND_OTP_LIMIT_EXCEEDED', async () => {
    const { cookie } = await createUser();
    assert.equal((await send(cookie)).status, 200);
    assertBody(await send(cookie, '9000000043'), 400, badRequest('RESEND_OTP_LIMIT_EXCEEDED'));
    assert.equal(sentTexts().length, 1);
  });

  test('at most 5 texts (send and resend) per user in 24 hours', async () => {
    const { user, cookie } = await createUser();
    assert.equal((await send(cookie)).status, 200);
    for (let i = 0; i < 4; i += 1) {
      await allowAnotherText(user._id);
      assert.equal((await (i % 2 ? send(cookie) : resend(cookie))).status, 200);
    }
    await allowAnotherText(user._id);
    assertBody(await send(cookie), 400, badRequest('RESEND_OTP_LIMIT_EXCEEDED'));
    await allowAnotherText(user._id);
    assertBody(await resend(cookie), 400, badRequest('RESEND_OTP_LIMIT_EXCEEDED'));
    assert.equal(sentTexts().length, 5);

    // A new window opens a day after the last one started.
    await User().updateOne({ _id: user._id }, { contactOtpSendWindowStart: new Date(Date.now() - 25 * 60 * MINUTE) });
    assert.equal((await send(cookie)).status, 200);
  });

  test('an expired OTP fails and is cleared; it cannot be resent', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactOtpExpiresAt: new Date(Date.now() - 1000) });
    assertBody(await resend(cookie), 400, badRequest('CONTACT_VERIFICATION_NOT_EXIST'));
    assertBody(await verify(cookie, '123456'), 400, badRequest('OTP_VERIFICATION_FAILED'));
    assertBody(await verify(cookie, '123456'), 400, badRequest('CONTACT_VERIFICATION_NOT_EXIST'));
    assert.equal((await User().findById(user._id)).contactVerified, false);
  });

  test('after 5 wrong tries the OTP is invalidated, even for the right code', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactOtpExpiresAt: new Date(Date.now() + 5 * MINUTE) });
    for (let i = 0; i < 5; i += 1) {
      assertBody(await verify(cookie, '654321'), 400, badRequest('OTP_VERIFICATION_FAILED'));
    }
    assertBody(await verify(cookie, '123456'), 400, badRequest('CONTACT_VERIFICATION_NOT_EXIST'));
    assert.equal((await User().findById(user._id)).contactVerified, false);
  });

  test('parallel guesses each spend a try', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactOtpExpiresAt: new Date(Date.now() + 5 * MINUTE) });
    const guesses = await Promise.all(Array.from({ length: 8 }, (_, i) => verify(cookie, String(200000 + i))));
    assert.ok(guesses.every((res) => res.status === 400));
    assert.equal((await withFields(user._id, ['contactOtp'])).contactOtp, '');
  });

  test('the right code within its tries verifies the number', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactOtpExpiresAt: new Date(Date.now() + 5 * MINUTE) });
    assertBody(await verify(cookie, '111111'), 400, badRequest('OTP_VERIFICATION_FAILED'));
    assertBody(await verify(cookie, '123456'), 200, okString('OTP_VERIFICATION_SUCCESS'));
    const stored = await withFields(user._id, otpFields);
    assert.deepEqual([stored.contactVerified, stored.contactOtp, stored.contactOtpExpiresAt, stored.contactOtpAttempts], [true, '', null, 0]);
  });

  test('OTP state never reaches the profile', async () => {
    const { user, cookie } = await createUser();
    await send(cookie);
    const { body } = await me(cookie);
    for (const key of [...otpFields, 'lastMessageSentOn', 'password', 'salt']) assert.ok(!(key in body.data), key);
    assert.equal(body.data.email, user.email);
  });
});

describe('removed routes', () => {
  test('DELETE /auth/me and GET /auth/recoverAccount no longer exist', async () => {
    const { cookie } = await createUser();
    assert.equal((await api.request('/auth/me', { method: 'DELETE', body: { password: PASSWORD }, cookie })).status, 404);
    assert.equal((await api.request('/auth/recoverAccount', { cookie })).status, 404);
    assert.equal((await me(cookie)).status, 200);
  });
});

describe('review and audit fixes', () => {
  const resetBody = (email, token) => ({ token, email, newPassword: 'test-password-reset', confirmPassword: 'test-password-reset' });
  const resetVia = async (user) => {
    const token = await (await User().findById(user._id)).generateForgotPasswordToken();
    const res = await api.request('/auth/reset-password', { method: 'POST', body: resetBody(user.email, token) });
    assert.equal(res.status, 200);
  };

  test('a login checking the old (legacy) password while a reset lands fails and never writes the old password back', async (t) => {
    const { user } = await createUser();
    const salt = crypto.randomBytes(8).toString('hex');
    await User().updateOne({ _id: user._id }, { salt, password: legacyHash(PASSWORD, salt) });

    const original = User().prototype.checkPassword;
    t.mock.method(User().prototype, 'checkPassword', async function (password) {
      const result = await original.call(this, password);
      await resetVia(user);
      return result;
    });

    assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    t.mock.restoreAll();
    assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    assert.equal((await login(user.email, 'test-password-reset')).status, 200);
  });

  test('a session a login signs while a reset lands is refused (sessionVersion)', async (t) => {
    const { user } = await createUser();
    const original = AccessTokens().create;
    let raced = false;
    t.mock.method(AccessTokens(), 'create', async function (...args) {
      if (!raced) {
        raced = true;
        await resetVia(user);
      }
      return original.apply(this, args);
    });

    const res = await login(user.email, PASSWORD);
    assert.equal(res.status, 200);
    t.mock.restoreAll();
    assertBody(await me(sessionCookie(res)), 401, unauthorized('INVALID_TOKEN'));
    assert.equal((await login(user.email, 'test-password-reset')).status, 200);
  });

  test('verifying the email never changes the account status: a blocked account stays blocked', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { emailVerified: false, status: 'BLOCKED' });
    const token = await (await User().findById(user._id)).generateVerifyEmailToken();

    assertBody(await api.request('/auth/verify-email', { method: 'POST', body: { email: user.email, token } }), 200, okString('EMAIL_VERIFIED'));
    const fresh = await User().findById(user._id);
    assert.deepEqual([fresh.emailVerified, fresh.status], [true, 'BLOCKED']);
    assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
  });

  test('the verification resend refuses accounts already verified or not active', async () => {
    const { user } = await createUser();
    const resend = () => api.request('/auth/verify-email/resend', { method: 'POST', body: { email: user.email } });
    assertBody(await resend(), 400, badRequest('NO_USER_FOUND_FOR_THIS_EMAIL'));
    await User().updateOne({ _id: user._id }, { emailVerified: false, status: 'BLOCKED' });
    assertBody(await resend(), 400, badRequest('NO_USER_FOUND_FOR_THIS_EMAIL'));
    assert.equal(sentEmails().length, 0);
  });

  test('parallel contact sends take one text from the allowance', async () => {
    const { user, cookie } = await createUser();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '9000000042' }, cookie })),
    );
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 400, 400, 400, 400, 400]);
    assert.equal(sentTexts().length, 1);
    assert.equal((await withFields(user._id, ['contactOtpSendCount'])).contactOtpSendCount, 1);
  });

  test('the contact OTP is read from the validated payload (trimmed)', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactOtpExpiresAt: new Date(Date.now() + 5 * MINUTE) });
    assertBody(await api.request('/auth/contact/verify', { method: 'POST', body: { otp: ' 123456 ' }, cookie }), 200, okString('OTP_VERIFICATION_SUCCESS'));
  });

  test('a wrong password costs a scrypt hash whatever the stored hash', async () => {
    const { verifyPassword } = require('../src/helpers/encryption.helper');
    const salt = crypto.randomBytes(8).toString('hex');
    const legacy = legacyHash(PASSWORD, salt);
    const time = async (fn) => {
      let best = Infinity;
      for (let i = 0; i < 3; i += 1) {
        const start = process.hrtime.bigint();
        await fn();
        best = Math.min(best, Number(process.hrtime.bigint() - start) / 1e6);
      }
      return best;
    };
    const { user } = await createUser();
    const { password: scryptStored } = await User().findById(user._id);

    const scryptMs = await time(() => verifyPassword('wrong-password', scryptStored));
    for (const [stored, legacySalt] of [[legacy, salt], ['', ''], ['not-a-hash', ''], ['scrypt$broken', '']]) {
      const ms = await time(() => verifyPassword('wrong-password', stored, legacySalt));
      assert.ok(ms > scryptMs * 0.4, `${stored.slice(0, 12)}: ${ms} ms vs scrypt ${scryptMs} ms`);
    }
  });

  test('stored scrypt parameters above N 2^17 or r 16 are refused', async () => {
    const { user } = await createUser();
    for (const password of [`scrypt$${2 ** 18}$8$1$c2FsdA==$aGFzaA==`, 'scrypt$1024$32$1$c2FsdA==$aGFzaA==']) {
      await User().updateOne({ _id: user._id }, { password, salt: '' });
      assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    }
  });

  test('access_tokens stores the SHA-256 of the session JWT, and a TTL index removes records after their expiry', async () => {
    const { user } = await createUser();
    const token = sessionCookie(await login(user.email, PASSWORD)).slice('_PID='.length);
    assert.equal(await AccessTokens().countDocuments({ token }), 0);
    assert.equal(await AccessTokens().countDocuments({ token: hashSessionToken(token) }), 1);

    await AccessTokens().syncIndexes();
    const indexes = await AccessTokens().listIndexes();
    assert.ok(indexes.some((index) => index.key.expires === 1 && index.expireAfterSeconds === 0));
  });

  test('a deleted account cannot log in', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { isDeleted: true });
    assertBody(await login(user.email, PASSWORD), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
  });

  test('contactOtp is not selected by default', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456' });
    assert.equal((await User().findById(user._id)).contactOtp, undefined);
    assert.equal((await User().findById(user._id).lean()).contactOtp, undefined);
  });
});
