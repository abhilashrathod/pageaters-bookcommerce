const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asJson, assertBody, assertGuarded, captureLogs, createUser, envelopes, ids, loadCatalog, messagesAt, sentEmails, startTestApp } = require('./helpers');

// /api/v1/stock-alerts over HTTP: shoppers subscribe/unsubscribe to back-in-stock alerts, admins list them and
// send the alerts. Written against the legacy controller before the service refactor.

const { ok, okString, badRequest } = envelopes;
const { HOST } = require('../src/appConfig');

const StockAlert = () => mongoose.model('stock_alert');

let api;
let admin;
let shopper;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

const subscribe = (product, cookie = shopper.cookie) => api.request('/stock-alerts', { method: 'POST', body: { product: String(product) }, cookie });
const activeAlerts = (user) => StockAlert().find({ user: user._id, isDeleted: false });

describe('auth', () => {
  test('shopper routes need a session', async () => {
    await assertGuarded(api, ['GET', `/stock-alerts/${ids.bookOne}`]);
    await assertGuarded(api, ['POST', '/stock-alerts', { product: String(ids.bookOne) }]);
    await assertGuarded(api, ['DELETE', `/stock-alerts/${ids.bookOne}`]);
  });

  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', '/stock-alerts'],
      ['GET', `/stock-alerts/${ids.bookOne}/users`],
      ['POST', `/stock-alerts/${ids.bookOne}/users`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('subscribe, check and unsubscribe', () => {
  test('subscribes once and answers the new alert', async () => {
    const res = await subscribe(ids.bookOne);
    const [alert] = await activeAlerts(shopper.user);
    // A created document serialises its fields before `_id`.
    const { _id, createdAt, updatedAt, __v, ...fields } = asJson(alert);
    assertBody(res, 200, ok('STOCK_ALERT_CREATE_SUCCESS', { ...fields, _id, createdAt, updatedAt, __v }));
    assert.equal(String(alert.product), String(ids.bookOne));
    assert.equal(alert.deletedAt, '');

    assertBody(await subscribe(ids.bookOne), 400, badRequest('STOCK_ALERT_EXISTS'));
    assert.equal((await activeAlerts(shopper.user)).length, 1);
  });

  test('legacy: subscribing does not check that the product exists', async () => {
    const unknown = new mongoose.Types.ObjectId();
    assert.equal((await subscribe(unknown)).status, 200);
    assert.equal((await activeAlerts(shopper.user)).length, 1);
  });

  test('a malformed product id answers 400 INVALID_ID (was: 500)', async () => {
    assertBody(await subscribe('not-an-id'), 400, badRequest('INVALID_ID'));
    assertBody(await api.request('/stock-alerts/not-an-id', { cookie: shopper.cookie }), 400, badRequest('INVALID_ID'));
  });

  test('checks the subscription', async () => {
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}`, { cookie: shopper.cookie }), 200, ok('STOCK_ALERT_CHECK_NOT_EXIST', false));
    await subscribe(ids.bookOne);
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}`, { cookie: shopper.cookie }), 200, ok('STOCK_ALERT_EXISTS', true));
    const other = await createUser();
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}`, { cookie: other.cookie }), 200, ok('STOCK_ALERT_CHECK_NOT_EXIST', false));
  });

  test('unsubscribes by soft delete, then can subscribe again', async () => {
    await subscribe(ids.bookOne);
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}`, { method: 'DELETE', cookie: shopper.cookie }), 200, okString('STOCK_ALERT_DELETE_SUCCESS'));
    const [deleted] = await StockAlert().find({ user: shopper.user._id });
    assert.equal(deleted.isDeleted, true);
    assert.ok(deleted.deletedAt);
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}`, { cookie: shopper.cookie }), 200, ok('STOCK_ALERT_CHECK_NOT_EXIST', false));

    assert.equal((await subscribe(ids.bookOne)).status, 200);
    assert.equal(await StockAlert().countDocuments({ user: shopper.user._id }), 2);
  });

  test('unsubscribing a missing or closed alert answers STOCK_ALERT_NOT_EXIST (was: STOCK_ALERT_EXISTS)', async () => {
    const unsubscribe = () => api.request(`/stock-alerts/${ids.bookOne}`, { method: 'DELETE', cookie: shopper.cookie });
    assertBody(await unsubscribe(), 400, badRequest('STOCK_ALERT_NOT_EXIST'));
    await subscribe(ids.bookOne);
    assert.equal((await unsubscribe()).status, 200);
    assertBody(await unsubscribe(), 400, badRequest('STOCK_ALERT_NOT_EXIST'));
  });
});

describe('admin', () => {
  test('GET /stock-alerts groups active alerts by product', async () => {
    const other = await createUser();
    await subscribe(ids.bookOne);
    await subscribe(ids.bookOne, other.cookie);
    await subscribe(ids.bookTwo);
    await api.request(`/stock-alerts/${ids.bookTwo}`, { method: 'DELETE', cookie: shopper.cookie });

    const res = await api.request('/stock-alerts?page=1&limit=10', { cookie: admin.cookie });
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['statusCode', 'status', 'message', 'data']);
    assert.equal(res.body.status, 'STOCK_ALERT_LIST_SUCCESS');
    const { docs, ...pageInfo } = res.body.data;
    assert.deepEqual(docs, [{ _id: String(ids.bookOne), totalProducts: 2 }]);
    assert.equal(
      JSON.stringify(pageInfo),
      // legacy: totalDocs counts the matched alerts, not the product groups.
      JSON.stringify({ totalDocs: 2, limit: 10, page: 1, totalPages: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null }),
    );
  });

  test('GET /stock-alerts/:product/users lists subscribers with user and product details', async () => {
    await subscribe(ids.bookOne);
    const [alert] = await StockAlert()
      .find({ product: ids.bookOne })
      .populate([
        { path: 'user', select: 'fullName email contactNo' },
        { path: 'product', select: 'title bookId poster price currentDiscount' },
      ]);
    assertBody(await api.request(`/stock-alerts/${ids.bookOne}/users`, { cookie: admin.cookie }), 200, ok('STOCK_ALERT_LIST_SUCCESS', [asJson(alert)]));
    assert.equal(asJson(alert).user.email, shopper.user.email);
  });

  test('POST /stock-alerts/:product/users mails every subscriber and closes the alerts (was: the e-mail never rendered)', async (t) => {
    const logs = captureLogs(t);
    const other = await createUser();
    await subscribe(ids.bookOne);
    await subscribe(ids.bookOne, other.cookie);
    await subscribe(ids.bookTwo);

    assertBody(
      await api.request(`/stock-alerts/${ids.bookOne}/users`, { method: 'POST', cookie: admin.cookie }),
      200,
      ok('STOCK_ALERT_LIST_SUCCESS', { success: true, subscribers: 2 }),
    );
    assert.equal(await StockAlert().countDocuments({ product: ids.bookOne, isDeleted: false }), 0);
    assert.equal(await StockAlert().countDocuments({ product: ids.bookTwo, isDeleted: false }), 1);

    const book = await mongoose.model('storeBook').findById(ids.bookOne);
    const mails = sentEmails();
    assert.deepEqual(mails.map((mail) => mail.to).sort(), [shopper.user.email, other.user.email].sort());
    for (const mail of mails) {
      assert.equal(mail.subject, `Back in stock: ${book.title}`);
      assert.ok(mail.html.includes(`href="${HOST}/books/${encodeURIComponent(book.bookId)}"`));
      assert.ok(mail.html.includes(`src="${book.poster}"`));
      assert.ok(mail.html.includes(`INR ${book.price}`));
    }
    assert.ok(mails.some((mail) => mail.html.includes(`Hello ${shopper.user.fullName},`)));
    assert.equal(await mongoose.model('log_email').countDocuments({ emailModule: 'STOCK_ALERT' }), 2);
    assert.deepEqual(messagesAt(logs), []);
  });

  test('the e-mail escapes the subscriber name and leaves out a poster without a public URL', async () => {
    await mongoose.model('user').updateOne({ _id: shopper.user._id }, { fullName: '<b>Test</b>' });
    await mongoose.model('storeBook').updateOne({ _id: ids.bookOne }, { poster: 'legacy/key.png' });
    await subscribe(ids.bookOne);
    await api.request(`/stock-alerts/${ids.bookOne}/users`, { method: 'POST', cookie: admin.cookie });
    const [{ html }] = sentEmails();
    assert.ok(html.includes('Hello &lt;b&gt;Test&lt;/b&gt;,'));
    assert.equal(html.includes('<img'), false);
  });

  test('control characters in the title never reach the subject as header lines', async () => {
    await mongoose.model('storeBook').updateOne({ _id: ids.bookOne }, { title: 'Test\r\nBcc: someone@example.com\tBook' });
    await subscribe(ids.bookOne);
    await api.request(`/stock-alerts/${ids.bookOne}/users`, { method: 'POST', cookie: admin.cookie });
    assert.equal(sentEmails()[0].subject, 'Back in stock: Test Bcc: someone@example.com Book');
  });

  test('closes each alert right after its send, so a failure part-way leaves the handled ones closed', async (t) => {
    const other = await createUser();
    await subscribe(ids.bookOne);
    await subscribe(ids.bookOne, other.cookie);
    const Model = StockAlert();
    const updateOne = Model.updateOne.bind(Model);
    let closes = 0;
    t.mock.method(Model, 'updateOne', (...args) => {
      closes += 1;
      if (closes === 2) throw new Error('Test: request died part-way');
      return updateOne(...args);
    });

    const res = await api.request(`/stock-alerts/${ids.bookOne}/users`, { method: 'POST', cookie: admin.cookie });
    assert.equal(res.status, 500);
    assert.equal(closes, 2);
    t.mock.restoreAll();
    assert.equal(await StockAlert().countDocuments({ product: ids.bookOne, isDeleted: true }), 1);
    assert.equal(await StockAlert().countDocuments({ product: ids.bookOne, isDeleted: false }), 1);
  });
});
