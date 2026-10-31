const { after, before, beforeEach, test } = require('node:test');

const { assertBody, createUser, envelopes, loadCatalog, startTestApp } = require('./helpers');
const { loadStore } = require('./helpers/fixtures/store');

// A malformed id in the path or a filter answers 400 INVALID_ID (was: the CastError's 500), through the one mapping
// in helpers/appError.helper.js. A few representative public and admin routes.

const invalidId = envelopes.badRequest('INVALID_ID');

let api;
let admin;

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
});

test('public catalog routes', async () => {
  for (const path of [
    '/categories/not-an-id/products',
    '/categories/not-an-id/overview',
    '/bundles?category=not-an-id',
    '/collections?category=not-an-id',
  ]) {
    assertBody(await api.request(path), 400, invalidId);
  }
});

test('admin routes', async () => {
  for (const [method, path] of [
    ['GET', '/add-ons/not-an-id'],
    ['DELETE', '/add-ons/not-an-id'],
    ['GET', '/deals/not-an-id'],
    ['DELETE', '/deals/not-an-id'],
    ['GET', '/mystery-boxes/not-an-id'],
    ['DELETE', '/mystery-boxes/not-an-id'],
  ]) {
    assertBody(await api.request(path, { method, cookie: admin.cookie }), 400, invalidId);
  }
});
