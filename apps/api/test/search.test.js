const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// The public catalogue search over HTTP (store books, authors, categories, collections, bundles): each request
// queries MongoDB (helpers/search-pattern.helper.js wordPrefixFilter), so there is no index to build or go stale.
// The per-entity projections are covered in each entity's test file.

const { ok } = envelopes;

let api;

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
});

const bookIds = async (q) => {
  const res = await api.request(`/store-books/search?q=${encodeURIComponent(q)}`);
  assert.equal(res.status, 200);
  return res.body.data.map((book) => book.bookId);
};

describe('word-prefix matching', () => {
  test('a term matches the start of any word, case-insensitive', async () => {
    assert.deepEqual(await bookIds('tw'), ['test-book-two']);
    assert.deepEqual(await bookIds('TW'), ['test-book-two']);
    assert.deepEqual(await bookIds('book'), ['test-book-one', 'test-book-two']);
  });

  test('a term inside a word does not match', async () => {
    assert.deepEqual(await bookIds('ook'), []);
    assert.deepEqual(await bookIds('est'), []);
  });

  test('a word after punctuation matches (the bundle tag "test-pair")', async () => {
    const res = await api.request('/bundles/search/pair');
    assert.deepEqual(res.body.data.map((bundle) => bundle._id), [String(storeIds.bundleOne)]);
  });

  test('every term must match, each in any of the searched fields', async () => {
    assert.deepEqual(await bookIds('test two'), ['test-book-two']);
    assert.deepEqual(await bookIds('  book   one '), ['test-book-one']);
    assert.deepEqual(await bookIds('one two'), []);
    // "another" is only in author B's intro, "author" in both names.
    const res = await api.request('/authors/search?q=another%20author');
    assert.deepEqual(res.body.data.map((author) => author._id), [String(ids.authorB)]);
  });

  test('terms after the fifth are ignored', async () => {
    assert.deepEqual(await bookIds('test book two test book nomatch'), ['test-book-two']);
  });

  test('q is cut to 100 characters before it is split into terms', async () => {
    // Uncut, "nomatch" would be a second term that matches nothing.
    assert.deepEqual(await bookIds(`two${' '.repeat(97)}nomatch`), ['test-book-two']);
  });

  test('a collection is found by a tag alone (its tag "test-shelf")', async () => {
    const res = await api.request('/collections/search/shelf');
    assert.deepEqual(res.body.data.map((collection) => collection._id), [String(storeIds.collectionOne)]);
  });
});

describe('result count and order', () => {
  test('a broad query answers at most 10, most popular first', async () => {
    const Author = mongoose.model('author');
    await Author.insertMany(Array.from({ length: 12 }, (_, i) => ({ authorId: `test-many-${i}`, name: `Test Many ${i}`, popularity: i })));
    const res = await api.request('/authors/search?q=test');
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((author) => author.name),
      Array.from({ length: 10 }, (_, i) => `Test Many ${11 - i}`),
    );
  });

  test('books: most popular first, then oldest first', async () => {
    assert.deepEqual(await bookIds('book'), ['test-book-one', 'test-book-two']);
    await mongoose.model('storeBook').updateOne({ _id: ids.bookTwo }, { popularity: 5 });
    assert.deepEqual(await bookIds('book'), ['test-book-two', 'test-book-one']);
  });
});

describe('the query is literal text', () => {
  test('regex metacharacters match only themselves', async () => {
    for (const q of ['.*', '(', '[', '\\', 'b.ok', '^test', 'te|xx', '?']) {
      assert.deepEqual(await bookIds(q), [], q);
    }
    for (const path of ['/categories/search/.*', '/collections/search/(', '/bundles/search/%5B']) {
      const res = await api.request(path);
      assert.equal(res.status, 200, path);
      assert.deepEqual(res.body.data, [], path);
    }
  });

  test('an empty, blank or missing query answers no results without an error', async () => {
    assertBody(await api.request('/store-books/search'), 200, ok('BOOK_SEARCH_SUCCESS', []));
    assertBody(await api.request('/store-books/search?q=%20%20'), 200, ok('BOOK_SEARCH_SUCCESS', []));
    assertBody(await api.request('/authors/search'), 200, ok('AUTHOR_SEARCH_SUCCESS', []));
    assert.deepEqual((await api.request('/authors/search?q=')).body.data, []);
  });

  test('a q that is not a string (an object or array from the query string) answers no results', async () => {
    // `?q[toString]=x` used to throw in String(q): a 500.
    for (const query of ['q[$ne]=x', 'q[toString]=x', 'q[]=book&q[]=two']) {
      assertBody(await api.request(`/store-books/search?${query}`), 200, ok('BOOK_SEARCH_SUCCESS', []));
      assertBody(await api.request(`/authors/search?${query}`), 200, ok('AUTHOR_SEARCH_SUCCESS', []));
    }
  });

  test('control characters separate terms and never reach MongoDB', async () => {
    assertBody(await api.request('/store-books/search?q=%00'), 200, ok('BOOK_SEARCH_SUCCESS', []));
    // "te st": no word starts with "st".
    assert.deepEqual(await bookIds('te\u0000st'), []);
    assert.deepEqual(await bookIds('book\u0000two'), ['test-book-two']);
    assert.deepEqual(await bookIds('\ttwo\n'), ['test-book-two']);
    assert.equal((await api.request('/categories/search/te%00st')).status, 200);
  });
});

describe('results are live', () => {
  test('soft-deleted records are left out', async () => {
    assert.deepEqual(await bookIds('deleted'), []);
    for (const path of ['/bundles/search/deleted', '/collections/search/deleted']) {
      assert.deepEqual((await api.request(path)).body.data, [], path);
    }
  });

  test('a book created or deleted through the admin API is found, then gone, at once', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const body = { title: 'Test Fresh Arrival', author: String(ids.authorA), categories: [String(ids.categoryFiction)], relatedBooks: [String(ids.bookOne)], price: 199, inventory: 2 };
    const created = await api.request('/store-books', { method: 'POST', body, cookie: admin.cookie });
    assert.equal(created.status, 200);
    const res = await api.request('/store-books/search?q=fresh');
    assert.deepEqual(res.body.data.map((book) => book.title), ['Test Fresh Arrival']);

    assert.equal((await api.request(`/store-books/${created.body.data._id}`, { method: 'DELETE', cookie: admin.cookie })).status, 200);
    assert.deepEqual(await bookIds('fresh'), []);
  });
});
