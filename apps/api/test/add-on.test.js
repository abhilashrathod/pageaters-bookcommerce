const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/add-ons (gift wrap, bookmarks…) over HTTP, written against the legacy controller before the service
// refactor. Its known legacy bugs are pinned here.

const { ok, okString, badRequest, serverError } = envelopes;

const AddOn = () => mongoose.model('add_on');

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

const firstPage = (docs, totalDocs, limit = 10) =>
  paged(docs, { totalDocs, limit, totalPages: Math.ceil(totalDocs / limit) || 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: totalDocs > limit, prevPage: null, nextPage: totalDocs > limit ? 2 : null });

describe('add-ons', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', '/add-ons'],
      ['GET', `/add-ons/${storeIds.addOnWrap}`],
      ['POST', '/add-ons', { name: 'Test New' }],
      ['PUT', `/add-ons/${storeIds.addOnWrap}`, { name: 'Test New' }],
      ['DELETE', `/add-ons/${storeIds.addOnWrap}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });

  test('legacy: GET /add-ons/produtct/:productId groups every add-on by category, deleted ones included, ignoring the product', async () => {
    const res = await api.request(`/add-ons/produtct/${new mongoose.Types.ObjectId()}`);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['statusCode', 'status', 'message', 'data']);
    assert.equal(res.body.status, 'ADD_ON_LIST_SUCCESS');
    const groups = [...res.body.data].sort((a, b) => a._id.localeCompare(b._id));
    const raw = asJson(await AddOn().find().lean());
    assert.deepEqual(groups, [
      { _id: 'bookmark', addOns: raw.filter((a) => a.category === 'bookmark') },
      { _id: 'wrap', addOns: raw.filter((a) => a.category === 'wrap') },
    ]);
  });

  test('GET /add-ons pages live add-ons sorted by name', async () => {
    const docs = asJson(await AddOn().find({ isDeleted: false }).sort({ name: 1 }));
    assertBody(await api.request('/add-ons?page=1&limit=10&sortBy=name&sortOrder=asc', { cookie: admin.cookie }), 200, ok('ADD_ON_LIST_SUCCESS', firstPage(docs, 2)));
    assertBody(await api.request('/add-ons?page=1&limit=10&sortBy=price', { cookie: admin.cookie }), 400, badRequest('SORTING_NOT_ALLOWED'));
  });

  test('legacy: GET /add-ons/:id answers 500 for a live add-on (undefined variable), 400 otherwise', async () => {
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { cookie: admin.cookie }), 500, serverError);
    assertBody(await api.request(`/add-ons/${storeIds.addOnDeleted}`, { cookie: admin.cookie }), 400, badRequest('ADD_ON_NOT_EXIST'));
  });

  test('POST creates an add-on; fields outside the schema are dropped', async () => {
    const body = { name: 'Test Ribbon', category: 'wrap', price: 9, currentDiscount: 1, inventory: 3, productPrefrerence: 'x', products: [] };
    const res = await api.request('/add-ons', { method: 'POST', body, cookie: admin.cookie });
    const addOn = await AddOn().findOne({ name: 'Test Ribbon' });
    assertBody(res, 200, ok('ADD_ON_CREATE_SUCCESS', asCreated(addOn)));
    assert.match(addOn.addOnId, /^AO-\d{10}$/);
    assert.equal(addOn.toObject().products, undefined);
  });

  test('legacy: PUT /add-ons/:id always answers 500 and changes nothing', async () => {
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'PUT', body: { name: 'Changed' }, cookie: admin.cookie }), 500, serverError);
    assert.equal((await AddOn().findById(storeIds.addOnWrap)).name, 'Test Gift Wrap');
  });

  test('DELETE soft-deletes a live add-on', async () => {
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('ADD_ON_DELETE_SUCCESS'));
    assert.equal((await AddOn().findById(storeIds.addOnWrap)).isDeleted, true);
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('ADD_ON_NOT_EXIST'));
  });
});
