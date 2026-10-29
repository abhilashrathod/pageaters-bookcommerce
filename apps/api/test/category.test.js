const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');

// /api/v1/categories over HTTP: public list, detail, search and the category's books; admin CRUD. Written against
// the legacy controller before the service refactor.

const { ok, okString, created, badRequest, serverError } = envelopes;

const Category = () => mongoose.model('category');
const Book = () => mongoose.model('storeBook');

const LIST_FIELDS = 'categoryId _id title numberOfBooks thumbnail';
const PRODUCT_FIELDS = 'title bookId ISBN author poster price popularity availability editorsPick inventory currentDiscount inventory newRelease preOrder bestSeller';
const OVERVIEW_FIELDS = 'title bookId ISBN author poster price popularity editorsPick availability currentDiscount inventory newRelease preOrder bestSeller';
const PRODUCT_POPULATE = [
  { path: 'author', select: 'name avatar' },
  { path: 'categories', select: '_id categoryId title' },
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
  await Category().create([
    { _id: new mongoose.Types.ObjectId('1000000000000000000000c2'), categoryId: 'test-poetry', title: 'Test Poetry', priority: 5 },
    { categoryId: 'test-gone', title: 'Test Gone', isDeleted: true },
  ]);
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

const firstPage = (docs, totalDocs, limit = 10) =>
  paged(docs, { totalDocs, limit, totalPages: Math.ceil(totalDocs / limit) || 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: totalDocs > limit, prevPage: null, nextPage: totalDocs > limit ? 2 : null });

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/categories/${ids.categoryFiction}`],
      ['POST', '/categories', { title: 'Test New' }],
      ['PUT', `/categories/${ids.categoryFiction}`, { title: 'Test New' }],
      ['DELETE', `/categories/${ids.categoryFiction}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /categories', () => {
  test('pages live categories; legacy: sortOrder goes through Number(), so "asc" and "desc" both sort ascending', async () => {
    const ascending = asJson(await Category().find({ isDeleted: false }).select(LIST_FIELDS).sort({ title: 1 }));
    for (const sortOrder of ['1', 'asc', 'desc']) {
      assertBody(await api.request(`/categories?page=1&limit=10&sortBy=title&sortOrder=${sortOrder}`), 200, ok('CATEGORY_LIST_SUCCESS', firstPage(ascending, 2)));
    }
    assertBody(await api.request('/categories?page=1&limit=10&sortBy=title&sortOrder=-1'), 200, ok('CATEGORY_LIST_SUCCESS', firstPage([...ascending].reverse(), 2)));
  });

  test('refuses a sort field outside the allowlist', async () => {
    assertBody(await api.request('/categories?page=1&limit=10&sortBy=description'), 400, badRequest('SORTING_NOT_ALLOWED'));
  });

  test('legacy: without page/limit answers no documents', async () => {
    assertBody(await api.request('/categories'), 200, ok('CATEGORY_LIST_SUCCESS', paged([], { totalDocs: 2, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
  });
});

describe('detail and search', () => {
  test('public detail by categoryId, admin detail by id', async () => {
    const fiction = asJson(await Category().findById(ids.categoryFiction));
    assertBody(await api.request('/categories/unique/test-fiction'), 200, ok('CATEGORY_LIST_SUCCESS', fiction));
    assertBody(await api.request('/categories/unique/test-gone'), 400, badRequest('CATEGORY_NOT_EXIST'));
    assertBody(await api.request(`/categories/${ids.categoryFiction}`, { cookie: admin.cookie }), 200, ok('CATEGORY_LIST_SUCCESS', fiction));
    assertBody(await api.request(`/categories/${new mongoose.Types.ObjectId()}`, { cookie: admin.cookie }), 400, badRequest('CATEGORY_NOT_EXIST'));
  });

  test('GET /categories/search/:q finds live categories through the lunr index', async () => {
    await api.reindex();
    const expected = asJson(await Category().find({ _id: ids.categoryFiction }).select('categoryId title numberOfBooks _id'));
    assertBody(await api.request('/categories/search/fict'), 200, ok('CATEGORY_SEARCH_SUCCESS', expected));
    assertBody(await api.request('/categories/search/gone'), 200, ok('CATEGORY_SEARCH_SUCCESS', []));
  });
});

describe("a category's books", () => {
  beforeEach(async () => {
    await Book().updateOne({ _id: ids.bookTwo }, { popularity: 7, currentDiscount: 30, publicationYear: '2001' });
    await Book().updateOne({ _id: ids.bookOne }, { publicationYear: '2010' });
  });

  test('GET /categories/:id/products pages its live books, sorted', async () => {
    const docs = asJson(await Book().find({ _id: { $in: [ids.bookOne, ids.bookTwo] } }).select(PRODUCT_FIELDS).populate(PRODUCT_POPULATE).sort({ popularity: -1 }));
    assertBody(await api.request(`/categories/${ids.categoryFiction}/products?page=1&limit=10&sortBy=popularity&sortOrder=-1`), 200, ok('BOOK_LIST_SUCCESS', firstPage(docs, 2)));
    assertBody(await api.request(`/categories/${ids.categoryFiction}/products?page=1&limit=10&sortBy=bookId`), 400, badRequest('SORTING_NOT_ALLOWED'));
  });

  test('GET /categories/:id/overview answers in-stock books three ways', async () => {
    await Book().updateOne({ _id: ids.bookOne }, { inventory: 0 });
    const res = await api.request(`/categories/${ids.categoryFiction}/overview?page=1&limit=5&sortOrder=-1`);
    const [bookTwo] = asJson(await Book().find({ _id: ids.bookTwo }).select(OVERVIEW_FIELDS).populate(PRODUCT_POPULATE));
    assertBody(res, 200, ok('BOOK_LIST_SUCCESS', { trending: [bookTwo], newArrivals: [bookTwo], mostDiscounted: [bookTwo] }));
  });

  test('legacy: overview without page/limit answers empty lists', async () => {
    assertBody(await api.request(`/categories/${ids.categoryFiction}/overview`), 200, ok('BOOK_LIST_SUCCESS', { trending: [], newArrivals: [], mostDiscounted: [] }));
  });
});

describe('admin writes', () => {
  test('POST creates a category (201 envelope)', async () => {
    const res = await api.request('/categories', { method: 'POST', body: { title: 'Test New', description: 'Fictional.', thumbnail: 't.png', meta: { title: 'Meta' } }, cookie: admin.cookie });
    const category = await Category().findOne({ title: 'Test New' });
    // As created: schema order with the nested `meta` last, then `_id`, timestamps and `__v`.
    const { meta, ...fields } = asCreated(category);
    const { _id, createdAt, updatedAt, __v, ...rest } = fields;
    assertBody(res, 201, created('CATEGORY_CREATE_SUCCESS', { ...rest, meta, _id, createdAt, updatedAt, __v }));
    assert.match(category.categoryId, /^CA-\d{10}$/);
  });

  test('PUT updates a live category', async () => {
    const res = await api.request(`/categories/${ids.categoryFiction}`, { method: 'PUT', body: { title: 'Test Fiction 2', priority: 3 }, cookie: admin.cookie });
    assertBody(res, 200, ok('CATEGORY_UPDATE_SUCCESS', asJson(await Category().findById(ids.categoryFiction))));
    assert.equal((await Category().findById(ids.categoryFiction)).title, 'Test Fiction 2');
    assertBody(await api.request(`/categories/${new mongoose.Types.ObjectId()}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('CATEGORY_NOT_EXIST'));
  });

  test('DELETE soft-deletes a live category', async () => {
    assertBody(await api.request(`/categories/${ids.categoryFiction}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('CATEGORY_DELETE_SUCCESS'));
    assert.equal((await Category().findById(ids.categoryFiction)).isDeleted, true);
    assertBody(await api.request(`/categories/${ids.categoryFiction}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('CATEGORY_NOT_EXIST'));
    assertBody(await api.request('/categories/not-an-id', { method: 'DELETE', cookie: admin.cookie }), 500, serverError);
  });
});
