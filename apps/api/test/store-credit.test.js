const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, mockVendorCall, startTestApp } = require('./helpers');
const { asJson, assertBody, assertGuarded, envelopes, eventually, paged, stopApp } = require('./helpers/fixtures/store');

// /api/v1/store-credit over HTTP: issue credit (admin), balance and history (shopper). Pins the legacy envelopes
// byte for byte, written against the legacy controller before the service refactor.

const { ok, created, badRequest, serverError } = envelopes;

let api;
let admin;
let shopper;
let mails;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await stopApp(api);
});

beforeEach(async () => {
  await api.reset();
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
  mails = [];
  mockVendorCall('sendgrid.send', (mail) => {
    mails.push(mail);
  });
});

const issue = (body, cookie = admin.cookie) => api.request('/store-credit', { method: 'POST', body, cookie });
const balanceOf = async (user) => (await mongoose.model('user').findById(user._id)).storeCredit;
const transactionsOf = (user) => mongoose.model('store_credit_transactions').find({ userId: user._id }).sort({ createdAt: 1 });

describe('auth', () => {
  test('balance and history need a session', async () => {
    await assertGuarded(api, ['GET', '/store-credit']);
    await assertGuarded(api, ['GET', '/store-credit/history']);
  });

  test('issuing credit needs an ADMIN session', async () => {
    await assertGuarded(api, ['POST', '/store-credit', { userId: String(shopper.user._id), credit: 10 }], { admin: true, userCookie: shopper.cookie });
    assert.equal(await balanceOf(shopper.user), 0);
  });
});

describe('POST /store-credit (issue)', () => {
  test('adds to the balance, records a CREDIT transaction and mails the shopper', async () => {
    const orderId = String(new mongoose.Types.ObjectId());
    assertBody(await issue({ userId: String(shopper.user._id), credit: 150, orderId }), 201, created('STORE_CREDIT_SUCCESS'));
    assertBody(await issue({ userId: String(shopper.user._id), credit: 25 }), 201, created('STORE_CREDIT_SUCCESS'));

    assert.equal(await balanceOf(shopper.user), 175);
    const records = await transactionsOf(shopper.user);
    assert.deepEqual(
      records.map(({ amount, action, expired, orderId: order }) => ({ amount, action, expired, orderId: order && String(order) })),
      [
        { amount: 150, action: 'CREDIT', expired: false, orderId },
        { amount: 25, action: 'CREDIT', expired: false, orderId: undefined },
      ],
    );
    assert.match(records[0].creditId, /^CR-\d{10}$/);

    await eventually(() => mails.length === 2);
    assert.deepEqual(mails.map(({ to, subject }) => ({ to, subject })), [
      { to: shopper.user.email, subject: 'Your Store Credit is Here! - Pageaters' },
      { to: shopper.user.email, subject: 'Your Store Credit is Here! - Pageaters' },
    ]);
    assert.match(mails[0].html, /150/);
  });

  test('refuses an unknown or inactive user', async () => {
    assertBody(await issue({ userId: String(new mongoose.Types.ObjectId()), credit: 10 }), 400, badRequest('USER_NOT_FOUND'));
    await mongoose.model('user').updateOne({ _id: shopper.user._id }, { status: 'BLOCKED' });
    assertBody(await issue({ userId: String(shopper.user._id), credit: 10 }), 400, badRequest('USER_NOT_FOUND'));
    assert.equal(await mongoose.model('store_credit_transactions').countDocuments(), 0);
  });

  test('legacy: no validator, so a negative credit lowers the balance', async () => {
    assertBody(await issue({ userId: String(shopper.user._id), credit: -40 }), 201, created('STORE_CREDIT_SUCCESS'));
    assert.equal(await balanceOf(shopper.user), -40);
    assert.equal((await transactionsOf(shopper.user))[0].amount, -40);
  });

  test('legacy: a malformed user id answers 500', async () => {
    assertBody(await issue({ userId: 'not-an-id', credit: 10 }), 500, serverError);
  });
});

describe('GET /store-credit (balance)', () => {
  test("answers the caller's balance only", async () => {
    await issue({ userId: String(shopper.user._id), credit: 60 });
    assertBody(await api.request('/store-credit', { cookie: shopper.cookie }), 200, ok('STORE_CREDIT_LIST_SUCCESS', { _id: String(shopper.user._id), storeCredit: 60, id: String(shopper.user._id) }));
    assertBody(await api.request('/store-credit', { cookie: admin.cookie }), 200, ok('STORE_CREDIT_LIST_SUCCESS', { _id: String(admin.user._id), storeCredit: 0, id: String(admin.user._id) }));
  });
});

describe('GET /store-credit/history', () => {
  test('pages the caller’s transactions newest first', async () => {
    const other = await createUser();
    for (const credit of [10, 20, 30]) await issue({ userId: String(shopper.user._id), credit });
    await issue({ userId: String(other.user._id), credit: 99 });

    const records = asJson((await transactionsOf(shopper.user)).reverse());
    const res = await api.request('/store-credit/history?page=1&limit=2', { cookie: shopper.cookie });
    assertBody(
      res,
      200,
      ok('STORE_CREDIT_LIST_SUCCESS', paged(records.slice(0, 2), { totalDocs: 3, limit: 2, totalPages: 2, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: true, prevPage: null, nextPage: 2 })),
    );
  });

  test('legacy: without page/limit answers no documents (limit 0)', async () => {
    await issue({ userId: String(shopper.user._id), credit: 10 });
    assertBody(
      await api.request('/store-credit/history', { cookie: shopper.cookie }),
      200,
      ok('STORE_CREDIT_LIST_SUCCESS', paged([], { totalDocs: 1, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })),
    );
  });
});
