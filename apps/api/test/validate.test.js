const { after, before, beforeEach, describe, test } = require('node:test');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, startTestApp } = require('./helpers');

// Request validation (middlewares/validate.middleware.js with the @pageaters/shared request schemas) on the routes
// whose rules had no HTTP test before Joi was replaced. A failure answers res.error with the error object, so the
// envelope is the object form: `message` before `error`.

const invalid = envelopes.badRequestObject;

let api;
let shopper;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  shopper = await createUser();
});

const post = (path, body, cookie) => api.request(path, { method: 'POST', body, cookie });

// Joi had no code for these and sent its own English text, which could echo a client-chosen key name; they now answer
// the fixed INVALID_REQUEST.
const assertUncoded = (res) => assertBody(res, 400, invalid('INVALID_REQUEST'));

describe('auth payloads', () => {
  test('login, verify-email/resend, forgot-password and its resend need a well-formed email', async () => {
    for (const path of ['/auth/login', '/auth/verify-email/resend', '/auth/forgot-password', '/auth/forgot-password/resend']) {
      const body = path === '/auth/login' ? { email: 'nope', password: 'test-password' } : { email: 'nope' };
      assertBody(await post(path, body), 400, invalid('INVALID_EMAIL'));
    }
  });

  test('login needs a password of 1–50 characters (trimmed)', async () => {
    assertBody(await post('/auth/login', { email: 'someone@example.com', password: '   ' }), 400, invalid('INVALID_PASSWORD'));
    assertBody(await post('/auth/login', { email: 'someone@example.com', password: 'p'.repeat(51) }), 400, invalid('INVALID_PASSWORD'));
  });

  test('a key the schema does not list is refused', async () => {
    assertUncoded(await post('/auth/login', { email: 'someone@example.com', password: 'test-password', role: 'ADMIN' }));
  });

  test('logout refuses unknown keys after the session check', async () => {
    assertUncoded(await post('/auth/logout', { other: 1 }, shopper.cookie));
  });

  test('DELETE /auth/me needs the password', async () => {
    assertBody(await api.request('/auth/me', { method: 'DELETE', body: {}, cookie: shopper.cookie }), 400, invalid('INVALID_PASSWORD'));
  });
});

describe('address payloads', () => {
  test('DELETE and PATCH /addresses/:id refuse a malformed id before auth', async () => {
    for (const method of ['DELETE', 'PATCH']) {
      assertBody(await api.request('/addresses/not-an-id', { method }), 400, invalid('INVALID_ID'));
    }
  });

  test('the pincode check refuses a blank pincode', async () => {
    assertBody(await api.request('/addresses/check-pincode/%20'), 400, invalid('INVALID_PINCODE'));
  });
});

describe('checkout payloads', () => {
  const create = (body) => post('/orders/create', body, shopper.cookie);

  test('instructions are at most 100 characters', async () => {
    assertBody(await create({ method: 'cod', instructions: 'i'.repeat(101) }), 400, invalid('INVALID_INSTRUCTIONS'));
  });

  test('gift options need isGift', async () => {
    assertBody(await create({ method: 'cod', giftOptions: {} }), 400, invalid('INVALID_DEFAULT_SELECTION'));
  });

  test('a gift cost must be a whole number ≥ 0 (no code)', async () => {
    assertUncoded(await create({ method: 'cod', giftOptions: { isGift: true, details: { cost: -1 } } }));
  });

  test('order/attempt refuses unknown keys', async () => {
    assertUncoded(await post('/orders/attempt', { address: String(new mongoose.Types.ObjectId()), total: 1 }, shopper.cookie));
  });
});
