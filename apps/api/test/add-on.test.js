const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { addOnGroupsResponseSchema } = require('@pageaters/shared');

const { asCreated, asJson, assertBody, assertGuarded, catalogState, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/add-ons (gift wrap, bookmarks…) over HTTP, written against the legacy controller before the service
// refactor. Phase 4 fixed update and admin detail (both always 500), the grouped list (ignored the product,
// served deleted add-ons) and the admin list's paging.

const { ok, okString, badRequest, badRequestObject } = envelopes;

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

  test('GET /add-ons/produtct/:productId groups the live add-ons by category for a live store book', async () => {
    await AddOn().create({ addOnId: 'AO-test-ribbon', name: 'Test Ribbon', category: 'wrap', priority: -1 });
    const res = await api.request(`/add-ons/produtct/${ids.bookOne}`);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['statusCode', 'status', 'message', 'data']);
    assert.equal(res.body.status, 'ADD_ON_LIST_SUCCESS');
    // Only the public fields: no isDeleted, deletedAt or __v.
    const raw = async (filter) =>
      asJson(await AddOn().find({ isDeleted: false, ...filter }).sort({ priority: 1, name: 1 }).select('-isDeleted -deletedAt -__v').lean());
    // Groups by category; in a group by priority, then name. The deleted bookmark is left out.
    for (const addOn of res.body.data.flatMap((group) => group.addOns)) {
      assert.deepEqual(Object.keys(addOn).sort(), ['_id', 'addOnId', 'category', 'createdAt', 'currentDiscount', 'description', 'inventory', 'name', 'poster', 'price', 'priority', 'updatedAt']);
    }
    assert.ok(addOnGroupsResponseSchema.shape.data.safeParse(res.body.data).success);
    assert.deepEqual(res.body.data, [
      { _id: 'bookmark', addOns: await raw({ category: 'bookmark' }) },
      { _id: 'wrap', addOns: await raw({ category: 'wrap' }) },
    ]);
    assert.deepEqual(res.body.data[1].addOns.map((a) => a.name), ['Test Ribbon', 'Test Gift Wrap']);
    assert.equal(res.body.data.flatMap((g) => g.addOns.map((a) => a.addOnId)).includes('AO-test-deleted'), false);
  });

  test('GET /add-ons/produtct/:productId checks the product', async () => {
    assertBody(await api.request(`/add-ons/produtct/${new mongoose.Types.ObjectId()}`), 400, badRequest('BOOK_NOT_EXIST'));
    assertBody(await api.request(`/add-ons/produtct/${ids.bookDeleted}`), 400, badRequest('BOOK_NOT_EXIST'));
    assertBody(await api.request('/add-ons/produtct/not-an-id'), 400, badRequestObject('INVALID_ID'));
  });

  test('GET /add-ons pages live add-ons, newest first by default, or sorted by name', async () => {
    const byName = asJson(await AddOn().find({ isDeleted: false }).sort({ name: 1 }));
    assertBody(await api.request('/add-ons?page=1&limit=10&sortBy=name&sortOrder=asc', { cookie: admin.cookie }), 200, ok('ADD_ON_LIST_SUCCESS', firstPage(byName, 2)));
    const newest = asJson(await AddOn().find({ isDeleted: false }).sort({ createdAt: -1, _id: -1 }));
    assertBody(await api.request('/add-ons', { cookie: admin.cookie }), 200, ok('ADD_ON_LIST_SUCCESS', firstPage(newest, 2)));
    assertBody(await api.request('/add-ons?page=1&limit=10&sortBy=price', { cookie: admin.cookie }), 400, badRequest('SORTING_NOT_ALLOWED'));
    assertBody(await api.request('/add-ons?limit=0', { cookie: admin.cookie }), 400, badRequest('INVALID_PAGING'));
  });

  test('GET /add-ons/:id answers a live add-on, 400 for a deleted one', async () => {
    const addOn = asJson(await AddOn().findById(storeIds.addOnWrap));
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { cookie: admin.cookie }), 200, ok('ADD_ON_LIST_SUCCESS', addOn));
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

  test('PUT /add-ons/:id updates a live add-on; a field left out keeps its value', async () => {
    const res = await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'PUT', body: { name: 'Test Gift Wrap B', price: 39, addOnId: 'AO-forged', isDeleted: true, products: [] }, cookie: admin.cookie });
    const addOn = await AddOn().findById(storeIds.addOnWrap);
    assertBody(res, 200, ok('ADD_ON_UPDATE_SUCCESS', asJson(addOn)));
    assert.deepEqual([addOn.name, addOn.price, addOn.inventory, addOn.category, addOn.addOnId, addOn.isDeleted], ['Test Gift Wrap B', 39, 5, 'wrap', 'AO-test-wrap', false]);
    assert.equal(addOn.toObject().products, undefined);
  });

  test('POST and PUT refuse a bad price, discount or type with a 400 before any write (was a CastError 500)', async () => {
    const before = await catalogState();
    for (const [body, code] of [
      [{ name: 'Test Bad', price: -1 }, 'INVALID_AMOUNT'],
      [{ name: 'Test Bad', price: 9.999 }, 'INVALID_AMOUNT'],
      [{ name: 'Test Bad', price: 'cheap' }, 'INVALID_AMOUNT'],
      [{ name: 'Test Bad', currentDiscount: -5 }, 'INVALID_DISCOUNT'],
      [{ name: 'Test Bad', currentDiscount: 101 }, 'INVALID_DISCOUNT'],
      [{ name: 'Test Bad', currentDiscount: '10' }, 'INVALID_DISCOUNT'],
      [{ name: 'Test Bad', inventory: -1 }, 'INVALID_REQUEST'],
      [{ name: 'Test Bad', inventory: 1.5 }, 'INVALID_REQUEST'],
      [{ name: 'Test Bad', priority: 'top' }, 'INVALID_REQUEST'],
      [{ name: { $ne: '' } }, 'INVALID_REQUEST'],
      [{ name: 'Test Bad', price: null }, 'INVALID_AMOUNT'],
    ]) {
      for (const [method, path] of [
        ['POST', '/add-ons'],
        ['PUT', `/add-ons/${storeIds.addOnWrap}`],
      ]) {
        assertBody(await api.request(path, { method, body, cookie: admin.cookie }), 400, badRequestObject(code));
      }
    }
    assert.deepEqual(await catalogState(), before);
    // Zero and 100 are in range.
    const res = await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'PUT', body: { price: 0, currentDiscount: 100 }, cookie: admin.cookie });
    assert.equal(res.status, 200);
  });

  test('PUT /add-ons/:id refuses a deleted or missing add-on and writes nothing', async () => {
    const before = await catalogState();
    for (const id of [storeIds.addOnDeleted, new mongoose.Types.ObjectId()]) {
      assertBody(await api.request(`/add-ons/${id}`, { method: 'PUT', body: { name: 'Changed' }, cookie: admin.cookie }), 400, badRequest('ADD_ON_NOT_EXIST'));
    }
    assert.deepEqual(await catalogState(), before);
  });

  test('DELETE soft-deletes a live add-on', async () => {
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('ADD_ON_DELETE_SUCCESS'));
    assert.equal((await AddOn().findById(storeIds.addOnWrap)).isDeleted, true);
    assertBody(await api.request(`/add-ons/${storeIds.addOnWrap}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('ADD_ON_NOT_EXIST'));
  });
});
