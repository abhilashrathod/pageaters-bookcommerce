const mongoose = require('mongoose');

const { fixtureId } = require('./ids');
const { ids: catalogIds } = require('./catalog');

// Fixtures for the 4d tests (catalog and the rest): bundles, collections, deals, add-ons,
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

module.exports = { addressFields, loadStore, storeIds };
