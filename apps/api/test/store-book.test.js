const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, catalogState, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/store-books over HTTP: public list, detail and search, and admin CRUD with
// its side effects on categories, authors, bundles and collections. Written against the legacy controller
// before the service refactor. `wholeSalePriceHistory` uses obviously fake values only (AGENTS.md §7).

const { ok, okString, badRequest, serverError } = envelopes;

const Book = () => mongoose.model('storeBook');
const Category = () => mongoose.model('category');
const Author = () => mongoose.model('author');

const LIST_FIELDS = 'title bookId ISBN author inventory poster images tags price weight popularity editorsPick newRelease preOrder currentDiscount bestSeller';
const LIST_POPULATE = [
  { path: 'author', select: 'name intro avatar' },
  { path: 'categories', select: '_id categoryId title' },
];
const RELATED_BOOK_FIELDS = '_id title bookId ISBN author inventory poster price popularity editorsPick newRelease preOrder currentDiscount bestSeller';
const RELATED = [
  { path: 'relatedBundles', select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice' },
  { path: 'categories', select: '_id categoryId title' },
  { path: 'relatedCollections', select: '_id collectionId title poster books', populate: { path: 'books', select: 'title poster' } },
];
const PUBLIC_POPULATE = [
  { path: 'author', select: '_id authorId name avatar' },
  {
    path: 'relatedBooks',
    select: RELATED_BOOK_FIELDS,
    populate: [
      { path: 'author', select: '_id name' },
      { path: 'categories', select: '_id categoryId title' },
    ],
  },
  ...RELATED,
];
const ADMIN_POPULATE = [{ path: 'author', select: '_id authorId name avatar' }, { path: 'relatedBooks', select: RELATED_BOOK_FIELDS }, ...RELATED];

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
  await Book().updateOne({ _id: ids.bookOne }, { relatedBooks: [ids.bookTwo], relatedBundles: [storeIds.bundleOne], relatedCollections: [storeIds.collectionOne], wholeSalePriceHistory: [1] });
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

const firstPage = (docs, totalDocs, limit = 10) =>
  paged(docs, { totalDocs, limit, totalPages: Math.ceil(totalDocs / limit) || 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: totalDocs > limit, prevPage: null, nextPage: totalDocs > limit ? 2 : null });

const newBook = (overrides = {}) => ({
  title: 'Test Book New',
  author: String(ids.authorB),
  categories: [String(ids.categoryFiction)],
  relatedBooks: [String(ids.bookOne)],
  price: 299,
  currentDiscount: 5,
  inventory: 3,
  wholeSalePriceHistory: [1],
  ...overrides,
});

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/store-books/get/${ids.bookOne}`],
      ['POST', '/store-books', newBook()],
      ['PUT', `/store-books/${ids.bookOne}`, newBook()],
      ['DELETE', `/store-books/${ids.bookOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
    assert.equal(await Book().countDocuments(), 3);
  });
});

describe('GET /store-books', () => {
  test('pages live books of a type with the list projection, sorted', async () => {
    for (const [sortOrder, sort] of [
      ['asc', { title: 1 }],
      ['-1', { title: -1 }],
    ]) {
      const docs = asJson(await Book().find({ isDeleted: false, type: 'book' }).select(LIST_FIELDS).populate(LIST_POPULATE).sort(sort));
      assertBody(await api.request(`/store-books?page=1&limit=10&sortBy=title&sortOrder=${sortOrder}`), 200, ok('BOOK_LIST_SUCCESS', firstPage(docs, 2)));
    }
    assertBody(await api.request('/store-books?page=1&limit=10&type=bundle'), 200, ok('BOOK_LIST_SUCCESS', firstPage([], 0)));
  });

  test('refuses a sort field outside the allowlist; without page/limit answers page 1 of 10, newest first', async () => {
    assertBody(await api.request('/store-books?page=1&limit=10&sortBy=price'), 400, badRequest('SORTING_NOT_ALLOWED'));
    const docs = asJson(await Book().find({ isDeleted: false, type: 'book' }).select(LIST_FIELDS).populate(LIST_POPULATE).sort({ createdAt: -1, _id: -1 }));
    assertBody(await api.request('/store-books'), 200, ok('BOOK_LIST_SUCCESS', firstPage(docs, 2)));
    const second = await api.request('/store-books?page=2&limit=1');
    assert.deepEqual([second.body.data.page, second.body.data.docs.map((b) => b._id)], [2, [docs[1]._id]]);
  });
});

describe('detail', () => {
  test('public detail by bookId sends the whole document except wholeSalePriceHistory (7d)', async () => {
    const book = asJson(await Book().findById(ids.bookOne).populate(PUBLIC_POPULATE));
    const res = await api.request('/store-books/unique/test-book-one');
    assertBody(res, 200, ok('BOOK_LIST_SUCCESS', book));
    assert.equal(Object.hasOwn(res.body.data, 'wholeSalePriceHistory'), false);
    assert.equal(res.body.data.relatedBooks[0].author.name, 'Test Author B');
    assertBody(await api.request('/store-books/unique/test-book-deleted'), 400, badRequest('BOOK_NOT_EXIST'));
  });

  test('admin detail by id', async () => {
    const book = asJson(await Book().findById(ids.bookOne).populate(ADMIN_POPULATE));
    assertBody(await api.request(`/store-books/get/${ids.bookOne}`, { cookie: admin.cookie }), 200, ok('BOOK_LIST_SUCCESS', book));
    assertBody(await api.request(`/store-books/get/${ids.bookDeleted}`, { cookie: admin.cookie }), 400, badRequest('BOOK_NOT_EXIST'));
    assertBody(await api.request('/store-books/get/not-an-id', { cookie: admin.cookie }), 500, serverError);
  });
});

describe('GET /store-books/search', () => {
  test('finds live books by title prefix, with the author name', async () => {
    const expected = asJson(
      await Book()
        .find({ _id: ids.bookTwo })
        .select('title ISBN bookId author poster weight price popularity inventory editorsPick newRelease preOrder currentDiscount bestSeller')
        .populate({ path: 'author', select: 'name' }),
    );
    assertBody(await api.request('/store-books/search?q=tw'), 200, ok('BOOK_SEARCH_SUCCESS', expected));
    const res = await api.request('/store-books/search?q=book');
    assert.deepEqual(res.body.data.map((b) => b.bookId).sort(), ['test-book-one', 'test-book-two']);
    assertBody(await api.request('/store-books/search?q=deleted'), 200, ok('BOOK_SEARCH_SUCCESS', []));
  });

  test('an empty query answers no results', async () => {
    assertBody(await api.request('/store-books/search'), 200, ok('BOOK_SEARCH_SUCCESS', []));
  });
});

describe('POST /store-books', () => {
  test('creates the book and updates its category count, author and related books', async () => {
    const res = await api.request('/store-books', { method: 'POST', body: newBook(), cookie: admin.cookie });
    const book = await Book().findOne({ title: 'Test Book New' });
    assertBody(res, 200, ok('BOOK_CREATE_SUCCESS', asCreated(book)));
    assert.match(book.bookId, /^BK-\d{10}$/);
    // 7d: a wholeSalePriceHistory in the request is not stored.
    assert.equal((await Book().findById(book._id).select('+wholeSalePriceHistory').lean()).wholeSalePriceHistory, undefined);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 3);
    assert.deepEqual((await Author().findById(ids.authorB)).books.map(String), [String(book._id)]);
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBooks.map(String), [String(ids.bookTwo), String(book._id)]);
  });

  test('without categories or relatedBooks creates the book with none (the legacy answered 500 after creating it)', async () => {
    const res = await api.request('/store-books', { method: 'POST', body: { title: 'Test Book Bare' }, cookie: admin.cookie });
    const book = await Book().findOne({ title: 'Test Book Bare' });
    assertBody(res, 200, ok('BOOK_CREATE_SUCCESS', asCreated(book)));
    assert.deepEqual([book.categories, book.relatedBooks], [[], []]);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 2);
  });

  test('counts the book once per live category, skipping unknown and deleted ones and repeats', async () => {
    const gone = await Category().create({ categoryId: 'test-gone', title: 'Test Gone', numberOfBooks: 4, isDeleted: true });
    const categories = [String(ids.categoryFiction), String(ids.categoryFiction), String(gone._id), String(new mongoose.Types.ObjectId())];
    assert.equal((await api.request('/store-books', { method: 'POST', body: newBook({ categories }), cookie: admin.cookie })).status, 200);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 3);
    assert.equal((await Category().findById(gone._id)).numberOfBooks, 4);
  });
});

describe('PUT /store-books/:id', () => {
  test('updates the book and links it from new related books', async () => {
    const body = newBook({ title: 'Test Book Two B', relatedBooks: [String(ids.bookOne)], categories: [String(ids.categoryFiction)] });
    const res = await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body, cookie: admin.cookie });
    assertBody(res, 200, ok('BOOK_UPDATE_SUCCESS', asJson(await Book().findById(ids.bookTwo))));
    assert.equal((await Book().findById(ids.bookTwo)).title, 'Test Book Two B');
    // Already linked: unchanged.
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBooks.map(String), [String(ids.bookTwo)]);
    // Same categories: no count change.
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 2);
  });

  test('a category added counts one more book and one removed one fewer, before the response (the legacy counted both up, unawaited)', async () => {
    const other = await Category().create({ categoryId: 'test-other', title: 'Test Other', numberOfBooks: 0 });
    const res = await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body: newBook({ categories: [String(other._id)], relatedBooks: [] }), cookie: admin.cookie });
    assert.equal(res.status, 200);
    assert.equal((await Category().findById(other._id)).numberOfBooks, 1);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 1);
    assert.deepEqual((await Book().findById(ids.bookTwo)).categories.map(String), [String(other._id)]);
  });

  test('a count never goes below 0', async () => {
    await Category().updateOne({ _id: ids.categoryFiction }, { numberOfBooks: 0 });
    await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body: newBook({ categories: [], relatedBooks: [] }), cookie: admin.cookie });
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 0);
  });

  test('refuses a deleted book; without categories keeps them and every count (the legacy answered 500)', async () => {
    assertBody(await api.request(`/store-books/${ids.bookDeleted}`, { method: 'PUT', body: newBook(), cookie: admin.cookie }), 400, badRequest('BOOK_NOT_EXIST'));
    const before = (await Book().findById(ids.bookTwo)).categories.map(String);
    const res = await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body: { title: 'Test Book Two X' }, cookie: admin.cookie });
    const book = await Book().findById(ids.bookTwo);
    assertBody(res, 200, ok('BOOK_UPDATE_SUCCESS', asJson(book)));
    assert.deepEqual([book.title, book.categories.map(String)], ['Test Book Two X', before]);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 2);
  });
});

describe('book reference checks', () => {
  test('refuses a reference that is not an id (list or single) on create and update, before writing anything', async () => {
    const before = await catalogState();
    for (const [body, code] of [
      [newBook({ categories: null }), 'INVALID_REQUEST'],
      [newBook({ categories: String(ids.categoryFiction) }), 'INVALID_REQUEST'],
      [newBook({ categories: ['nope'] }), 'INVALID_ID'],
      [newBook({ categories: [{ $gt: '' }] }), 'INVALID_REQUEST'],
      [newBook({ relatedBooks: String(ids.bookOne) }), 'INVALID_REQUEST'],
      [newBook({ relatedBundles: String(storeIds.bundleOne) }), 'INVALID_REQUEST'],
      [newBook({ relatedCollections: ['nope'] }), 'INVALID_ID'],
      [newBook({ author: 'nope' }), 'INVALID_ID'],
      [newBook({ author: { $ne: null } }), 'INVALID_REQUEST'],
    ]) {
      for (const [method, path] of [
        ['POST', '/store-books'],
        ['PUT', `/store-books/${ids.bookTwo}`],
      ]) {
        const res = await api.request(path, { method, body, cookie: admin.cookie });
        assertBody(res, 400, envelopes.badRequestObject(code));
      }
    }
    assert.deepEqual(await catalogState(), before);
  });
});

describe('DELETE /store-books/:id', () => {
  test('soft-deletes the book and removes it from related books, bundles and collections', async () => {
    assertBody(await api.request(`/store-books/${ids.bookTwo}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('BOOK_DELETE_SUCCESS'));
    const book = await Book().findById(ids.bookTwo);
    assert.equal(book.isDeleted, true);
    assert.ok(book.deletedAt);
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBooks, []);
    assert.deepEqual((await mongoose.model('bundle').findById(storeIds.bundleOne)).bundledBooks.map(String), [String(ids.bookOne)]);
    assert.deepEqual((await mongoose.model('collection').findById(storeIds.collectionTwo)).books, []);
    assertBody(await api.request(`/store-books/${ids.bookTwo}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('BOOK_NOT_EXIST'));
  });
});
