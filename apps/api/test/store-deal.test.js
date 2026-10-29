const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, eventually, ids, loadCatalog, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/deals over HTTP: public list and detail (product sets with their books' prices and discounts); admin
// CRUD. Written against the legacy controller (storeDeal.contoller.js) before the service refactor.

const { ok, okString, badRequest, serverError } = envelopes;

const Deal = () => mongoose.model('store_deals');

const LIST_FIELDS = 'ctaLink ctaText dealId poster title _id';

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
  await loadStore();
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/deals/${storeIds.dealOne}`],
      ['POST', '/deals', { title: 'Test New' }],
      ['PUT', `/deals/${storeIds.dealOne}`, { title: 'Test New' }],
      ['DELETE', `/deals/${storeIds.dealOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /deals', () => {
  test('legacy: lists active deals sorted, but with page, offset and pagingCounter null', async () => {
    const docs = asJson(await Deal().find({ isActive: true }).select(LIST_FIELDS).sort({ priority: 1 }));
    const res = await api.request('/deals?page=1&limit=10&sortBy=priority&sortOrder=asc');
    assertBody(
      res,
      200,
      ok('STORE_DEAL_LIST_SUCCESS', {
        docs,
        totalDocs: 2,
        offset: null,
        limit: 10,
        totalPages: 1,
        page: null,
        pagingCounter: null,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      }),
    );
  });

  test('filters by category and honours an explicit offset', async () => {
    const res = await api.request(`/deals?page=1&limit=10&category=${ids.categoryFiction}`);
    assert.deepEqual(res.body.data.docs.map((d) => d._id), [String(storeIds.dealOne)]);

    const offsetRes = await api.request('/deals?limit=1&offset=1&sortBy=priority&sortOrder=asc');
    assert.deepEqual(offsetRes.body.data.docs.map((d) => d._id), [String(storeIds.dealOne)]);
  });

  test('refuses a sort field outside the allowlist; legacy: no limit answers no documents', async () => {
    assertBody(await api.request('/deals?sortBy=ctaText'), 400, badRequest('SORTING_NOT_ALLOWED'));
    const res = await api.request('/deals');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.docs, []);
    assert.equal(res.body.data.limit, 0);
  });
});

describe('detail', () => {
  test('public detail by dealId sorts the sets and their books by priority, with book prices and discounts', async () => {
    const res = await api.request('/deals/unique/DE-test-one');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['statusCode', 'status', 'message', 'data']);
    assert.equal(res.body.status, 'STORE_DEAL_LIST_SUCCESS');
    const deal = res.body.data;
    assert.deepEqual(deal.productSets.map((s) => s.set._id), [String(storeIds.setOne), String(storeIds.setTwo)]);
    assert.deepEqual(deal.productSets[0].set.products.map((p) => [p.priority, p.product.bookId, p.product.price, p.product.currentDiscount]), [
      [1, 'test-book-one', 499, 10],
      [2, 'test-book-two', 499, 10],
    ]);
    assert.deepEqual(Object.keys(deal.productSets[0].set.products[0].product), [
      '_id',
      'bookId',
      'title',
      'author',
      'ISBN',
      'editorsPick',
      'bestSeller',
      'newRelease',
      'preOrder',
      'poster',
      'inventory',
      'currentDiscount',
      'popularity',
      'price',
    ]);
    assert.deepEqual(deal.categories, [{ _id: String(ids.categoryFiction), categoryId: 'test-fiction', title: 'Test Fiction', numberOfBooks: 2, thumbnail: '' }]);
    assertBody(await api.request('/deals/unique/DE-test-inactive'), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });

  test('legacy: admin detail answers with the author message keys', async () => {
    const res = await api.request(`/deals/${storeIds.dealOne}`, { cookie: admin.cookie });
    const publicRes = await api.request('/deals/unique/DE-test-one');
    assertBody(res, 200, ok('AUTHOR_LIST_SUCCESS', publicRes.body.data));
    assertBody(await api.request(`/deals/${storeIds.dealInactive}`, { cookie: admin.cookie }), 400, badRequest('AUTHOR_NOT_EXIST'));
  });

  test('legacy: a deal whose product set is gone answers 500', async () => {
    await mongoose.model('product_sets').deleteOne({ _id: storeIds.setTwo });
    assertBody(await api.request('/deals/unique/DE-test-one'), 500, serverError);
  });
});

describe('admin writes', () => {
  test('POST creates a deal', async () => {
    const body = { title: 'Test Deal New', poster: 'p.png', ctaLink: '/x', ctaText: 'Go', priority: 3, categories: [String(ids.categoryFiction)], productSets: [{ priority: 1, set: String(storeIds.setOne) }] };
    const res = await api.request('/deals', { method: 'POST', body, cookie: admin.cookie });
    const deal = await Deal().findOne({ title: 'Test Deal New' });
    assertBody(res, 200, ok('STORE_DEAL_CREATE_SUCCESS', asCreated(deal)));
    assert.match(deal.dealId, /^DE-\d{10}$/);
  });

  test('PUT updates an active deal', async () => {
    const res = await api.request(`/deals/${storeIds.dealTwo}`, { method: 'PUT', body: { title: 'Test Deal Two B', priority: 7 }, cookie: admin.cookie });
    assertBody(res, 200, ok('STORE_DEAL_UPDATE_SUCCESS', asJson(await Deal().findById(storeIds.dealTwo))));
    assert.equal((await Deal().findById(storeIds.dealTwo)).priority, 7);
    assertBody(await api.request(`/deals/${storeIds.dealInactive}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });

  test('DELETE deactivates an active deal (legacy: the save is not awaited)', async () => {
    assertBody(await api.request(`/deals/${storeIds.dealTwo}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('STORE_DEAL_DELETE_SUCCESS'));
    const deal = await eventually(async () => {
      const found = await Deal().findById(storeIds.dealTwo);
      return found.isActive ? null : found;
    });
    assert.equal(deal.isActive, false);
    assert.ok(deal.deactivatedAt);
    assertBody(await api.request(`/deals/${storeIds.dealTwo}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });
});
