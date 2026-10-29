const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/collections over HTTP: public list, detail and search; admin CRUD with the two-way related-collection
// links. Written against the legacy controller before the service refactor.

const { ok, okString, badRequest, serverError } = envelopes;

const Collection = () => mongoose.model('collection');
const Book = () => mongoose.model('storeBook');

const LIST_POPULATE = {
  path: 'books',
  select: 'title bookId ISBN author inventory poster price weight popularity availability newRelease preOrder editorsPick currentDiscount bestSeller',
  populate: [
    { path: 'author', select: 'name intro avatar' },
    { path: 'categories', select: '_id categoryId title' },
  ],
};
const DETAIL_POPULATE = [
  { path: 'books', select: 'bookId title ISBN author inventory poster price popularity availability newRelease preOrder editorsPick currentDiscount bestSeller' },
  { path: 'relatedCategories', select: 'categoryId _id title numberOfBooks thumbnail' },
  { path: 'featuredAuthors', select: 'name avatar books authorId' },
  { path: 'relatedCollections', select: 'collectionId title tags poster books', populate: { path: 'books', select: 'title poster' } },
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
      ['GET', `/collections/${storeIds.collectionOne}`],
      ['POST', '/collections', { title: 'Test New', books: [], relatedCollections: [] }],
      ['PUT', `/collections/${storeIds.collectionOne}`, { title: 'Test New', books: [], relatedCollections: [] }],
      ['DELETE', `/collections/${storeIds.collectionOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /collections', () => {
  test('pages live collections with their books populated, sorted', async () => {
    const docs = asJson(await Collection().find({ isDeleted: false }).select('title collectionId tags poster priority popularity books').populate(LIST_POPULATE).sort({ priority: -1 }));
    assertBody(await api.request('/collections?page=1&limit=10&sortBy=priority&sortOrder=desc'), 200, ok('COLLECTION_LIST_SUCCESS', firstPage(docs, 2)));
  });

  test('filters by related category', async () => {
    const res = await api.request(`/collections?page=1&limit=10&category=${ids.categoryFiction}`);
    assert.deepEqual(res.body.data.docs.map((c) => c._id), [String(storeIds.collectionOne)]);
  });

  test('refuses a sort field outside the allowlist; legacy: no page/limit answers no documents', async () => {
    assertBody(await api.request('/collections?page=1&limit=10&sortBy=price'), 400, badRequest('SORTING_NOT_ALLOWED'));
    assertBody(await api.request('/collections'), 200, ok('COLLECTION_LIST_SUCCESS', paged([], { totalDocs: 2, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
  });
});

describe('detail and search', () => {
  test('public detail by collectionId and admin detail by id are populated', async () => {
    const expected = asJson(await Collection().findById(storeIds.collectionOne).populate(DETAIL_POPULATE));
    assertBody(await api.request('/collections/unique/CL-test-one'), 200, ok('COLLECTION_LIST_SUCCESS', expected));
    assertBody(await api.request(`/collections/${storeIds.collectionOne}`, { cookie: admin.cookie }), 200, ok('COLLECTION_LIST_SUCCESS', expected));
    assertBody(await api.request('/collections/unique/CL-test-deleted'), 400, badRequest('COLLECTION_NOT_EXIST'));
    assertBody(await api.request(`/collections/${storeIds.collectionDeleted}`, { cookie: admin.cookie }), 400, badRequest('COLLECTION_NOT_EXIST'));
  });

  test('GET /collections/search/:q finds live collections by title, tag or description', async () => {
    await api.reindex();
    assertBody(await api.request('/collections/search/shelf'), 200, ok('COLLECTION_SEARCH_SUCCESS', asJson(await Collection().find({ _id: storeIds.collectionOne }))));
    const res = await api.request('/collections/search/coll');
    assert.deepEqual(res.body.data.map((c) => c._id).sort(), [String(storeIds.collectionOne), String(storeIds.collectionTwo)]);
  });
});

describe('POST /collections', () => {
  test('creates the collection and links it from its books and related collections', async () => {
    const body = { title: 'Test Collection New', tags: ['x'], books: [String(ids.bookTwo)], relatedCollections: [String(storeIds.collectionOne)] };
    const res = await api.request('/collections', { method: 'POST', body, cookie: admin.cookie });
    const collection = await Collection().findOne({ title: 'Test Collection New' });
    assertBody(res, 200, ok('COLLECTION_CREATE_SUCCESS', asCreated(collection)));
    assert.match(collection.collectionId, /^CL-\d{10}$/);
    assert.deepEqual((await Book().findById(ids.bookTwo)).relatedCollections.map(String), [String(collection._id)]);
    assert.deepEqual((await Collection().findById(storeIds.collectionOne)).relatedCollections.map(String), [String(storeIds.collectionTwo), String(collection._id)]);
  });

  test('legacy: without books or relatedCollections it answers 500 after creating', async () => {
    assertBody(await api.request('/collections', { method: 'POST', body: { title: 'Test Collection Bare', books: [] }, cookie: admin.cookie }), 500, serverError);
    assert.equal(await Collection().countDocuments({ title: 'Test Collection Bare' }), 1);
  });
});

describe('PUT /collections/:id', () => {
  test('updates the collection and adds the missing links once', async () => {
    const body = { title: 'Test Collection Two B', books: [String(ids.bookOne)], relatedCollections: [String(storeIds.collectionOne)] };
    for (let i = 0; i < 2; i += 1) {
      const res = await api.request(`/collections/${storeIds.collectionTwo}`, { method: 'PUT', body, cookie: admin.cookie });
      assertBody(res, 200, ok('COLLECTION_UPDATE_SUCCESS', asJson(await Collection().findById(storeIds.collectionTwo))));
    }
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedCollections.map(String), [String(storeIds.collectionTwo)]);
    assert.deepEqual((await Collection().findById(storeIds.collectionOne)).relatedCollections.map(String), [String(storeIds.collectionTwo)]);
  });

  test('refuses a deleted collection', async () => {
    assertBody(await api.request(`/collections/${storeIds.collectionDeleted}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('COLLECTION_NOT_EXIST'));
  });
});

describe('DELETE /collections/:id', () => {
  test('soft-deletes a live collection', async () => {
    assertBody(await api.request(`/collections/${storeIds.collectionOne}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('COLLECTION_DELETE_SUCCESS'));
    assert.equal((await Collection().findById(storeIds.collectionOne)).isDeleted, true);
    assertBody(await api.request(`/collections/${storeIds.collectionOne}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('COLLECTION_NOT_EXIST'));
  });
});
