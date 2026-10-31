const mongoose = require('mongoose');
const { BookListFlag } = require('@pageaters/shared');

const { models } = require('../constants');
const enums = require('../constants/enums');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { pageOptions } = require('../helpers/paging.helper');
const { SEARCH_MAX_TIME_MS, SEARCH_RESULT_LIMIT, wordPrefixFilter } = require('../helpers/search-pattern.helper');
const { addBackLinks } = require('./catalog-links.service');

// Store books (the products): public list, detail and search; admin create/update/delete with their side effects
// on category counts, the author's book list and the two-way related-record links.
//
// `wholeSalePriceHistory` (business-sensitive) is `select: false` in the model, so no read here sends it, and
// create/update never take it from the request (it isn't in pickBookFields).

const Book = mongoose.model(models.STORE_BOOK);
const Category = mongoose.model(models.CATEGORY);
const Author = mongoose.model(models.AUTHOR);
const Bundle = mongoose.model(models.BUNDLE);
const Collection = mongoose.model(models.COLLECTION);

const SORTABLE = ['title', 'createdAt', 'popularity', 'priority', 'currentDiscount'];
const RELATED_BOOK_FIELDS = `_id title bookId ISBN author inventory poster price popularity editorsPick newRelease preOrder currentDiscount bestSeller`;
const RELATED_POPULATE = [
  { path: 'relatedBundles', select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice' },
  { path: 'categories', select: '_id categoryId title' },
  { path: 'relatedCollections', select: '_id collectionId title poster books', populate: { path: 'books', select: 'title poster' } },
];
const AUTHOR_POPULATE = { path: 'author', select: '_id authorId name avatar' };

// Fields an admin sets on create and update (create also takes `author`).
const pickBookFields = (fields) => {
  const { type, title, tagline, eyebrow, description, tags, message, language, pages, version, readingLevel, popularity } = fields;
  const { availability, dimensions, weight, categories, relatedCollections, relatedBooks, relatedBundles } = fields;
  const { ISBN, publicationYear, publisher, editorsPick, bestSeller, newRelease, preOrder, poster, images } = fields;
  const { inventory, currentDiscount, price, rentPrice, membersPrice, membersRentPrice } = fields;
  return {
    type,
    title,
    tagline,
    eyebrow,
    description,
    tags,
    message,
    language,
    pages,
    version,
    readingLevel,
    popularity,
    availability,
    dimensions,
    weight,
    categories,
    relatedCollections,
    relatedBooks,
    relatedBundles,
    ISBN,
    publicationYear,
    publisher,
    editorsPick,
    bestSeller,
    newRelease,
    preOrder,
    poster,
    images,
    inventory,
    currentDiscount,
    price,
    rentPrice,
    membersPrice,
    membersRentPrice,
  };
};

// Adds one to `numberOfBooks` of each live category in `added` and takes one off each live category in `removed`
// (never below 0). Unknown and soft-deleted categories are skipped.
const countBooksIn = async ({ added = [], removed = [] }) => {
  if (added.length) {
    await Category.updateMany({ _id: mongoose.trusted({ $in: added }), isDeleted: false }, { $inc: { numberOfBooks: 1 } });
  }
  if (removed.length) {
    await Category.updateMany(
      { _id: mongoose.trusted({ $in: removed }), isDeleted: false, numberOfBooks: mongoose.trusted({ $gt: 0 }) },
      { $inc: { numberOfBooks: -1 } },
    );
  }
};

// The ids in `next` that `current` doesn't have, as strings, once each.
const idsNotIn = (next, current) => {
  const have = new Set(current.map(String));
  return [...new Set(next.map(String))].filter((id) => !have.has(id));
};

const LIST_FLAGS = Object.values(BookListFlag);

/**
 * One page of live store books of a type (default `book`), list fields, with author and categories; `list` keeps
 * only books with that flag (bestSeller, editorsPick, newRelease, preOrder). Paging defaults: helpers/paging.helper.js.
 * @param {{ page?, limit?, sortBy?, sortOrder?, type?, list? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400), INVALID_PAGING (400), INVALID_REQUEST (400) for another `list`.
 */
const listBooks = ({ type, list, ...params }) => {
  if (list !== undefined && !LIST_FLAGS.includes(list)) throw new AppError('INVALID_REQUEST');
  return Book.paginate(
    { isDeleted: false, type: type || enums.PRODUCT_TYPES.BOOK, ...(list && { [list]: true }) },
    {
      ...pageOptions(params, { sortable: SORTABLE }),
      select: `title bookId ISBN author inventory poster images tags price weight popularity editorsPick newRelease preOrder currentDiscount bestSeller`,
      populate: [
        { path: 'author', select: 'name intro avatar' },
        { path: 'categories', select: '_id categoryId title' },
      ],
    },
  );
};

/**
 * Creates a store book; adds one to each of its live categories' `numberOfBooks`, adds it to its author's books and
 * lists it on each related book. A list left out is empty.
 * @param {object} fields The book fields (see pickBookFields) plus `author`.
 * @returns {Promise<object>} The new book document.
 * @throws {AppError} AUTHOR_NOT_EXIST (400) for an unknown or deleted author, INVALID_ID (400) for a malformed one
 *   (nothing is written in either case).
 */
const createBook = async (fields) => {
  const { author, categories = [], relatedBooks } = fields;
  if (author && !(await Author.exists({ _id: author, isDeleted: false }))) throw new AppError('AUTHOR_NOT_EXIST');
  const bookRes = await Book.create({ bookId: `BK-${generateRandomNumber(10)}`, author, ...pickBookFields(fields) });

  await countBooksIn({ added: idsNotIn(categories, []) });

  if (author) {
    const authorRes = await Author.findOne({ _id: author, isDeleted: false });
    authorRes.books.push(bookRes._id);
    await authorRes.save();
  }

  await addBackLinks(Book, relatedBooks, 'relatedBooks', bookRes._id);

  return bookRes;
};

/**
 * Updates a live store book (not its author) and lists it on any related book that doesn't list it yet. A field
 * left out keeps its value (Mongoose drops undefined keys from `$set`). When `categories` is given, each category
 * added counts one more book and each one removed one fewer.
 * @param {string} id
 * @param {object} fields The book fields (see pickBookFields).
 * @returns {Promise<object>} The updated book.
 * @throws {AppError} BOOK_NOT_EXIST (400).
 */
const updateBook = async (id, fields) => {
  const { categories, relatedBooks } = fields;
  const book = await Book.findOne({ _id: id, isDeleted: false });
  if (!book) throw new AppError('BOOK_NOT_EXIST');

  await addBackLinks(Book, relatedBooks, 'relatedBooks', book._id);

  const updated = await Book.findOneAndUpdate({ _id: id }, { $set: pickBookFields(fields) }, { new: true });

  if (categories) {
    await countBooksIn({ added: idsNotIn(categories, book.categories), removed: idsNotIn(book.categories, categories) });
  }

  return updated;
};

/**
 * Searches live store books by title (word-prefix search on `q`, helpers/search-pattern.helper.js): the first 10,
 * most popular first (then oldest first), with the author's name.
 * @param {unknown} q
 * @returns {Promise<object[]>} [] without `q`.
 */
const searchBooks = async (q) => {
  const filter = wordPrefixFilter(q, ['title']);
  if (!filter) return [];

  return Book.find({ ...filter, isDeleted: false })
    .select('title ISBN bookId author poster weight price popularity inventory editorsPick newRelease preOrder currentDiscount bestSeller')
    .sort({ popularity: -1, _id: 1 })
    .limit(SEARCH_RESULT_LIMIT)
    .maxTimeMS(SEARCH_MAX_TIME_MS)
    .populate({ path: 'author', select: 'name' });
};

/**
 * A live store book by id, with author, related books/bundles/collections and categories (admin).
 * @param {string} id
 * @returns {Promise<object>} The whole document except `wholeSalePriceHistory` (select: false).
 * @throws {AppError} BOOK_NOT_EXIST (400).
 */
const getBookById = async (id) => {
  const book = await Book.findOne({ _id: id, isDeleted: false }).populate([
    AUTHOR_POPULATE,
    { path: 'relatedBooks', select: RELATED_BOOK_FIELDS },
    ...RELATED_POPULATE,
  ]);
  if (!book) throw new AppError('BOOK_NOT_EXIST');
  return book;
};

/**
 * A live store book by its public `bookId`, populated as getBookById plus the related books' author and categories.
 * @param {string} bookId
 * @returns {Promise<object>} The whole document except `wholeSalePriceHistory` (select: false); a public route.
 * @throws {AppError} BOOK_NOT_EXIST (400).
 */
const getBookByBookId = async (bookId) => {
  const book = await Book.findOne({ bookId, isDeleted: false }).populate([
    AUTHOR_POPULATE,
    {
      path: 'relatedBooks',
      select: RELATED_BOOK_FIELDS,
      populate: [
        { path: 'author', select: '_id name' },
        { path: 'categories', select: '_id categoryId title' },
      ],
    },
    ...RELATED_POPULATE,
  ]);
  if (!book) throw new AppError('BOOK_NOT_EXIST');
  return book;
};

/**
 * Soft-deletes a live store book and removes it from related books, bundles and collections (category counts and
 * the author's book list are left as they are).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} BOOK_NOT_EXIST (400).
 */
const deleteBook = async (id) => {
  const book = await Book.findOne({ _id: id, isDeleted: false });
  if (!book) throw new AppError('BOOK_NOT_EXIST');

  book.isDeleted = true;
  book.deletedAt = new Date();

  await Book.updateMany({ relatedBooks: id }, { $pull: { relatedBooks: id } });
  await Bundle.updateMany({ bundledBooks: id }, { $pull: { bundledBooks: id } });
  await Collection.updateMany({ books: id }, { $pull: { books: id } });

  await book.save();
};

module.exports = { createBook, deleteBook, getBookByBookId, getBookById, listBooks, searchBooks, updateBook };
