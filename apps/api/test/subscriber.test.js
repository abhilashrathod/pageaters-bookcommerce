const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asJson, assertBody, assertGuarded, createUser, envelopes, paged, startTestApp } = require('./helpers');
const t = require('../src/locales/en.json');

// /api/v1/subscribers (newsletter sign-up) over HTTP, written against the legacy controller before the service
// refactor. (POST /public/contactUs, an unauthenticated mail trigger, was removed in PLAN.md 7a.)

const { ok } = envelopes;

let api;
let admin;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  admin = await createUser({ role: 'ADMIN' });
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
