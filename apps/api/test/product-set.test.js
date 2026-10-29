const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/product-sets over HTTP: public detail by setId or slug (books in priority order); admin list and CRUD.
// Written against the legacy controller before the service refactor.

const { ok, okString, badRequest } = envelopes;

const ProductSet = () => mongoose.model('product_sets');

const PRODUCT_SELECT = 'bookId title ISBN author inventory poster price popularity availability editorsPick inventory currentDiscount newRelease preOrder bestSeller';
const POPULATE = [
  { path: 'products.product', select: PRODUCT_SELECT, populate: { path: 'author', select: 'name avatar' } },
  { path: 'categories', select: 'categoryId _id title numberOfBooks thumbnail' },
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

const populatedSet = async (id) => (await ProductSet().findById(id).populate(POPULATE)).toObject();
const byPriority = (products) => [...products].sort((a, b) => a.priority - b.priority);

describe('auth', () => {
  test('the list and admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', '/product-sets'],
      ['GET', `/product-sets/${storeIds.setOne}`],
      ['POST', '/product-sets', { title: 'Test New' }],
      ['PUT', `/product-sets/${storeIds.setOne}`, { title: 'Test New' }],
      ['DELETE', `/product-sets/${storeIds.setOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /product-sets (admin)', () => {
  test('pages active sets, optionally by categories (comma list or array)', async () => {
    const all = asJson(await ProductSet().find({ isActive: true }));
    const page = (docs) => paged(docs, { totalDocs: docs.length, limit: 10, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null });
    assertBody(await api.request('/product-sets?page=1&limit=10', { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(all)));
    const fiction = all.filter((set) => set._id === String(storeIds.setOne));
    const other = String(new mongoose.Types.ObjectId());
    assertBody(await api.request(`/product-sets?page=1&limit=10&categories=${ids.categoryFiction},${other}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(fiction)));
    assertBody(await api.request(`/product-sets?page=1&limit=10&categories[]=${ids.categoryFiction}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(fiction)));
  });

  test('legacy: without page/limit answers no documents', async () => {
    const res = await api.request('/product-sets', { cookie: admin.cookie });
    assert.deepEqual(res.body.data.docs, []);
    assert.equal(res.body.data.totalDocs, 2);
  });
});

describe('detail', () => {
  test('public detail by setId or slug answers the books in priority order', async () => {
    const set = await populatedSet(storeIds.setOne);
    const expected = asJson({ ...set, products: byPriority(set.products).map((item) => item.product) });
    assertBody(await api.request('/product-sets/unique/SET-test-one'), 200, ok('PRODUCT_SET_LIST_SUCCESS', expected));
    assertBody(await api.request('/product-sets/slug/test-set-one'), 200, ok('PRODUCT_SET_LIST_SUCCESS', expected));
    assert.deepEqual(expected.products.map((p) => p.bookId), ['test-book-one', 'test-book-two']);
  });

  test('admin detail by id keeps the priority wrappers', async () => {
    const set = await populatedSet(storeIds.setOne);
    assertBody(await api.request(`/product-sets/${storeIds.setOne}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', asJson({ ...set, products: byPriority(set.products) })));
  });

  test('an inactive or unknown set is not found', async () => {
    assertBody(await api.request('/product-sets/unique/SET-test-inactive'), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
    assertBody(await api.request('/product-sets/slug/test-set-inactive'), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
    assertBody(await api.request(`/product-sets/${storeIds.setInactive}`, { cookie: admin.cookie }), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
  });
});

describe('admin writes', () => {
  test('POST creates a set with a slug from its title', async () => {
    const body = { title: 'Test Set New', description: 'Fictional.', products: [{ priority: 1, product: String(ids.bookOne) }], categories: [] };
    const res = await api.request('/product-sets', { method: 'POST', body, cookie: admin.cookie });
    const set = await ProductSet().findOne({ title: 'Test Set New' });
    assertBody(res, 200, ok('PRODUCT_SET_CREATE_SUCCESS', asCreated(set)));
    assert.match(set.setId, /^SET-\d{10}$/);
    assert.match(set.slug, /^test-set-new-[A-Za-z0-9]{6}$/);
  });

  test('PUT keeps the slug for the same title; legacy: a new title regenerates it', async () => {
    const same = await api.request(`/product-sets/${storeIds.setOne}`, { method: 'PUT', body: { title: 'Test Set One', description: 'Changed.' }, cookie: admin.cookie });
    assertBody(same, 200, ok('PRODUCT_SET_UPDATE_SUCCESS', asJson(await ProductSet().findById(storeIds.setOne))));
    assert.equal((await ProductSet().findById(storeIds.setOne)).slug, 'test-set-one');

    await api.request(`/product-sets/${storeIds.setOne}`, { method: 'PUT', body: { title: 'Test Set Renamed' }, cookie: admin.cookie });
    assert.match((await ProductSet().findById(storeIds.setOne)).slug, /^test-set-renamed-[A-Za-z0-9]{6}$/);
    assertBody(await api.request('/product-sets/slug/test-set-one'), 400, badRequest('PRODUCT_SET_NOT_EXIST'));

    assertBody(await api.request(`/product-sets/${storeIds.setInactive}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
  });

  test('DELETE deactivates an active set', async () => {
    assertBody(await api.request(`/product-sets/${storeIds.setTwo}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('PRODUCT_SET_DELETE_SUCCESS'));
    const set = await ProductSet().findById(storeIds.setTwo);
    assert.equal(set.isActive, false);
    assert.ok(set.deactivatedAt);
    assertBody(await api.request(`/product-sets/${storeIds.setTwo}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
  });
});

describe('legacy: an empty id or slug from the query or body overrides the path param', () => {
  // req.allParams() merges params, query and body, so `?id=` empties the path's id; the handler then answers
  // res.ok() (SUCCESS, data {}) without a lookup.
  test('GET /product-sets/unique/:id?id= answers 200 SUCCESS', async () => {
    assertBody(await api.request('/product-sets/unique/SET-test-one?id='), 200, ok('SUCCESS'));
  });

  test('GET /product-sets/slug/:slug?slug= answers 200 SUCCESS', async () => {
    assertBody(await api.request('/product-sets/slug/test-set-one?slug='), 200, ok('SUCCESS'));
  });

  test('GET /product-sets/:id?id= answers 200 SUCCESS', async () => {
    assertBody(await api.request(`/product-sets/${storeIds.setOne}?id=`, { cookie: admin.cookie }), 200, ok('SUCCESS'));
  });
});
