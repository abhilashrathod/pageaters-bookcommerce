const mongoose = require('mongoose');

const { fixtureId } = require('./ids');

const { PRODUCT_TYPES } = require('../../../src/constants/enums');

// Small, hand-written, obviously fake catalog fixtures in the shape the seed loads. Never copy from seed/data or
// the data dump (AGENTS.md §7): names say "Test", contacts use example.com and 90000000xx numbers, ISBNs start 999.
// Fixed ids so tests can refer to them; loadCatalog() inserts fresh copies, so tests may mutate what they get.

const id = fixtureId('catalog');

const ids = {
  authorA: id(0xa1),
  authorB: id(0xa2),
  categoryFiction: id(0xc1),
  bookOne: id(0xb1),
  bookTwo: id(0xb2),
  bookDeleted: id(0xb3),
};

const authors = () => [
  { _id: ids.authorA, authorId: 'test-author-a', name: 'Test Author A', intro: 'A fictional author for tests.' },
  { _id: ids.authorB, authorId: 'test-author-b', name: 'Test Author B', intro: 'Another fictional author.' },
];

const categories = () => [
  { _id: ids.categoryFiction, categoryId: 'test-fiction', title: 'Test Fiction', numberOfBooks: 2 },
];

const book = (overrides) => ({
  type: PRODUCT_TYPES.BOOK,
  language: 'English',
  pages: 200,
  poster: 'https://images.example.com/test-cover.png',
  price: 499,
  currentDiscount: 10,
  inventory: 25,
  popularity: 1,
  categories: [ids.categoryFiction],
  ...overrides,
});

const books = () => [
  book({ _id: ids.bookOne, bookId: 'test-book-one', title: 'Test Book One', ISBN: '9990000000001', author: ids.authorA }),
  book({ _id: ids.bookTwo, bookId: 'test-book-two', title: 'Test Book Two', ISBN: '9990000000002', author: ids.authorB, bestSeller: true }),
  book({ _id: ids.bookDeleted, bookId: 'test-book-deleted', title: 'Test Book Deleted', ISBN: '9990000000003', author: ids.authorA, isDeleted: true }),
];

/** Inserts the fake authors, categories and books through the app's own models. */
const loadCatalog = async () => {
  const model = (name) => mongoose.model(name);
  await model('author').insertMany(authors());
  await model('category').insertMany(categories());
  await model('storeBook').insertMany(books());
  return ids;
};

module.exports = { ids, loadCatalog };
