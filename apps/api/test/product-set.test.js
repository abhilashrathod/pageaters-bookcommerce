const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, catalogState, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
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
  test('the admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/product-sets/${storeIds.setOne}`],
      ['POST', '/product-sets', { title: 'Test New' }],
      ['PUT', `/product-sets/${storeIds.setOne}`, { title: 'Test New' }],
      ['DELETE', `/product-sets/${storeIds.setOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /product-sets', () => {
  test('is public, at most 50 a page for anyone but an admin', async () => {
    const res = await api.request('/product-sets?page=1&limit=50');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalDocs, 2);
    assert.equal((await api.request('/product-sets?page=1&limit=51', { cookie: shopper.cookie })).status, 400);
    assert.equal((await api.request('/product-sets?page=1&limit=51', { cookie: admin.cookie })).status, 200);
  });

  test('pages active sets, optionally by categories (comma list or array)', async () => {
    const all = asJson(await ProductSet().find({ isActive: true }).sort({ createdAt: -1, _id: -1 }));
    const page = (docs) => paged(docs, { totalDocs: docs.length, limit: 10, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null });
    assertBody(await api.request('/product-sets?page=1&limit=10', { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(all)));
    const fiction = all.filter((set) => set._id === String(storeIds.setOne));
    const other = String(new mongoose.Types.ObjectId());
    assertBody(await api.request(`/product-sets?page=1&limit=10&categories=${ids.categoryFiction},${other}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(fiction)));
    assertBody(await api.request(`/product-sets?page=1&limit=10&categories[]=${ids.categoryFiction}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page(fiction)));
  });

  test('without page/limit answers page 1 of 10, newest first (the legacy answered no documents)', async () => {
    const res = await api.request('/product-sets', { cookie: admin.cookie });
    assert.deepEqual(res.body.data.docs.map((set) => set._id), asJson(await ProductSet().find({ isActive: true }).sort({ createdAt: -1, _id: -1 })).map((set) => set._id));
    assert.deepEqual([res.body.data.page, res.body.data.limit, res.body.data.totalDocs], [1, 10, 2]);
  });

  test('an empty categories filter is no filter (the admin deal form with no category selected)', async () => {
    const all = asJson(await ProductSet().find({ isActive: true }).sort({ createdAt: -1, _id: -1 }));
    const page = paged(all, { totalDocs: all.length, limit: 10, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null });
    assertBody(await api.request('/product-sets?categories=', { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', page));
  });

  test('a bad page or limit answers INVALID_PAGING, as on every other list', async () => {
    for (const query of ['limit=5000', 'limit=0', 'page=0', 'page=abc']) {
      assertBody(await api.request(`/product-sets?${query}`, { cookie: admin.cookie }), 400, badRequest('INVALID_PAGING'));
    }
  });

  test('refuses a categories filter that is not ids (7a audit)', async () => {
    for (const query of ['categories=nope', `categories=${ids.categoryFiction},nope`, `categories[]=${ids.categoryFiction}&categories[]=nope`, 'categories[$ne]=x']) {
      assertBody(await api.request(`/product-sets?${query}`, { cookie: admin.cookie }), 400, envelopes.badRequestObject('INVALID_ID'));
    }
  });
});

describe('detail', () => {
  test('public detail by setId, ObjectId or slug answers the books in priority order', async () => {
    const set = await populatedSet(storeIds.setOne);
    const expected = asJson({ ...set, products: byPriority(set.products).map((item) => item.product) });
    assertBody(await api.request('/product-sets/unique/SET-test-one'), 200, ok('PRODUCT_SET_LIST_SUCCESS', expected));
    assertBody(await api.request('/product-sets/slug/test-set-one'), 200, ok('PRODUCT_SET_LIST_SUCCESS', expected));
    assertBody(await api.request(`/product-sets/unique/${storeIds.setOne}`), 200, ok('PRODUCT_SET_LIST_SUCCESS', expected));
    assert.deepEqual(expected.products.map((p) => p.bookId), ['test-book-one', 'test-book-two']);
  });

  test('admin detail by id keeps the priority wrappers', async () => {
    const set = await populatedSet(storeIds.setOne);
    assertBody(await api.request(`/product-sets/${storeIds.setOne}`, { cookie: admin.cookie }), 200, ok('PRODUCT_SET_LIST_SUCCESS', asJson({ ...set, products: byPriority(set.products) })));
  });

  test('an inactive or unknown set is not found', async () => {
    assertBody(await api.request('/product-sets/unique/SET-test-inactive'), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
    assertBody(await api.request(`/product-sets/unique/${storeIds.setInactive}`), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
    assertBody(await api.request('/product-sets/slug/test-set-inactive'), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
    assertBody(await api.request(`/product-sets/${storeIds.setInactive}`, { cookie: admin.cookie }), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
  });
});

describe('product-set reference checks', () => {
  test('refuses a reference that is not an id (list or single) on create and update, before writing anything', async () => {
    const before = await catalogState();
    for (const [body, code] of [
      [{ title: 'Test Set Bad', categories: String(ids.categoryFiction) }, 'INVALID_REQUEST'],
      [{ title: 'Test Set Bad', products: [{ product: 'nope', priority: 1 }] }, 'INVALID_ID'],
      [{ title: 'Test Set Bad', products: [{ product: { _id: 'nope', title: 'Test Book One' }, priority: 1 }] }, 'INVALID_ID'],
      [{ title: 'Test Set Bad', products: [String(ids.bookOne)] }, 'INVALID_REQUEST'],
      [{ title: 'Test Set Bad', products: null }, 'INVALID_REQUEST'],
    ]) {
      for (const [method, path] of [
        ['POST', '/product-sets'],
        ['PUT', `/product-sets/${storeIds.setOne}`],
      ]) {
        const res = await api.request(path, { method, body, cookie: admin.cookie });
        assertBody(res, 400, envelopes.badRequestObject(code));
      }
    }
    assert.deepEqual(await catalogState(), before);
  });
});

describe('admin writes', () => {
  test('the legacy admin posts each product as the populated book: accepted, and only its _id is stored', async () => {
    const asAdminSends = async (bookIds) =>
      (await Promise.all(bookIds.map((id) => mongoose.model('storeBook').findById(id).populate({ path: 'author', select: 'name' }))))
        .map((book, index) => ({ product: asJson(book), priority: index + 1 }));
    const storedProducts = async (id) => (await ProductSet().findById(id).lean()).products.map(({ product, priority }) => ({ product, priority }));

    const created = await api.request('/product-sets', { method: 'POST', body: { title: 'Test Set Legacy', description: 'Fictional.', products: await asAdminSends([ids.bookOne, ids.bookTwo]), categories: [] }, cookie: admin.cookie });
    assert.equal(created.status, 200);
    const set = await ProductSet().findOne({ title: 'Test Set Legacy' });
    assert.ok((await storedProducts(set._id)).every((item) => item.product instanceof mongoose.Types.ObjectId));
    assert.deepEqual(await storedProducts(set._id), [
      { product: new mongoose.Types.ObjectId(String(ids.bookOne)), priority: 1 },
      { product: new mongoose.Types.ObjectId(String(ids.bookTwo)), priority: 2 },
    ]);
    // Nothing but the entry's own fields (Mongoose's _id, product, priority) is stored.
    assert.deepEqual(Object.keys((await ProductSet().findById(set._id).lean()).products[0]).sort(), ['_id', 'priority', 'product']);

    const updated = await api.request(`/product-sets/${set._id}`, { method: 'PUT', body: { title: 'Test Set Legacy', description: 'Fictional.', products: await asAdminSends([ids.bookTwo]), categories: [] }, cookie: admin.cookie });
    assertBody(updated, 200, ok('PRODUCT_SET_UPDATE_SUCCESS', asJson(await ProductSet().findById(set._id))));
    assert.deepEqual(await storedProducts(set._id), [{ product: new mongoose.Types.ObjectId(String(ids.bookTwo)), priority: 1 }]);
  });

  test('POST creates a set with a slug from its title', async () => {
    const body = { title: 'Test Set New', description: 'Fictional.', products: [{ priority: 1, product: String(ids.bookOne) }], categories: [] };
    const res = await api.request('/product-sets', { method: 'POST', body, cookie: admin.cookie });
    const set = await ProductSet().findOne({ title: 'Test Set New' });
    assertBody(res, 200, ok('PRODUCT_SET_CREATE_SUCCESS', asCreated(set)));
    assert.match(set.setId, /^SET-\d{10}$/);
    assert.match(set.slug, /^test-set-new-[A-Za-z0-9]{6}$/);
  });

  test('PUT never changes the slug: a renamed set keeps its links', async () => {
    const same = await api.request(`/product-sets/${storeIds.setOne}`, { method: 'PUT', body: { title: 'Test Set One', description: 'Changed.' }, cookie: admin.cookie });
    assertBody(same, 200, ok('PRODUCT_SET_UPDATE_SUCCESS', asJson(await ProductSet().findById(storeIds.setOne))));
    assert.equal((await ProductSet().findById(storeIds.setOne)).slug, 'test-set-one');

    const renamed = await api.request(`/product-sets/${storeIds.setOne}`, { method: 'PUT', body: { title: 'Test Set Renamed' }, cookie: admin.cookie });
    assertBody(renamed, 200, ok('PRODUCT_SET_UPDATE_SUCCESS', asJson(await ProductSet().findById(storeIds.setOne))));
    const set = await ProductSet().findById(storeIds.setOne);
    assert.equal(set.title, 'Test Set Renamed');
    assert.equal(set.slug, 'test-set-one');
    // A field left out keeps its value (Mongoose drops undefined keys from `$set`; nothing is written as null).
    assert.equal(set.description, 'Changed.');
    assert.equal(set.products.length, 2);
    const detail = await api.request('/product-sets/slug/test-set-one');
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.title, 'Test Set Renamed');

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
