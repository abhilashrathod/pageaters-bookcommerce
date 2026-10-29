const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/bundles over HTTP: public list, detail (with computed stock) and search; admin CRUD. Written against the
// legacy controller before the service refactor.

const { ok, okString, badRequest, serverError } = envelopes;

const Bundle = () => mongoose.model('bundle');
const Book = () => mongoose.model('storeBook');

const LIST_FIELDS = 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice';
const DETAIL_POPULATE = [
  { path: 'bundledBooks', select: 'title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount preOrder bestSeller' },
  { path: 'relatedCollections', select: 'collectionId title tags poster books', populate: { path: 'books', select: 'title poster' } },
  { path: 'relatedBundles', select: LIST_FIELDS },
  { path: 'categories', select: 'title poster' },
];

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

const firstPage = (docs, totalDocs, limit = 10) =>
  paged(docs, { totalDocs, limit, totalPages: Math.ceil(totalDocs / limit) || 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: totalDocs > limit, prevPage: null, nextPage: totalDocs > limit ? 2 : null });

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/bundles/${storeIds.bundleOne}`],
      ['POST', '/bundles', { title: 'Test New', bundledBooks: [] }],
      ['PUT', `/bundles/${storeIds.bundleOne}`, { title: 'Test New', bundledBooks: [] }],
      ['DELETE', `/bundles/${storeIds.bundleOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /bundles', () => {
  test('pages live bundles with the list projection, sorted', async () => {
    for (const [query, sort] of [
      ['sortBy=price&sortOrder=asc', { price: 1 }],
      ['sortBy=popularity&sortOrder=desc', { popularity: -1 }],
    ]) {
      const docs = asJson(await Bundle().find({ isDeleted: false }).select(LIST_FIELDS).sort(sort));
      assertBody(await api.request(`/bundles?page=1&limit=10&${query}`), 200, ok('BUNDLE_LIST_SUCCESS', firstPage(docs, 2)));
    }
  });

  test('filters by category', async () => {
    const docs = asJson(await Bundle().find({ _id: storeIds.bundleOne }).select(LIST_FIELDS));
    assertBody(await api.request(`/bundles?page=1&limit=10&category=${ids.categoryFiction}`), 200, ok('BUNDLE_LIST_SUCCESS', firstPage(docs, 1)));
  });

  test('refuses a sort field outside the allowlist; legacy: no page/limit answers no documents', async () => {
    assertBody(await api.request('/bundles?page=1&limit=10&sortBy=weight'), 400, badRequest('SORTING_NOT_ALLOWED'));
    assertBody(await api.request('/bundles'), 200, ok('BUNDLE_LIST_SUCCESS', paged([], { totalDocs: 2, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
  });
});

describe('detail and search', () => {
  test('public detail by bundleId adds inventory 1 when every book is in stock', async () => {
    const bundle = (await Bundle().findById(storeIds.bundleOne).populate(DETAIL_POPULATE)).toObject();
    assertBody(await api.request('/bundles/unique/BL-test-one'), 200, ok('BUNDLE_LIST_SUCCESS', asJson({ ...bundle, inventory: 1 })));
  });

  test('public detail answers inventory 0 when a book is out of stock', async () => {
    await Book().updateOne({ _id: ids.bookTwo }, { inventory: 0 });
    const res = await api.request('/bundles/unique/BL-test-one');
    assert.equal(res.body.data.inventory, 0);
    assertBody(await api.request('/bundles/unique/BL-test-deleted'), 400, badRequest('BUNDLE_NOT_EXIST'));
  });

  test('admin detail by id is populated without the computed inventory', async () => {
    const bundle = await Bundle().findById(storeIds.bundleOne).populate(DETAIL_POPULATE);
    assertBody(await api.request(`/bundles/${storeIds.bundleOne}`, { cookie: admin.cookie }), 200, ok('BUNDLE_LIST_SUCCESS', asJson(bundle)));
    assertBody(await api.request(`/bundles/${storeIds.bundleDeleted}`, { cookie: admin.cookie }), 400, badRequest('BUNDLE_NOT_EXIST'));
  });

  test('GET /bundles/search/:q finds live bundles by tag through the lunr index', async () => {
    await api.reindex();
    assertBody(await api.request('/bundles/search/pair'), 200, ok('BUNDLE_SEARCH_SUCCESS', asJson(await Bundle().find({ _id: storeIds.bundleOne }))));
    assertBody(await api.request('/bundles/search/solo'), 200, ok('BUNDLE_SEARCH_SUCCESS', asJson(await Bundle().find({ _id: storeIds.bundleTwo }))));
    assertBody(await api.request('/bundles/search/deleted'), 200, ok('BUNDLE_SEARCH_SUCCESS', []));
  });
});

describe('POST /bundles', () => {
  test('creates the bundle and links it from its books', async () => {
    const body = { title: 'Test Bundle New', tags: ['x'], bundledBooks: [String(ids.bookOne)], price: 100, weight: 50 };
    const res = await api.request('/bundles', { method: 'POST', body, cookie: admin.cookie });
    const bundle = await Bundle().findOne({ title: 'Test Bundle New' });
    assertBody(res, 200, ok('BUNDLE_CREATE_SUCCESS', asCreated(bundle)));
    assert.match(bundle.bundleId, /^BL-\d{10}$/);
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBundles.map(String), [String(bundle._id)]);
  });

  test('legacy: without bundledBooks it answers 500 after creating the bundle', async () => {
    assertBody(await api.request('/bundles', { method: 'POST', body: { title: 'Test Bundle Bare' }, cookie: admin.cookie }), 500, serverError);
    assert.equal(await Bundle().countDocuments({ title: 'Test Bundle Bare' }), 1);
  });
});

describe('PUT /bundles/:id', () => {
  test('updates the bundle and links it from new books once', async () => {
    await Book().updateOne({ _id: ids.bookOne }, { relatedBundles: [storeIds.bundleTwo] });
    const body = { title: 'Test Bundle Two B', bundledBooks: [String(ids.bookOne)] };
    for (let i = 0; i < 2; i += 1) {
      const res = await api.request(`/bundles/${storeIds.bundleTwo}`, { method: 'PUT', body, cookie: admin.cookie });
      assertBody(res, 200, ok('BUNDLE_UPDATE_SUCCESS', asJson(await Bundle().findById(storeIds.bundleTwo))));
    }
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBundles.map(String), [String(storeIds.bundleTwo)]);
  });

  test('refuses an unknown or deleted bundle', async () => {
    assertBody(await api.request(`/bundles/${storeIds.bundleDeleted}`, { method: 'PUT', body: { bundledBooks: [] }, cookie: admin.cookie }), 400, badRequest('BUNDLE_NOT_EXIST'));
  });

  test('legacy: without bundledBooks it answers 500 after updating', async () => {
    assertBody(await api.request(`/bundles/${storeIds.bundleTwo}`, { method: 'PUT', body: { title: 'Test Bundle Two C' }, cookie: admin.cookie }), 500, serverError);
    assert.equal((await Bundle().findById(storeIds.bundleTwo)).title, 'Test Bundle Two C');
  });
});

describe('DELETE /bundles/:id', () => {
  test('soft-deletes a live bundle', async () => {
    assertBody(await api.request(`/bundles/${storeIds.bundleOne}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('BUNDLE_DELETE_SUCCESS'));
    assert.equal((await Bundle().findById(storeIds.bundleOne)).isDeleted, true);
    assertBody(await api.request(`/bundles/${storeIds.bundleOne}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('BUNDLE_NOT_EXIST'));
  });
});
