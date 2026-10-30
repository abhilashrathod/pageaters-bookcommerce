const mongoose = require('mongoose');
const { toArray } = require('lodash');

const { models } = require('../constants');
const enums = require('../constants/enums');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber, getId, arrayDifference } = require('../helpers/utils.helper');
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

/**
 * One page of live store books of a type (default `book`), list fields, with author and categories.
 * Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit?, sortBy?, sortOrder?, type? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listBooks = ({ page, limit, sortBy, sortOrder, type }) => {
  if (sortBy && !SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  return Book.paginate(
    { isDeleted: false, type: type || enums.PRODUCT_TYPES.BOOK },
    {
      page,
      limit,
      sort: { [sortBy]: sortOrder },
      select: `title bookId ISBN author inventory poster images tags price weight popularity editorsPick newRelease preOrder currentDiscount bestSeller`,
      populate: [
        { path: 'author', select: 'name intro avatar' },
        { path: 'categories', select: '_id categoryId title' },
      ],
    },
  );
};

/**
 * Creates a store book; adds one to each of its categories' `numberOfBooks`, adds it to its author's books and
 * lists it on each related book.
 * Legacy: without `categories` or `relatedBooks`, or with an unknown category or author, the book is created and
 * then the call fails (500).
 * @param {object} fields The book fields (see pickBookFields) plus `author`.
 * @returns {Promise<object>} The new book document.
 */
const createBook = async (fields) => {
  const { author, categories, relatedBooks } = fields;
  const bookRes = await Book.create({ bookId: `BK-${generateRandomNumber(10)}`, author, ...pickBookFields(fields) });

  for (const category of categories) {
    const categoryRes = await Category.findOne({ _id: category, isDeleted: false });
    categoryRes.numberOfBooks = Number(categoryRes.numberOfBooks) + 1;
    await categoryRes.save();
  }

  if (author) {
    const authorRes = await Author.findOne({ _id: author, isDeleted: false });
    authorRes.books.push(bookRes._id);
    await authorRes.save();
  }

  await addBackLinks(Book, relatedBooks, 'relatedBooks', bookRes._id);

  return bookRes;
};

/**
 * Updates a live store book (not its author) and lists it on any related book that doesn't list it yet.
 * Legacy (fixed in the legacy-bugs step): every category in the symmetric difference between the old and new
 * category lists — added or removed — gets one more `numberOfBooks`, saved without awaiting; without `categories`
 * or `relatedBooks` the call fails (500).
 * @param {string} id
 * @param {object} fields The book fields (see pickBookFields).
 * @returns {Promise<object>} The updated book.
 * @throws {AppError} BOOK_NOT_EXIST (400).
 */
const updateBook = async (id, fields) => {
  const { categories, relatedBooks } = fields;
  const book = await Book.findOne({ _id: id, isDeleted: false });
  if (!book) throw new AppError('BOOK_NOT_EXIST');

  for (const category of arrayDifference(toArray(book.categories), categories)) {
    const categoryRes = await Category.findOne({ _id: category, isDeleted: false });
    categoryRes.numberOfBooks = Number(categoryRes.numberOfBooks) + 1;
    void categoryRes.save();
  }

  await addBackLinks(Book, relatedBooks, 'relatedBooks', book._id);

  return Book.findOneAndUpdate({ _id: id }, { $set: pickBookFields(fields) }, { new: true });
};

/**
 * Searches live store books by title (lunr prefix search on `q`), at most 10, with the author's name.
 * @param {object | undefined} booksIndex The lunr index (`app.booksIndex`).
 * @param {string | undefined} q
 * @returns {Promise<object[]>} [] before the index exists or without `q`.
 */
const searchBooks = async (booksIndex, q) => {
  if (!booksIndex || !q) return [];

  const lunrIdArray = booksIndex.search(`${q}*`).map(({ ref }) => getId(ref));
  return Book.find({ _id: mongoose.trusted({ $in: lunrIdArray }), isDeleted: false })
    .select('title ISBN bookId author poster weight price popularity inventory editorsPick newRelease preOrder currentDiscount bestSeller')
    .limit(10)
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
