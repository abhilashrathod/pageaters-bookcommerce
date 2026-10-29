const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asJson, assertBody, assertGuarded, createUser, envelopes, eventually, mockVendorCall, paged, startTestApp } = require('./helpers');
const { addressFields } = require('./helpers/fixtures/store');
const t = require('../src/locales/en.json');

// /api/v1/subscribers (newsletter sign-up) and /api/v1/public/contactUs over HTTP, written against the legacy
// controllers before the service refactor.

const { ok, okString, serverError } = envelopes;

let api;
let admin;
let mails;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  admin = await createUser({ role: 'ADMIN' });
  mails = [];
  mockVendorCall('sendgrid.send', (mail) => {
    mails.push(mail);
  });
});

const signUp = (email) => api.request('/subscribers', { method: 'POST', body: { email } });

describe('POST /subscribers', () => {
  test('signs up an email once, without a session', async () => {
    assertBody(await signUp('reader@example.com'), 200, ok('SUBSCRIBER_CREATE_SUCCESS'));
    assertBody(await signUp('reader@example.com'), 200, ok('SUBSCRIBER_EXIST'));
    assert.equal(await mongoose.model('subscriber').countDocuments({ email: 'reader@example.com' }), 1);
  });

  test('refuses a malformed email (Joi, object-form 400)', async () => {
    const res = await signUp('not-an-email');
    assertBody(res, 400, { statusCode: 400, status: 'INVALID_EMAIL', message: t.INVALID_EMAIL, error: t.INVALID_EMAIL, data: {} });
  });
});

describe('GET /subscribers (admin)', () => {
  test('needs an ADMIN session', async () => {
    const shopper = await createUser();
    await assertGuarded(api, ['GET', '/subscribers'], { admin: true, userCookie: shopper.cookie });
  });

  test('pages the subscribers', async () => {
    await signUp('one@example.com');
    await signUp('two@example.com');
    const docs = asJson(await mongoose.model('subscriber').find().sort({ _id: 1 }));
    assertBody(
      await api.request('/subscribers?page=1&limit=1', { cookie: admin.cookie }),
      200,
      ok('SUBSCRIBER_LIST_SUCCESS', paged(docs.slice(0, 1), { totalDocs: 2, limit: 1, totalPages: 2, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: true, prevPage: null, nextPage: 2 })),
    );
  });

  test('legacy: without page/limit answers no documents', async () => {
    await signUp('one@example.com');
    assertBody(
      await api.request('/subscribers', { cookie: admin.cookie }),
      200,
      ok('SUBSCRIBER_LIST_SUCCESS', paged([], { totalDocs: 1, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })),
    );
  });
});

describe('POST /public/contactUs', () => {
  const payload = {
    ORDER_ID: 'TEST-ORDER-1',
    PRODUCTS: [{ product: { title: 'Test Book One', poster: 'test-cover.png' }, quantity: 1 }],
    BUNDLES: [{ bundle: { title: 'Test Bundle One', poster: 'test-bundle.png' }, quantity: 1 }],
    BOXES: [],
    ADDRESS: addressFields(),
    FULL_NAME: 'Test Receiver',
    ORDER_DATE: '2026-01-01',
    GIFT_CHARGES: 0,
    STORE_CREDIT: 0,
    SHIPPING: 0,
    SUBTOTAL: 0,
    TOTAL: 0,
  };

  test('legacy: unauthenticated, queues an order-confirmation mail to the shop', async () => {
    assertBody(await api.request('/public/contactUs', { method: 'POST', body: payload }), 200, okString('MAIL_SENT'));
    // The mail log is written after the send; wait for it so nothing runs after the test.
    await eventually(() => mongoose.model('log_email').countDocuments());
    assert.deepEqual(mails.map(({ to, subject }) => ({ to, subject })), [{ to: 'owner@example.com', subject: 'Order Confirmation #TEST-ORDER-1 - Pageaters' }]);
  });

  test('legacy: answers 500 without PRODUCTS or BUNDLES', async () => {
    assertBody(await api.request('/public/contactUs', { method: 'POST', body: {} }), 500, serverError);
    assertBody(await api.request('/public/contactUs', { method: 'POST', body: { PRODUCTS: [] } }), 500, serverError);
    // res.internalServerError logs the request to log_api without awaiting; let it land before the app stops.
    await eventually(async () => (await mongoose.model('log_api').countDocuments()) === 2);
  });
});
