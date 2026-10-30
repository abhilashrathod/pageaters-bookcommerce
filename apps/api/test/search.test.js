const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// Placeholder config; no database: the controllers must answer before any query.
Object.assign(process.env, {
  APP_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:1/pageaters_test',
  ENCRYPTION_KEY: 'k'.repeat(32),
  RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
});

require('../src/models');

const SEARCHES = [
  ['storeBook', 'BOOK_SEARCH_SUCCESS'],
  ['author', 'AUTHOR_SEARCH_SUCCESS'],
  ['category', 'CATEGORY_SEARCH_SUCCESS'],
  ['collection', 'COLLECTION_SEARCH_SUCCESS'],
  ['bundle', 'BUNDLE_SEARCH_SUCCESS'],
];

describe('search before the lunr index is built', () => {
  for (const [name, message] of SEARCHES) {
    test(`${name} search answers the success envelope with no results`, async () => {
      const { search } = require(`../src/controllers/${name}.controller`);
      const req = { app: {}, allParams: () => ({ q: 'harry' }) };
      const res = {
        ok: (payload) => ({ ok: payload }),
        internalServerError: (error) => assert.fail(`answered 500: ${error}`),
      };
      assert.deepEqual(await search(req, res), { ok: { message, data: [] } });
    });
  }
});
