const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');

// /api/v1/authors over HTTP: public list, detail and search; admin CRUD. Written against the legacy controller
// before the service refactor.

const { ok, okString, badRequest, serverError } = envelopes;

const Author = () => mongoose.model('author');
const Book = () => mongoose.model('storeBook');

const LIST_FIELDS = 'name books authorId popularity isDeleted deletedAt';

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

const page1 = (docs, totalDocs, limit = 10) =>
  paged(docs, { totalDocs, limit, totalPages: Math.ceil(totalDocs / limit) || 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: totalDocs > limit, prevPage: null, nextPage: totalDocs > limit ? 2 : null });

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/authors/${ids.authorA}`],
      ['POST', '/authors', { name: 'Test New', books: [] }],
      ['PUT', `/authors/${ids.authorA}`, { name: 'Test New', books: [] }],
      ['DELETE', `/authors/${ids.authorA}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
    assert.equal(await Author().countDocuments(), 2);
  });
});

describe('GET /authors', () => {
  test('pages live authors with the list projection, sorted', async () => {
    await Author().create({ authorId: 'test-author-c', name: 'Test Author C', isDeleted: true });
    for (const [sortOrder, names] of [
      ['asc', ['Test Author A', 'Test Author B']],
      ['desc', ['Test Author B', 'Test Author A']],
      ['-1', ['Test Author B', 'Test Author A']],
    ]) {
      const res = await api.request(`/authors?page=1&limit=10&sortBy=name&sortOrder=${sortOrder}`);
      const docs = asJson(await Author().find({ isDeleted: false }).select(LIST_FIELDS).sort({ name: sortOrder === 'asc' ? 1 : -1 }));
      assertBody(res, 200, ok('AUTHOR_LIST_SUCCESS', page1(docs, 2)));
      assert.deepEqual(res.body.data.docs.map((a) => a.name), names);
    }
  });

  test('refuses a sort field outside the allowlist', async () => {
    assertBody(await api.request('/authors?page=1&limit=10&sortBy=intro'), 400, badRequest('SORTING_NOT_ALLOWED'));
  });

  test('legacy: without page/limit answers no documents', async () => {
    assertBody(await api.request('/authors'), 200, ok('AUTHOR_LIST_SUCCESS', paged([], { totalDocs: 2, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
  });
});

describe('GET /authors/unique/:authorId and /authors/:id', () => {
  beforeEach(async () => {
    await Author().updateOne({ _id: ids.authorA }, { books: [ids.bookOne] });
  });

  test('public detail by authorId populates the books with list fields', async () => {
    const expected = await Author()
      .findById(ids.authorA)
      .populate({ path: 'books', select: 'title bookId ISBN author poster price popularity availability editorsPick inventory currentDiscount inventory newRelease preOrder bestSeller' });
    assertBody(await api.request('/authors/unique/test-author-a'), 200, ok('AUTHOR_LIST_SUCCESS', asJson(expected)));
    assertBody(await api.request('/authors/unique/unknown'), 400, badRequest('AUTHOR_NOT_EXIST'));
  });

  test('admin detail by id populates book titles', async () => {
    const expected = await Author().findById(ids.authorA).populate({ path: 'books', select: '_id title' });
    assertBody(await api.request(`/authors/${ids.authorA}`, { cookie: admin.cookie }), 200, ok('AUTHOR_LIST_SUCCESS', asJson(expected)));
    assertBody(await api.request(`/authors/${new mongoose.Types.ObjectId()}`, { cookie: admin.cookie }), 400, badRequest('AUTHOR_NOT_EXIST'));
    assertBody(await api.request('/authors/not-an-id', { cookie: admin.cookie }), 500, serverError);
  });
});

describe('GET /authors/search', () => {
  test('finds live authors by name prefix', async () => {
    const res = await api.request('/authors/search?q=author');
    assertBody(res, 200, ok('AUTHOR_SEARCH_SUCCESS', asJson(await Author().find({}))));
    assertBody(await api.request('/authors/search?q=nobody'), 200, ok('AUTHOR_SEARCH_SUCCESS', []));
  });

  test('a soft-deleted author is left out at once', async () => {
    await Author().updateOne({ _id: ids.authorB }, { isDeleted: true });
    const res = await api.request('/authors/search?q=author');
    assert.deepEqual(res.body.data.map((a) => a._id), [String(ids.authorA)]);
  });
});

describe('POST /authors', () => {
  test('creates the author and points its books at it', async () => {
    const res = await api.request('/authors', { method: 'POST', body: { name: 'Test Author New', intro: 'Fictional.', avatar: 'a.png', books: [String(ids.bookOne)] }, cookie: admin.cookie });
    const created = await Author().findOne({ name: 'Test Author New' });
    assertBody(res, 200, ok('AUTHOR_CREATE_SUCCESS', asCreated(created)));
    assert.match(created.authorId, /^AU-\d{10}$/);
    assert.equal(String((await Book().findById(ids.bookOne)).author), String(created._id));
  });

  test('legacy: without books it answers 500 after creating the author', async () => {
    assertBody(await api.request('/authors', { method: 'POST', body: { name: 'Test Author Bookless' }, cookie: admin.cookie }), 500, serverError);
    assert.equal(await Author().countDocuments({ name: 'Test Author Bookless' }), 1);
  });
});

describe('PUT /authors/:id', () => {
  test('updates the author and points its books at it', async () => {
    const res = await api.request(`/authors/${ids.authorB}`, { method: 'PUT', body: { name: 'Test Author B2', books: [String(ids.bookOne)] }, cookie: admin.cookie });
    assertBody(res, 200, ok('AUTHOR_UPDATE_SUCCESS', asJson(await Author().findById(ids.authorB))));
    assert.equal((await Author().findById(ids.authorB)).name, 'Test Author B2');
    assert.equal(String((await Book().findById(ids.bookOne)).author), String(ids.authorB));
  });

  test('refuses an unknown or deleted author', async () => {
    await Author().updateOne({ _id: ids.authorB }, { isDeleted: true });
    for (const id of [ids.authorB, new mongoose.Types.ObjectId()]) {
      assertBody(await api.request(`/authors/${id}`, { method: 'PUT', body: { books: [] }, cookie: admin.cookie }), 400, badRequest('AUTHOR_NOT_EXIST'));
    }
  });

  test('legacy: without books it answers 500 after updating', async () => {
    assertBody(await api.request(`/authors/${ids.authorB}`, { method: 'PUT', body: { name: 'Test Author B3' }, cookie: admin.cookie }), 500, serverError);
    assert.equal((await Author().findById(ids.authorB)).name, 'Test Author B3');
  });
});

describe('DELETE /authors/:id', () => {
  test('soft-deletes the author and unlinks its books', async () => {
    await Author().updateOne({ _id: ids.authorA }, { books: [ids.bookOne] });
    assertBody(await api.request(`/authors/${ids.authorA}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('AUTHOR_DELETE_SUCCESS'));
    const deleted = await Author().findById(ids.authorA);
    assert.equal(deleted.isDeleted, true);
    assert.deepEqual(deleted.books, []);
    assert.equal((await Book().findById(ids.bookOne)).author, null);
    // A book not listed on the author keeps its author.
    assert.equal(String((await Book().findById(ids.bookDeleted)).author), String(ids.authorA));
    assertBody(await api.request(`/authors/${ids.authorA}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('AUTHOR_NOT_EXIST'));
  });
});
