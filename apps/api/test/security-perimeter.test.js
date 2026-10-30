const { after, afterEach, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');
const { createAddress, createOrder, loadOrderCatalog, razorpaySignature } = require('./helpers/fixtures/orders');
const shipping = require('../src/adapters/shipping');
const storage = require('../src/adapters/storage');
const rateLimits = require('../src/middlewares/rateLimit.middleware');
const { parseEnv, EnvError } = require('../src/env');
const { TEST_ENV } = require('./helpers/env');
const messages = require('../src/locales/en.json');

// PLAN.md Phase 4 step 7a (perimeter): the CORS allowlist, rate limits, body limits and the upload parser, the
// query-filter sanitising, the removed endpoints and the webhook's raw-body signature check.

const { badRequest, forbidden } = envelopes;

const tooManyRequests = {
  statusCode: 429,
  status: 'TOO_MANY_REQUESTS',
  message: messages.TOO_MANY_REQUESTS,
  data: {},
  error: messages.TOO_MANY_REQUESTS,
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

let api;
let root;

const send = async (url, init = {}) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: res.status, headers: res.headers, body };
};

before(async () => {
  api = await startTestApp();
  root = api.baseUrl.replace(/\/api\/v1$/, '');
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
});

describe('CORS allowlist (ALLOWED_ORIGINS)', () => {
  test('echoes an allowed origin with credentials', async () => {
    const res = await send(`${api.baseUrl}/`, { headers: { Origin: 'http://localhost:4200' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:4200');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  // Was: `cors({ origin: true })` reflected any origin with credentials, so any site could read a shopper's data.
  test('gives any other origin no CORS headers, on requests and preflights', async () => {
    for (const origin of ['https://evil.example.com', 'null', 'http://localhost:4200.evil.example.com']) {
      const res = await send(`${api.baseUrl}/`, { headers: { Origin: origin } });
      assert.equal(res.headers.get('access-control-allow-origin'), null, origin);

      const preflight = await send(`${api.baseUrl}/auth/me`, {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT' },
      });
      assert.equal(preflight.headers.get('access-control-allow-origin'), null, origin);
    }
  });

  test('answers an allowed preflight with the allowed methods and headers', async () => {
    const res = await send(`${api.baseUrl}/auth/me`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'PUT' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.headers.get('access-control-allow-methods'), 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    assert.match(res.headers.get('access-control-allow-headers'), /Content-Type/);
  });
});

describe('body limits and multipart parsing', () => {
  // Was: 100 MB for JSON and urlencoded bodies.
  test('refuses a JSON body over 100 kb with 413', async () => {
    const big = 'x'.repeat(101 * 1024);
    const json = await send(`${api.baseUrl}/subscribers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com', padding: big }),
    });
    assert.equal(json.status, 413);
    assert.equal(await mongoose.model('subscriber').countDocuments(), 0);
  });

  // Was: parsed (100 MB). No client sends them, and a cross-site form post is one.
  test('does not parse a urlencoded body', async () => {
    const res = await send(`${api.baseUrl}/subscribers`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'reader@example.com' }).toString(),
    });
    assert.equal(res.status, 400);
    assert.equal(await mongoose.model('subscriber').countDocuments(), 0);
  });

  test('accepts a body under the limit', async () => {
    const res = await send(`${api.baseUrl}/subscribers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com' }),
    });
    assert.equal(res.status, 200);
  });

  // Was: `multer().any()` on every route, so any request could buffer files into memory.
  test('parses multipart only on the upload route', async () => {
    const form = new FormData();
    form.append('email', 'reader@example.com');
    form.append('file', new Blob([PNG_SIGNATURE]), 'cover.png');
    const res = await send(`${api.baseUrl}/subscribers`, { method: 'POST', body: form });
    assert.equal(res.status, 400);
    assert.equal(await mongoose.model('subscriber').countDocuments(), 0);
  });
});

describe('POST /file/upload (single file, size limit, content check)', () => {
  let admin;

  beforeEach(async () => {
    admin = await createUser({ role: 'ADMIN' });
  });

  const upload = (parts, cookie = admin.cookie) => {
    const form = new FormData();
    form.append('fileModule', 'AUTHOR');
    form.append('title', 'Test Photo');
    for (const [field, content, name] of parts) form.append(field, new Blob([content]), name);
    return send(`${api.baseUrl}/file/upload`, { method: 'POST', body: form, headers: cookie ? { cookie } : {} });
  };

  test('stores a png and a jpeg whose bytes match their extension', async () => {
    assert.equal((await upload([['file', Buffer.concat([PNG_SIGNATURE, Buffer.from('x')]), 'a.png']])).status, 200);
    assert.equal((await upload([['file', Buffer.concat([JPEG_SIGNATURE, Buffer.from('x')]), 'a.jpg']])).status, 200);
    assert.equal((await upload([['file', Buffer.concat([JPEG_SIGNATURE, Buffer.from('x')]), 'a.jpeg']])).status, 200);
    assert.equal(storage.list().length, 3);
  });

  test('refuses content that does not match its extension', async () => {
    const cases = [
      ['file', Buffer.from('<html>not an image</html>'), 'page.png'],
      ['file', Buffer.concat([JPEG_SIGNATURE, Buffer.from('x')]), 'photo.png'],
      ['file', Buffer.concat([PNG_SIGNATURE, Buffer.from('x')]), 'cover.jpg'],
      ['file', Buffer.alloc(0), 'empty.jpeg'],
    ];
    for (const part of cases) {
      assertBody(await upload([part]), 400, badRequest('UNSUPPORTED_FILE_TYPE'));
    }
    assert.deepEqual(storage.list(), []);
  });

  // 4 MB: below Vercel's 4.5 MB request body cap.
  test('refuses a file over 4 MB with 413 FILE_TOO_LARGE', async () => {
    const content = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(4 * 1024 * 1024)]);
    const res = await upload([['file', content, 'big.png']]);
    assertBody(res, 413, { statusCode: 413, status: 'FILE_TOO_LARGE', message: messages.FILE_TOO_LARGE, error: messages.FILE_TOO_LARGE, data: {} });
    assert.deepEqual(storage.list(), []);
  });

  test('reads the real extension in any case; a bare name like `png` has none', async () => {
    const png = Buffer.concat([PNG_SIGNATURE, Buffer.from('x')]);
    for (const name of ['png', '.png', 'cover.png.', 'cover']) {
      assertBody(await upload([['file', png, name]]), 400, badRequest('UNSUPPORTED_FILE_TYPE'));
    }
    assert.equal((await upload([['file', png, 'COVER.PNG']])).status, 200);
    assert.match(storage.list()[0].pathname, /\.png$/);
  });

  test("stores the content type of the checked extension, never the client's", async () => {
    const form = new FormData();
    form.append('fileModule', 'AUTHOR');
    form.append('title', 'Test Photo');
    form.append('file', new Blob([Buffer.concat([JPEG_SIGNATURE, Buffer.from('x')])], { type: 'text/html' }), 'photo.jpg');
    const res = await send(`${api.baseUrl}/file/upload`, { method: 'POST', body: form, headers: { cookie: admin.cookie } });
    assert.equal(res.status, 200);
    assert.equal(storage.list()[0].contentType, 'image/jpeg');
    assert.equal((await mongoose.model('file').findOne()).mimeType, 'image/jpeg');
  });

  test('refuses a file under another field name, or a second file', async () => {
    const png = Buffer.concat([PNG_SIGNATURE, Buffer.from('x')]);
    assertBody(await upload([['image', png, 'a.png']]), 400, badRequest('INVALID_FILE'));
    assertBody(
      await upload([
        ['file', png, 'a.png'],
        ['file', png, 'b.png'],
      ]),
      400,
      badRequest('INVALID_FILE'),
    );
    assert.deepEqual(storage.list(), []);
  });

  test('checks the ADMIN session before reading the upload', async () => {
    const shopper = await createUser();
    const png = Buffer.concat([PNG_SIGNATURE, Buffer.from('x')]);
    const anonymous = await upload([['file', png, 'a.png']], null);
    assert.deepEqual([anonymous.status, anonymous.body.status], [401, 'UNAUTHORIZED']);
    assertBody(await upload([['file', png, 'a.png']], shopper.cookie), 403, forbidden);
    assert.deepEqual(storage.list(), []);
  });
});

describe('removed endpoints', () => {
  // POST /public/contactUs mailed request-chosen template data to the shop, unauthenticated. GET
  // /store-books/bulk/export was unauthenticated, wrote to local disk and could crash the process. GET /re-index rebuilt
  // the in-process search indexes; search now queries the database.
  test('POST /public/contactUs, GET /store-books/bulk/export and GET /re-index answer 404', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    assert.equal((await api.request('/public/contactUs', { method: 'POST', body: { PRODUCTS: [], BUNDLES: [] } })).status, 404);
    assert.equal((await api.request('/store-books/bulk/export', { cookie: admin.cookie })).status, 404);
    assert.equal((await send(`${root}/re-index`, { headers: { cookie: admin.cookie } })).status, 404);
  });

  // PUT /users/:id let an admin rewrite another account; no client called it (the api-client never exposed it).
  test('PUT /users/:id answers 404 and leaves the account unchanged', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const shopper = await createUser();
    const res = await api.request(`/users/${shopper.user._id}`, { method: 'PUT', body: { fullName: 'Test Renamed' }, cookie: admin.cookie });
    assert.equal(res.status, 404);
    assert.equal((await mongoose.model('user').findById(shopper.user._id)).fullName, shopper.user.fullName);
  });
});

describe("mongoose sanitizeFilter (operators from a request can't reach a query)", () => {
  test('is on', () => {
    assert.equal(mongoose.get('sanitizeFilter'), true);
  });

  // req.allParams() lets the query replace a path param; was: `?uniqueId[$ne]=x` answered the shopper's first order.
  // Now the operator is matched as a literal value, which can't be cast to the string field: the legacy 500 until the
  // controller reads req.params (PLAN.md: controllers read req.validated / req.params only).
  test('an operator in the query string matches nothing', async () => {
    const shopper = await createUser();
    const order = await createOrder(shopper.user, { payment: { method: 'cod' } });
    const res = await api.request('/orders/getByUniqueId/OD-0000000000?uniqueId[$ne]=x', { cookie: shopper.cookie });
    assert.notEqual(res.status, 200);
    assert.doesNotMatch(JSON.stringify(res.body), new RegExp(order.orderId));
  });
});

describe('Razorpay webhook signature over the raw body', () => {
  let order;

  beforeEach(async () => {
    await loadCatalog();
    await loadOrderCatalog();
    const shopper = await createUser();
    const address = await createAddress(shopper.user);
    order = await createOrder(shopper.user, {
      orderStatus: 'created',
      razorOrderId: 'order_test_raw',
      deliveryAddress: address._id,
      products: [{ quantity: 1, price: 499, discount: 0, productTotal: 499, product: ids.bookOne }],
    });
  });

  const event = () => ({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_test_raw', order_id: 'order_test_raw', method: 'upi', status: 'captured', amount: 49900, currency: 'INR' } } },
  });

  const deliver = (raw, signature) =>
    send(`${api.baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature },
      body: raw,
    });

  // Was: the signature was checked over JSON.stringify(req.body), so a body Razorpay formatted differently never
  // verified, and a re-serialised body did.
  test('verifies the exact bytes received, whatever their formatting', async () => {
    const raw = JSON.stringify(event(), null, 2);
    assert.equal((await deliver(raw, razorpaySignature(raw))).status, 200);
    assert.equal((await mongoose.model('order').findById(order._id)).orderStatus, 'paid');
  });

  // Was: the payload came from req.allParams(), so query keys could add fields the signature didn't cover.
  test('reads the payload only from the signed body, never the query string', async () => {
    const unsigned = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_test_raw', method: 'upi', status: 'captured', amount: 49900, currency: 'INR' } } } };
    const raw = JSON.stringify(unsigned);
    const res = await send(`${api.baseUrl}/orders/confirm?payload[payment][entity][order_id]=order_test_raw`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': razorpaySignature(raw) },
      body: raw,
    });
    assert.equal(res.status, 200);
    assert.equal((await mongoose.model('order').findById(order._id)).orderStatus, 'created');
  });

  test('a signature over a re-serialisation of the body does not verify', async () => {
    const raw = JSON.stringify(event(), null, 2);
    assert.equal((await deliver(raw, razorpaySignature(JSON.stringify(event())))).status, 200);
    assert.equal((await mongoose.model('order').findById(order._id)).orderStatus, 'created');
  });
});

describe('rate limits', () => {
  const { settings } = rateLimits;
  const defaults = structuredClone(settings.limits);

  beforeEach(() => {
    settings.enabled = true;
    rateLimits.resetRateLimits();
  });

  afterEach(() => {
    settings.enabled = false;
    settings.limits = structuredClone(defaults);
    rateLimits.resetRateLimits();
  });

  const repeat = async (times, call) => {
    const results = [];
    for (let i = 0; i < times; i += 1) results.push(await call(i));
    return results;
  };

  test('the named limits and the general one', () => {
    assert.deepEqual(defaults, { general: 150, slowDownAfter: 125, login: 10, messageSend: 5, codeCheck: 10, pincodeCheck: 30 });
  });

  test('the general limit covers every request and answers the 429 envelope with RateLimit headers', async () => {
    settings.limits.general = 3;
    const statuses = (await repeat(3, () => api.request('/'))).map((res) => res.status);
    assert.deepEqual(statuses, [200, 200, 200]);
    const res = await api.request('/');
    assertBody(res, 429, tooManyRequests);
    assert.ok(res.headers.get('ratelimit-policy'));
    assert.equal((await send(`${root}/sitemap.xml`)).status, 429);
  });

  test('login: 10 failed attempts per 15 minutes; successful logins do not count', async () => {
    const { user, password } = await createUser();
    const login = (pw) => api.request('/auth/login', { method: 'POST', body: { email: user.email, password: pw } });
    for (const res of await repeat(12, () => login(password))) assert.equal(res.status, 200);
    for (const res of await repeat(10, () => login('wrong-password-1'))) assert.notEqual(res.status, 429);
    assertBody(await login(password), 429, tooManyRequests);
  });

  test('e-mail/SMS sends: 5 per 15 minutes across the send routes', async () => {
    const send5 = await repeat(5, (i) =>
      api.request(i % 2 ? '/auth/forgot-password' : '/auth/verify-email/resend', { method: 'POST', body: { email: 'nobody@example.com' } }),
    );
    for (const res of send5) assert.notEqual(res.status, 429);
    assertBody(await api.request('/auth/forgot-password', { method: 'POST', body: { email: 'nobody@example.com' } }), 429, tooManyRequests);
    assertBody(await api.request('/auth/register', { method: 'POST', body: {} }), 429, tooManyRequests);
  });

  test('one-time-code checks: 10 failures per 15 minutes', async () => {
    const reset = () =>
      api.request('/auth/reset-password', {
        method: 'POST',
        body: { email: 'nobody@example.com', token: 'not-a-token', password: 'new-password-1', confirmPassword: 'new-password-1' },
      });
    for (const res of await repeat(10, reset)) assert.notEqual(res.status, 429);
    assertBody(await reset(), 429, tooManyRequests);
    assertBody(await api.request('/auth/verify-email', { method: 'POST', body: { token: 'x' } }), 429, tooManyRequests);
  });

  test('the public pincode check: 30 per 15 minutes, then no courier call', async () => {
    const check = () => api.request('/addresses/check-pincode/100001');
    for (const res of await repeat(30, check)) assert.equal(res.status, 200);
    assertBody(await check(), 429, tooManyRequests);
    assert.equal(shipping.list().filter((entry) => entry.type === 'pincode').length, 30);
  });

  test('each named limit counts on its own', async () => {
    settings.limits.pincodeCheck = 1;
    await api.request('/addresses/check-pincode/100001');
    assert.equal((await api.request('/addresses/check-pincode/100001')).status, 429);
    assert.notEqual((await api.request('/auth/forgot-password', { method: 'POST', body: { email: 'nobody@example.com' } })).status, 429);
  });
});

describe('rate limits in the test harness', () => {
  test('are on in the app; the harness switches them off', async () => {
    // A fresh process, under the same APP_ENV=test config, loads the limiters switched on.
    const enabled = require('node:child_process').execFileSync(
      process.execPath,
      ['-e', "process.stdout.write(String(require('./src/middlewares/rateLimit.middleware').settings.enabled))"],
      { cwd: require('node:path').join(__dirname, '..'), env: process.env, encoding: 'utf8' },
    );
    assert.equal(enabled, 'true');
    assert.equal(rateLimits.settings.enabled, false);
    for (let i = 0; i < 12; i += 1) {
      assert.notEqual((await api.request('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'wrong-password-1' } })).status, 429);
    }
  });
});

// Audit M1: X-Forwarded-For is trusted only on Vercel (whose proxy sets it); elsewhere it is client-controlled.
describe('trust proxy', () => {
  afterEach(() => {
    rateLimits.settings.enabled = false;
    rateLimits.resetRateLimits();
  });

  test('is off outside Vercel, so a spoofed X-Forwarded-For does not reset a limit', async () => {
    assert.equal(api.app.get('trust proxy'), false);
    rateLimits.settings.enabled = true;
    rateLimits.resetRateLimits();
    rateLimits.settings.limits.pincodeCheck = 1;
    try {
      const check = (ip) => send(`${api.baseUrl}/addresses/check-pincode/100001`, { headers: { 'x-forwarded-for': ip } });
      assert.equal((await check('203.0.113.1')).status, 200);
      for (const ip of ['203.0.113.2', '198.51.100.7', '2001:db8::1']) assert.equal((await check(ip)).status, 429, ip);
    } finally {
      rateLimits.settings.limits.pincodeCheck = 30;
    }
  });
});

// Audit M3: test-only behaviour must never run in a deployment.
describe('APP_ENV=test on Vercel', () => {
  const base = { ...TEST_ENV, MONGODB_URI: 'mongodb://127.0.0.1:27017/pageaters_test' };

  test('is refused with a fixed message', () => {
    assert.throws(
      () => parseEnv({ ...base, VERCEL: '1' }),
      (error) => error instanceof EnvError && error.variables.includes('APP_ENV') && /APP_ENV: must not be test on Vercel \(VERCEL is set\)/.test(error.message),
    );
  });

  test('test without VERCEL and production on Vercel are accepted', () => {
    assert.equal(parseEnv(base).APP_ENV, 'test');
    assert.equal(parseEnv({ ...base, APP_ENV: 'production', VERCEL: '1' }).VERCEL, '1');
  });
});
