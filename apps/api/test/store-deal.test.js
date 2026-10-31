const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, catalogState, createUser, envelopes, ids, loadCatalog, paged, startTestApp } = require('./helpers');
const { loadStore, storeIds } = require('./helpers/fixtures/store');

// /api/v1/deals over HTTP: public list and detail (product sets with their books' prices and discounts); admin
// CRUD. Written against the legacy controller (storeDeal.contoller.js) before the service refactor.

const { ok, okString, badRequest, badRequestObject, serverError } = envelopes;

const Deal = () => mongoose.model('store_deals');

const LIST_FIELDS = 'ctaLink ctaText dealId poster title _id';

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

describe('auth', () => {
  test('admin routes need an ADMIN session', async () => {
    for (const route of [
      ['GET', `/deals/${storeIds.dealOne}`],
      ['POST', '/deals', { title: 'Test New' }],
      ['PUT', `/deals/${storeIds.dealOne}`, { title: 'Test New' }],
      ['DELETE', `/deals/${storeIds.dealOne}`],
    ]) {
      await assertGuarded(api, route, { admin: true, userCookie: shopper.cookie });
    }
  });
});

describe('GET /deals', () => {
  const firstPage = (docs, limit = 10) =>
    paged(docs, { totalDocs: docs.length, limit, totalPages: 1, page: 1, pagingCounter: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null });

  test('lists active deals with the page set (the legacy answered page, offset and pagingCounter null)', async () => {
    const docs = asJson(await Deal().find({ isActive: true }).select(LIST_FIELDS).sort({ priority: 1 }));
    assertBody(await api.request('/deals?page=1&limit=10&sortBy=priority&sortOrder=asc'), 200, ok('STORE_DEAL_LIST_SUCCESS', firstPage(docs)));
  });

  test('without page/limit/sort answers page 1 of 10 by priority, lowest first (the legacy answered no documents)', async () => {
    const docs = asJson(await Deal().find({ isActive: true }).select(LIST_FIELDS).sort({ priority: 1, _id: 1 }));
    assert.deepEqual(docs.map((d) => d._id), [String(storeIds.dealTwo), String(storeIds.dealOne)]);
    assertBody(await api.request('/deals'), 200, ok('STORE_DEAL_LIST_SUCCESS', firstPage(docs)));
    const byTitle = await api.request('/deals?sortBy=title&sortOrder=desc');
    assert.deepEqual(byTitle.body.data.docs.map((d) => d.title), ['Test Deal Two', 'Test Deal One']);
  });

  test('filters by category; pages by page number and ignores an offset', async () => {
    const res = await api.request(`/deals?page=1&limit=10&category=${ids.categoryFiction}`);
    assert.deepEqual(res.body.data.docs.map((d) => d._id), [String(storeIds.dealOne)]);

    const second = await api.request('/deals?page=2&limit=1&offset=5');
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.data.docs.map((d) => d._id), [String(storeIds.dealOne)]);
    assert.equal(second.body.data.page, 2);
    assert.equal(second.body.data.pagingCounter, 2);
    assert.equal('offset' in second.body.data, false);
  });

  test('refuses a sort field outside the allowlist and a bad page or limit', async () => {
    assertBody(await api.request('/deals?sortBy=ctaText'), 400, badRequest('SORTING_NOT_ALLOWED'));
    for (const query of ['page=0', 'limit=1001', 'limit=x', 'sortOrder=up']) {
      assertBody(await api.request(`/deals?${query}`), 400, badRequest('INVALID_PAGING'));
    }
  });

  test('another sort field without an order sorts newest first, like every other list', async () => {
    // createdAt is immutable through Mongoose, so set it on the collection.
    await Deal().collection.updateOne({ _id: storeIds.dealOne }, { $set: { createdAt: new Date('2030-01-01') } });
    const res = await api.request('/deals?sortBy=createdAt');
    assert.deepEqual(res.body.data.docs.map((d) => d._id), [String(storeIds.dealOne), String(storeIds.dealTwo)]);
    const oldest = await api.request('/deals?sortBy=createdAt&sortOrder=asc');
    assert.deepEqual(oldest.body.data.docs.map((d) => d._id), [String(storeIds.dealTwo), String(storeIds.dealOne)]);
  });

  test('refuses a category that is not an id (was a CastError 500); empty means no filter', async () => {
    for (const query of ['category=nope', `category=${ids.categoryFiction}0`, `category=${ids.categoryFiction}&category=${ids.categoryFiction}`]) {
      assertBody(await api.request(`/deals?${query}`), 400, badRequestObject('INVALID_ID'));
    }
    const all = await api.request('/deals?category=');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.totalDocs, 2);
  });
});

describe('detail', () => {
  test('public detail by dealId sorts the sets and their books by priority, with book prices and discounts', async () => {
    const res = await api.request('/deals/unique/DE-test-one');
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['statusCode', 'status', 'message', 'data']);
    assert.equal(res.body.status, 'STORE_DEAL_LIST_SUCCESS');
    const deal = res.body.data;
    assert.deepEqual(deal.productSets.map((s) => s.set._id), [String(storeIds.setOne), String(storeIds.setTwo)]);
    assert.deepEqual(deal.productSets[0].set.products.map((p) => [p.priority, p.product.bookId, p.product.price, p.product.currentDiscount]), [
      [1, 'test-book-one', 499, 10],
      [2, 'test-book-two', 499, 10],
    ]);
    assert.deepEqual(Object.keys(deal.productSets[0].set.products[0].product), [
      '_id',
      'bookId',
      'title',
      'author',
      'ISBN',
      'editorsPick',
      'bestSeller',
      'newRelease',
      'preOrder',
      'poster',
      'inventory',
      'currentDiscount',
      'popularity',
      'price',
    ]);
    assert.deepEqual(deal.categories, [{ _id: String(ids.categoryFiction), categoryId: 'test-fiction', title: 'Test Fiction', numberOfBooks: 2, thumbnail: '' }]);
    assertBody(await api.request('/deals/unique/DE-test-inactive'), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });

  test('admin detail answers with the deal message keys (the legacy used the author ones), books with their author name', async () => {
    const res = await api.request(`/deals/${storeIds.dealOne}`, { cookie: admin.cookie });
    const books = res.body.data.productSets.flatMap(({ set }) => set.products.map(({ product }) => product));
    assert.deepEqual(
      books.map(({ author }) => author),
      [
        { _id: String(ids.authorA), name: 'Test Author A' },
        { _id: String(ids.authorB), name: 'Test Author B' },
        { _id: String(ids.authorB), name: 'Test Author B' },
      ],
    );
    // Otherwise the public detail (was: books carried only their author id, the populate path was wrong).
    for (const book of books) book.author = book.author._id;
    const publicRes = await api.request('/deals/unique/DE-test-one');
    assertBody(res, 200, ok('STORE_DEAL_LIST_SUCCESS', publicRes.body.data));
    assertBody(await api.request(`/deals/${storeIds.dealInactive}`, { cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });

  test('skips a product set deleted since (was: 500)', async () => {
    await mongoose.model('product_sets').deleteOne({ _id: storeIds.setTwo });
    for (const res of [await api.request('/deals/unique/DE-test-one'), await api.request(`/deals/${storeIds.dealOne}`, { cookie: admin.cookie })]) {
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.productSets.map((s) => s.set._id), [String(storeIds.setOne)]);
    }
  });

  test('skips a product set deactivated since', async () => {
    await mongoose.model('product_sets').updateOne({ _id: storeIds.setOne }, { isActive: false });
    const res = await api.request('/deals/unique/DE-test-one');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.productSets.map((s) => s.set._id), [String(storeIds.setTwo)]);
  });
});

describe('admin writes', () => {
  test('POST creates a deal', async () => {
    const body = { title: 'Test Deal New', poster: 'p.png', ctaLink: '/x', ctaText: 'Go', priority: 3, categories: [String(ids.categoryFiction)], productSets: [{ priority: 1, set: String(storeIds.setOne) }] };
    const res = await api.request('/deals', { method: 'POST', body, cookie: admin.cookie });
    const deal = await Deal().findOne({ title: 'Test Deal New' });
    assertBody(res, 200, ok('STORE_DEAL_CREATE_SUCCESS', asCreated(deal)));
    assert.match(deal.dealId, /^DE-\d{10}$/);
  });

  test('PUT updates an active deal', async () => {
    const res = await api.request(`/deals/${storeIds.dealTwo}`, { method: 'PUT', body: { title: 'Test Deal Two B', priority: 7 }, cookie: admin.cookie });
    assertBody(res, 200, ok('STORE_DEAL_UPDATE_SUCCESS', asJson(await Deal().findById(storeIds.dealTwo))));
    assert.equal((await Deal().findById(storeIds.dealTwo)).priority, 7);
    assertBody(await api.request(`/deals/${storeIds.dealInactive}`, { method: 'PUT', body: {}, cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });

  test('DELETE deactivates an active deal, written before the answer', async () => {
    assertBody(await api.request(`/deals/${storeIds.dealTwo}`, { method: 'DELETE', cookie: admin.cookie }), 200, okString('STORE_DEAL_DELETE_SUCCESS'));
    const deal = await Deal().findById(storeIds.dealTwo);
    assert.equal(deal.isActive, false);
    assert.ok(deal.deactivatedAt);
    assertBody(await api.request(`/deals/${storeIds.dealTwo}`, { method: 'DELETE', cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
  });
});

describe('deal writes: failures and references', () => {
  test('refuses a product set that is missing or inactive on create and update, before writing anything', async () => {
    const before = await catalogState();
    for (const set of [storeIds.setInactive, new mongoose.Types.ObjectId(), { _id: String(storeIds.setInactive), title: 'Test Set Inactive' }]) {
      const productSets = [
        { set: String(storeIds.setOne), priority: 1 },
        { set, priority: 2 },
      ];
      for (const [method, path] of [
        ['POST', '/deals'],
        ['PUT', `/deals/${storeIds.dealOne}`],
      ]) {
        assertBody(await api.request(path, { method, body: { title: 'Test Deal Bad', productSets }, cookie: admin.cookie }), 400, badRequest('PRODUCT_SET_NOT_EXIST'));
      }
    }
    assert.deepEqual(await catalogState(), before);
    // The same set twice is one set, and it is active.
    const twice = [String(storeIds.setOne), String(storeIds.setOne)].map((set, index) => ({ set, priority: index + 1 }));
    assert.equal((await api.request(`/deals/${storeIds.dealTwo}`, { method: 'PUT', body: { productSets: twice }, cookie: admin.cookie })).status, 200);
  });

  test('PUT on an inactive deal writes nothing', async () => {
    const before = await catalogState();
    assertBody(await api.request(`/deals/${storeIds.dealInactive}`, { method: 'PUT', body: { title: 'Changed' }, cookie: admin.cookie }), 400, badRequest('STORE_DEAL_NOT_EXIST'));
    assert.deepEqual(await catalogState(), before);
  });

  test('DELETE answers 500 when the deactivation write fails (the legacy answered 200 and lost the error)', async (t) => {
    t.mock.method(Deal().prototype, 'save', async () => {
      throw new Error('write failed');
    });
    assertBody(await api.request(`/deals/${storeIds.dealTwo}`, { method: 'DELETE', cookie: admin.cookie }), 500, serverError);
    t.mock.restoreAll();
    assert.equal((await Deal().findById(storeIds.dealTwo)).isActive, true);
  });

  test('PUT keeps a field left out (Mongoose drops undefined keys; nothing is written as null)', async () => {
    await api.request(`/deals/${storeIds.dealOne}`, { method: 'PUT', body: { title: 'Test Deal One B' }, cookie: admin.cookie });
    const deal = await Deal().findById(storeIds.dealOne).lean();
    assert.equal(deal.title, 'Test Deal One B');
    assert.equal(deal.description, 'A fictional deal.');
    assert.deepEqual(deal.categories.map(String), [String(ids.categoryFiction)]);
    assert.equal(deal.productSets.length, 2);
  });

  test('refuses a reference that is not an id on create and update, before writing anything', async () => {
    const before = await catalogState();
    for (const [body, code] of [
      [{ title: 'Test Deal Bad', categories: String(ids.categoryFiction) }, 'INVALID_REQUEST'],
      [{ title: 'Test Deal Bad', categories: ['nope'] }, 'INVALID_ID'],
      [{ title: 'Test Deal Bad', categories: [{ $gt: '' }] }, 'INVALID_REQUEST'],
      [{ title: 'Test Deal Bad', productSets: [{ set: 'nope', priority: 1 }] }, 'INVALID_ID'],
      [{ title: 'Test Deal Bad', productSets: [{ set: { _id: 'nope', title: 'Test Set One' }, priority: 1 }] }, 'INVALID_ID'],
      [{ title: 'Test Deal Bad', productSets: [{ set: { title: 'Test Set One' }, priority: 1 }] }, 'INVALID_ID'],
      [{ title: 'Test Deal Bad', productSets: [String(storeIds.setOne)] }, 'INVALID_REQUEST'],
      [{ title: 'Test Deal Bad', productSets: null }, 'INVALID_REQUEST'],
    ]) {
      for (const [method, path] of [
        ['POST', '/deals'],
        ['PUT', `/deals/${storeIds.dealOne}`],
      ]) {
        assertBody(await api.request(path, { method, body, cookie: admin.cookie }), 400, badRequestObject(code));
      }
    }
    assert.deepEqual(await catalogState(), before);
  });

  test('the legacy admin sends each set as the populated set (from the detail or the list): only its _id is stored', async () => {
    // As update-deal.component.ts builds it: the detail's populated sets, categories mapped to ids, plus its `code`.
    const detail = (await api.request(`/deals/${storeIds.dealOne}`, { cookie: admin.cookie })).body.data;
    const listed = (await api.request('/product-sets?page=1&limit=1000', { cookie: admin.cookie })).body.data.docs;
    const twoSet = listed.find((set) => set._id === String(storeIds.setTwo));
    const sets = [detail.productSets[0].set, twoSet];
    const body = {
      title: 'Test Deal One B',
      description: detail.description,
      code: '',
      poster: detail.poster,
      ctaText: detail.ctaText,
      ctaLink: detail.ctaLink,
      priority: 4,
      categories: detail.categories.map((category) => category._id),
      productSets: sets.map((set, index) => ({ set, priority: index + 1 })),
    };
    const res = await api.request(`/deals/${storeIds.dealOne}`, { method: 'PUT', body, cookie: admin.cookie });
    assertBody(res, 200, ok('STORE_DEAL_UPDATE_SUCCESS', asJson(await Deal().findById(storeIds.dealOne))));
    const stored = (await Deal().findById(storeIds.dealOne).lean()).productSets;
    assert.deepEqual(
      stored.map(({ set, priority }) => [set, priority]),
      [
        [new mongoose.Types.ObjectId(String(storeIds.setOne)), 1],
        [new mongoose.Types.ObjectId(String(storeIds.setTwo)), 2],
      ],
    );
    assert.deepEqual(Object.keys(stored[0]).sort(), ['_id', 'priority', 'set']);

    const created = await api.request('/deals', { method: 'POST', body: { ...body, title: 'Test Deal Legacy' }, cookie: admin.cookie });
    assert.equal(created.status, 200);
    const deal = await Deal().findOne({ title: 'Test Deal Legacy' }).lean();
    assert.deepEqual(
      deal.productSets.map(({ set }) => String(set)),
      [String(storeIds.setOne), String(storeIds.setTwo)],
    );
  });
});
