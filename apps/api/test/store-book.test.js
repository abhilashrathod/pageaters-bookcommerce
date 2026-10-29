const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, eventually, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/store-books over HTTP: public list, detail and search, the unauthenticated CSV export, and admin CRUD
// with its side effects on categories, authors, bundles and collections. Written against the legacy controller
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

const EXPORT_FILE = path.join(__dirname, '..', 'public', 'product_template.csv');

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

  test('refuses a sort field outside the allowlist; legacy: no page/limit answers no documents', async () => {
    assertBody(await api.request('/store-books?page=1&limit=10&sortBy=price'), 400, badRequest('SORTING_NOT_ALLOWED'));
    assertBody(await api.request('/store-books'), 200, ok('BOOK_LIST_SUCCESS', paged([], { totalDocs: 2, limit: 0, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null })));
  });
});

describe('detail', () => {
  test('legacy: public detail by bookId sends the whole document, wholeSalePriceHistory included', async () => {
    const book = asJson(await Book().findById(ids.bookOne).populate(PUBLIC_POPULATE));
    const res = await api.request('/store-books/unique/test-book-one');
    assertBody(res, 200, ok('BOOK_LIST_SUCCESS', book));
    assert.deepEqual(res.body.data.wholeSalePriceHistory, [1]);
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
    await api.reindex();
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
    await api.reindex();
    assertBody(await api.request('/store-books/search'), 200, ok('BOOK_SEARCH_SUCCESS', []));
  });
});

describe('POST /store-books', () => {
  test('creates the book and updates its category count, author and related books', async () => {
    const res = await api.request('/store-books', { method: 'POST', body: newBook(), cookie: admin.cookie });
    const book = await Book().findOne({ title: 'Test Book New' });
    assertBody(res, 200, ok('BOOK_CREATE_SUCCESS', asCreated(book)));
    assert.match(book.bookId, /^BK-\d{10}$/);
    assert.deepEqual(book.wholeSalePriceHistory, [1]);
    assert.equal((await Category().findById(ids.categoryFiction)).numberOfBooks, 3);
    assert.deepEqual((await Author().findById(ids.authorB)).books.map(String), [String(book._id)]);
    assert.deepEqual((await Book().findById(ids.bookOne)).relatedBooks.map(String), [String(ids.bookTwo), String(book._id)]);
  });

  test('legacy: without categories or relatedBooks it answers 500 after creating the book', async () => {
    assertBody(await api.request('/store-books', { method: 'POST', body: { title: 'Test Book Bare' }, cookie: admin.cookie }), 500, serverError);
    assert.equal(await Book().countDocuments({ title: 'Test Book Bare' }), 1);
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

  test('legacy: every category added or removed counts one more book', async () => {
    const other = await Category().create({ categoryId: 'test-other', title: 'Test Other', numberOfBooks: 0 });
    await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body: newBook({ categories: [String(other._id)], relatedBooks: [] }), cookie: admin.cookie });
    assert.ok(await eventually(async () => (await Category().findById(other._id)).numberOfBooks === 1));
    assert.ok(await eventually(async () => (await Category().findById(ids.categoryFiction)).numberOfBooks === 3));
  });

  test('refuses a deleted book; legacy: without categories it answers 500', async () => {
    assertBody(await api.request(`/store-books/${ids.bookDeleted}`, { method: 'PUT', body: newBook(), cookie: admin.cookie }), 400, badRequest('BOOK_NOT_EXIST'));
    assertBody(await api.request(`/store-books/${ids.bookTwo}`, { method: 'PUT', body: { title: 'x' }, cookie: admin.cookie }), 500, serverError);
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

describe('GET /store-books/bulk/export', () => {
  // `send` refuses to serve a path with a dot segment, so where the API lives under one (e.g. a .claude/worktrees
  // checkout) the download fails with the controller's plain-text 500. The CSV is checked from the file on disk.
  const servedFromDotPath = EXPORT_FILE.split(path.sep).some((part) => part.startsWith('.'));

  test('legacy: unauthenticated; writes the catalog CSV to local disk, sends it and deletes it', async (t) => {
    await Book().updateOne({ _id: ids.bookOne }, { tagline: 'A Test', publisher: 'Test Press', description: 'Line one\nLine two' });
    const written = [];
    const { unlinkSync } = fs;
    t.mock.method(fs, 'unlinkSync', (file) => {
      written.push(fs.readFileSync(file, 'utf8'));
      return unlinkSync(file);
    });

    const res = await fetch(`${api.baseUrl}/store-books/bulk/export`, { signal: AbortSignal.timeout(10_000) });
    const text = await res.text();
    // The file is captured when the download callback deletes it, which may come after the response ends.
    assert.ok(await eventually(() => written.length === 1 && !fs.existsSync(EXPORT_FILE)));
    if (servedFromDotPath) {
      assert.equal(res.status, 500);
      assert.equal(text, 'Error sending file');
    } else {
      assert.equal(res.status, 200);
      // Express leaves a plain filename unquoted.
      assert.equal(res.headers.get('content-disposition'), 'attachment; filename=product_template.csv');
      assert.equal(text, written[0]);
    }

    const [header, ...rows] = written[0].trim().split('\n');
    assert.equal(
      header,
      'Slug,Title,Body (HTML),Brand,Release Year,Categories,Tags,Inventory,Sell Price,Discount,Weight,dimensions,SKU,MRP,Language,ISBN,Version,Pages,Availability,Poster',
    );
    assert.deepEqual(rows.sort(), [
      'test-book-one-a-test,Test Book One (A Test),Line one<br>Line two,Test Press,,Test Fiction,Test Author A,25,449,10,0,,test-book-one,499,English,9990000000001,,200,available,https://storebooks.s3.ap-south-1.amazonaws.com/https://images.example.com/test-cover.png',
      'test-book-two,Test Book Two ,,,,Test Fiction,Test Author B,25,449,10,0,,test-book-two,499,English,9990000000002,,200,available,https://storebooks.s3.ap-south-1.amazonaws.com/https://images.example.com/test-cover.png',
    ]);
  });
});
