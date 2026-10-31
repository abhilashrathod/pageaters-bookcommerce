const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');

const { assertBody, createUser, envelopes, ids, loadCatalog, startTestApp } = require('./helpers');

// middlewares/pageLimit.middleware.js: public list pages are capped at 50 rows. An authenticated ADMIN (the admin's
// pickers) may ask for up to 1000; a shopper or an anonymous caller asking for more gets 400 INVALID_PAGING.

const { badRequest } = envelopes;

const PUBLIC_LISTS = [
  '/store-books',
  '/bundles',
  '/mystery-boxes',
  '/authors',
  '/collections',
  '/deals',
  '/categories',
  `/categories/${ids.categoryFiction}/products`,
  `/categories/${ids.categoryFiction}/overview`,
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
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
});

test('public lists answer up to 50 rows to anyone and refuse more unless the caller is an ADMIN', async () => {
  const list = (path, limit, cookie) => api.request(`${path}?page=1&limit=${limit}`, { cookie });
  for (const path of PUBLIC_LISTS) {
    assert.equal((await list(path, 50)).status, 200, path);
    assertBody(await list(path, 51), 400, badRequest('INVALID_PAGING'));
    assertBody(await list(path, 51, shopper.cookie), 400, badRequest('INVALID_PAGING'));
    assertBody(await list(path, 51, '_PID=not-a-session'), 400, badRequest('INVALID_PAGING'));
    assert.equal((await list(path, 1000, admin.cookie)).status, 200, path);
    assertBody(await list(path, 1001, admin.cookie), 400, badRequest('INVALID_PAGING'));
  }
});
