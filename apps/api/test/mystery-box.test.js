const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/mystery-boxes over HTTP, written against the legacy controller before the service refactor.

const { ok, okString, badRequest } = envelopes;

const Box = () => mongoose.model('mystery_box');

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

describe('mystery boxes', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/mystery-boxes/${storeIds.boxOne}`],
      ['POST', '/mystery-boxes', { title: 'Test New' }],
      ['PUT', `/mystery-boxes/${storeIds.boxOne}`, { title: 'Test New' }],
      ['DELETE', `/mystery-boxes/${storeIds.boxOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });

  test('GET /mystery-boxes pages live boxes by number of books, page 1 of 10 by default', async () => {
    const docs = asJson(await Box().find({ isDeleted: false }).sort({ books: 1 }));
    assertBody(await api.request('/mystery-boxes?page=1&limit=10'), 200, ok('MYSTERY_BOX_LIST_SUCCESS', firstPage(docs, 2)));
    assert.deepEqual(docs.map((box) => box.books), [1, 3]);
    // The legacy answered no documents without page/limit.
    assertBody(await api.request('/mystery-boxes'), 200, ok('MYSTERY_BOX_LIST_SUCCESS', firstPage(docs, 2)));
    // No client sorting: sortBy/sortOrder are not read.
    assertBody(await api.request('/mystery-boxes?sortBy=price&sortOrder=desc'), 200, ok('MYSTERY_BOX_LIST_SUCCESS', firstPage(docs, 2)));
    assertBody(await api.request('/mystery-boxes?limit=0'), 400, badRequest('INVALID_PAGING'));
  });

  test('detail by boxId (public) and by id (admin)', async () => {
    const box = asJson(await Box().findById(storeIds.boxOne));
    assertBody(await api.request('/mystery-boxes/unique/BOX-test-one'), 200, ok('MYSTERY_BOX_LIST_SUCCESS', box));
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxOne}`, { cookie: admin.cookie }), 200, ok('MYSTERY_BOX_LIST_SUCCESS', box));
    assertBody(await api.request('/mystery-boxes/unique/BOX-test-deleted'), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxDeleted}`, { cookie: admin.cookie }), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
  });

  test('POST creates a box (legacy: with a SET- id prefix)', async () => {
    const res = await api.request('/mystery-boxes', { method: 'POST', body: { title: 'Test Box New', books: 2, price: 500, weight: 600 }, cookie: admin.cookie });
    const box = await Box().findOne({ title: 'Test Box New' });
    assertBody(res, 200, ok('MYSTERY_BOX_CREATE_SUCCESS', asCreated(box)));
    assert.match(box.boxId, /^SET-\d{10}$/);
  });

  test('PUT updates a live box', async () => {
    const res = await api.request(`/mystery-boxes/${storeIds.boxTwo}`, { method: 'PUT', body: { title: 'Test Box One B', price: 450 }, cookie: admin.cookie });
    assertBody(res, 200, ok('MYSTERY_BOX_UPDATE_SUCCESS', asJson(await Box().findById(storeIds.boxTwo))));
    assert.equal((await Box().findById(storeIds.boxTwo)).price, 450);
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxDeleted}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
  });

  test('PUT keeps a field left out (Mongoose drops undefined keys; nothing is written as null)', async () => {
    await api.request(`/mystery-boxes/${storeIds.boxOne}`, { method: 'PUT', body: { price: 950 }, cookie: admin.cookie });
    const box = await Box().findById(storeIds.boxOne).lean();
    assert.deepEqual([box.title, box.books, box.weight, box.price, box.tags], ['Test Box Three', 3, 900, 950, ['test']]);
  });

  test('DELETE soft-deletes a live box and stamps deletedAt (the legacy wrote a deactivatedAt the model lacks)', async () => {
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxTwo}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('MYSTERY_BOX_DELETE_SUCCESS'));
    const box = await Box().findById(storeIds.boxTwo).lean();
    assert.equal(box.isDeleted, true);
    assert.ok(box.deletedAt);
    assert.equal('deactivatedAt' in box, false);
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxTwo}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('MYSTERY_BOX_NOT_EXIST'));
  });
});

describe('legacy: an empty id from the query or body overrides the path param', () => {
  // req.allParams() merges params, query and body, so `?id=` empties the path's id; the handler then answers
  // res.ok() (SUCCESS, data {}) without a lookup.
  test('GET /mystery-boxes/unique/:id?id= answers 200 SUCCESS', async () => {
    assertBody(await api.request('/mystery-boxes/unique/BOX-test-one?id='), 200, ok('SUCCESS'));
  });

  test('GET /mystery-boxes/:id?id= answers 200 SUCCESS', async () => {
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxOne}?id=`, { cookie: admin.cookie }), 200, ok('SUCCESS'));
  });

  test('DELETE /mystery-boxes/:id with body { id: "" } answers 200 SUCCESS and deletes nothing', async () => {
    assertBody(await api.request(`/mystery-boxes/${storeIds.boxOne}`, { method: 'DELETE', body: { id: '' }, cookie: admin.cookie }), 200, ok('SUCCESS'));
    assert.equal((await Box().findById(storeIds.boxOne)).isDeleted, false);
  });
});
