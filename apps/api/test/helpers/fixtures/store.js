const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { fixtureId } = require('./ids');
const { ids: catalogIds } = require('./catalog');
const t = require('../../../src/locales/en.json');

// Fixtures and envelope helpers for the 4d tests (catalog and the rest): bundles, collections, deals, add-ons,
// mystery boxes, product sets, addresses, stock alerts, store credit. Ids come from the 'store' range; the shared
// catalog (authors, categories, books) comes from fixtures/catalog.js. Fake data only (AGENTS.md §7): "Test" names,
// example.com emails, 90000000xx numbers, no wholesale prices.

const id = fixtureId('store');

const storeIds = {
  bundleOne: id(0x101),
  bundleTwo: id(0x102),
  bundleDeleted: id(0x103),
  collectionOne: id(0x201),
  collectionTwo: id(0x202),
  collectionDeleted: id(0x203),
  setOne: id(0x301),
  setTwo: id(0x302),
  setInactive: id(0x303),
  dealOne: id(0x401),
  dealTwo: id(0x402),
  dealInactive: id(0x403),
  addOnBookmark: id(0x501),
  addOnWrap: id(0x502),
  addOnDeleted: id(0x503),
  boxOne: id(0x601),
  boxTwo: id(0x602),
  boxDeleted: id(0x603),
};

const { authorA, bookOne, bookTwo, categoryFiction } = catalogIds;

const bundles = () => [
  {
    _id: storeIds.bundleOne,
    bundleId: 'BL-test-one',
    title: 'Test Bundle One',
    description: 'A fictional bundle.',
    tags: ['test-pair'],
    poster: 'test-bundle.png',
    bundledBooks: [bookOne, bookTwo],
    categories: [categoryFiction],
    relatedBundles: [storeIds.bundleTwo],
    relatedCollections: [storeIds.collectionOne],
    currentDiscount: 5,
    price: 899,
    priority: 2,
    popularity: 3,
  },
  { _id: storeIds.bundleTwo, bundleId: 'BL-test-two', title: 'Test Bundle Two', tags: ['test-solo'], price: 399, priority: 1, popularity: 9 },
  { _id: storeIds.bundleDeleted, bundleId: 'BL-test-deleted', title: 'Test Bundle Deleted', tags: [], isDeleted: true },
];

const collections = () => [
  {
    _id: storeIds.collectionOne,
    collectionId: 'CL-test-one',
    title: 'Test Collection One',
    description: 'A fictional collection.',
    tags: ['test-shelf'],
    poster: 'test-collection.png',
    books: [bookOne],
    relatedCategories: [categoryFiction],
    featuredAuthors: [authorA],
    relatedCollections: [storeIds.collectionTwo],
    priority: 1,
    popularity: 4,
  },
  { _id: storeIds.collectionTwo, collectionId: 'CL-test-two', title: 'Test Collection Two', tags: [], books: [bookTwo], priority: 2, popularity: 1 },
  { _id: storeIds.collectionDeleted, collectionId: 'CL-test-deleted', title: 'Test Collection Deleted', tags: [], isDeleted: true },
];

const productSets = () => [
  {
    _id: storeIds.setOne,
    setId: 'SET-test-one',
    slug: 'test-set-one',
    title: 'Test Set One',
    description: 'A fictional product set.',
    products: [
      { _id: id(0x311), priority: 2, product: bookTwo },
      { _id: id(0x312), priority: 1, product: bookOne },
    ],
    categories: [categoryFiction],
  },
  { _id: storeIds.setTwo, setId: 'SET-test-two', slug: 'test-set-two', title: 'Test Set Two', products: [{ _id: id(0x321), priority: 1, product: bookTwo }] },
  { _id: storeIds.setInactive, setId: 'SET-test-inactive', slug: 'test-set-inactive', title: 'Test Set Inactive', isActive: false },
];

const deals = () => [
  {
    _id: storeIds.dealOne,
    dealId: 'DE-test-one',
    title: 'Test Deal One',
    description: 'A fictional deal.',
    poster: 'test-deal.png',
    ctaLink: '/deals/test-one',
    ctaText: 'Shop the test deal',
    priority: 2,
    productSets: [
      { _id: id(0x411), priority: 2, set: storeIds.setTwo },
      { _id: id(0x412), priority: 1, set: storeIds.setOne },
    ],
    categories: [categoryFiction],
  },
  { _id: storeIds.dealTwo, dealId: 'DE-test-two', title: 'Test Deal Two', priority: 1 },
  { _id: storeIds.dealInactive, dealId: 'DE-test-inactive', title: 'Test Deal Inactive', isActive: false },
];

const addOns = () => [
  { _id: storeIds.addOnBookmark, addOnId: 'AO-test-bookmark', name: 'Test Bookmark', category: 'bookmark', price: 49, inventory: 10 },
  { _id: storeIds.addOnWrap, addOnId: 'AO-test-wrap', name: 'Test Gift Wrap', category: 'wrap', price: 29, inventory: 5 },
  { _id: storeIds.addOnDeleted, addOnId: 'AO-test-deleted', name: 'Test Deleted Add-on', category: 'bookmark', isDeleted: true },
];

const mysteryBoxes = () => [
  { _id: storeIds.boxOne, boxId: 'BOX-test-one', title: 'Test Box Three', books: 3, price: 999, weight: 900, tags: ['test'] },
  { _id: storeIds.boxTwo, boxId: 'BOX-test-two', title: 'Test Box One', books: 1, price: 399, weight: 300 },
  { _id: storeIds.boxDeleted, boxId: 'BOX-test-deleted', title: 'Test Box Deleted', books: 2, isDeleted: true },
];

/** Inserts the store fixtures (call loadCatalog() first: they reference its books, authors and category). */
const loadStore = async () => {
  const model = (name) => mongoose.model(name);
  await model('bundle').insertMany(bundles());
  await model('collection').insertMany(collections());
  await model('product_sets').insertMany(productSets());
  await model('store_deals').insertMany(deals());
  await model('add_on').insertMany(addOns());
  await model('mystery_box').insertMany(mysteryBoxes());
  return storeIds;
};

/** A fake address document for `userId` (not inserted). */
const addressFields = (overrides = {}) => ({
  fullName: 'Test Receiver',
  contactNo: '9000000099',
  email: 'receiver@example.com',
  city: 'Test City',
  state: 'Test State',
  pinCode: '999001',
  addressLine1: '1 Test Street',
  addressLine2: '',
  landmark: '',
  type: 'HOME',
  isDefault: false,
  ...overrides,
});

// Envelopes, written key by key as extendReq.middleware.js writes them; compare with assertBody (JSON text, so key
// order counts).
const envelopes = {
  ok: (status, data = {}) => ({ statusCode: 200, status, message: t[status], data }),
  // res.ok('KEY') (string form): `data` before `message`.
  okString: (status) => ({ statusCode: 200, status, data: {}, message: t[status] }),
  created: (message, data = {}) => ({ statusCode: 201, data, message: t[message] }),
  // res.error('KEY'): `error` before `message`.
  badRequest: (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} }),
  // res.error({ message, data }) and Joi failures: `message` before `error`.
  badRequestObject: (status, data = {}) => ({ statusCode: 400, status, message: t[status], error: t[status], data }),
  serverError: { statusCode: 500, status: 'SOME_ERROR_OCCURRED', message: t.SOME_ERROR_OCCURRED, error: t.SOME_ERROR_OCCURRED, data: {} },
  unauthorized: (key) => ({ statusCode: 401, status: 'UNAUTHORIZED', message: t[key], data: {}, error: t[key] }),
  forbidden: { statusCode: 403, status: 'FORBIDDEN', message: t.FORBIDDEN, data: {}, error: t.FORBIDDEN },
};

/** Asserts status and body; the body is compared as JSON text, so key order counts. */
const assertBody = (res, status, body) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};

/** A document as the API serialises it (toJSON, then through JSON). */
const asJson = (doc) => JSON.parse(JSON.stringify(doc));

/** A document as `Model.create()` returns it: its fields serialise before `_id`, then timestamps and `__v`. */
const asCreated = (doc) => {
  const { _id, createdAt, updatedAt, __v, ...fields } = asJson(doc);
  return { ...fields, _id, createdAt, updatedAt, __v };
};

/** Polls `check` until it returns a truthy value (for writes the legacy code doesn't await). */
const eventually = async (check, { timeout = 2000, interval = 20 } = {}) => {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await check();
    if (value || Date.now() > end) return value;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Stops the test app after a short pause: res.error / res.internalServerError write the request log (log_api)
 * without awaiting it, so a test that ends on an error response would otherwise write after the client closed.
 */
const stopApp = async (api) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.stop();
};

/**
 * Checks the auth guard of a route: no session → 401 NO_AUTH_HEADER, bad token → 401 INVALID_TOKEN and, for ADMIN
 * routes, a USER session → 403.
 * @param {Awaited<ReturnType<typeof import('./../app').startTestApp>>} api
 * @param {[string, string, unknown?]} route method, path, body
 * @param {{ admin?: boolean, userCookie?: string }} options
 */
const assertGuarded = async (api, [method, path, body], { admin = false, userCookie } = {}) => {
  assertBody(await api.request(path, { method, body }), 401, envelopes.unauthorized('NO_AUTH_HEADER'));
  assertBody(await api.request(path, { method, body, cookie: '_PID=not-a-jwt' }), 401, envelopes.unauthorized('INVALID_TOKEN'));
  if (admin) assertBody(await api.request(path, { method, body, cookie: userCookie }), 403, envelopes.forbidden);
};

/** The paginate envelope (mongoose-paginate-v2) for a page of `docs`. */
const paged = (docs, fields) => ({
  docs,
  totalDocs: fields.totalDocs,
  limit: fields.limit,
  totalPages: fields.totalPages,
  page: fields.page,
  pagingCounter: fields.pagingCounter,
  hasPrevPage: fields.hasPrevPage,
  hasNextPage: fields.hasNextPage,
  prevPage: fields.prevPage,
  nextPage: fields.nextPage,
});

module.exports = {
  addressFields,
  asCreated,
  asJson,
  assertBody,
  assertGuarded,
  envelopes,
  eventually,
  loadStore,
  paged,
  stopApp,
  storeIds,
};
