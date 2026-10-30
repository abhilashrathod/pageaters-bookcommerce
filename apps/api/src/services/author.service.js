const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { SEARCH_MAX_TIME_MS, SEARCH_RESULT_LIMIT, wordPrefixFilter } = require('../helpers/search-pattern.helper');

// Authors: public list, detail and search; admin create/update/delete. An author's `books` list and each book's
// `author` field are kept in step by create, update and delete.

const Author = mongoose.model(models.AUTHOR);
const Books = mongoose.model(models.STORE_BOOK);

const SORTABLE = ['name', 'createdAt', 'popularity', 'priority'];

/**
 * One page of live authors (list fields).
 * Legacy: without `limit` the page has no documents; `sortOrder` is passed through as given.
 * @param {{ page?: string, limit?: string, sortBy?: string, sortOrder?: string }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400) for a sort field outside the allowlist.
 */
const listAuthors = ({ page, limit, sortBy, sortOrder }) => {
  if (sortBy && !SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  return Author.paginate(
    { isDeleted: false },
    { page, limit, select: `name books authorId popularity isDeleted deletedAt`, sort: { [sortBy]: sortOrder } },
  );
};

/**
 * Creates an author and sets it as the author of `books`.
 * Legacy: without `books` the author is created and then the call fails (500).
 * @param {{ name?: string, intro?: string, avatar?: string, books: string[] }} fields
 * @returns {Promise<object>} The new author document.
 */
const createAuthor = async ({ name, intro, avatar, books }) => {
  const author = await Author.create({ authorId: `AU-${generateRandomNumber(10)}`, name, intro, avatar, books });

  if (books.length > 0) {
    await Books.updateMany({ _id: mongoose.trusted({ $in: books }) }, { $set: { author: author._id } }, { multi: true });
  }

  return author;
};

/**
 * Updates a live author and sets it as the author of `books` (books dropped from the list keep it).
 * Legacy: without `books` the author is updated and then the call fails (500).
 * @param {string} id
 * @param {{ name?: string, intro?: string, avatar?: string, books: string[] }} fields
 * @returns {Promise<object>} The updated author.
 * @throws {AppError} AUTHOR_NOT_EXIST (400).
 */
const updateAuthor = async (id, { name, intro, avatar, books }) => {
  const author = await Author.findOne({ _id: id, isDeleted: false });
  if (!author) throw new AppError('AUTHOR_NOT_EXIST');

  const authorRes = await Author.findOneAndUpdate({ _id: id }, { $set: { name, intro, avatar, books } }, { new: true });

  if (books.length > 0) {
    await Books.updateMany({ _id: mongoose.trusted({ $in: books }) }, { $set: { author: author._id } }, { multi: true });
  }

  return authorRes;
};

/**
 * Searches live authors by name and intro (word-prefix search on `q`, helpers/search-pattern.helper.js): the first
 * 10, most popular first (then oldest first).
 * @param {unknown} q
 * @returns {Promise<object[]>} Full author documents; [] without `q`.
 */
const searchAuthors = async (q) => {
  const filter = wordPrefixFilter(q, ['name', 'intro']);
  if (!filter) return [];

  return Author.find({ ...filter, isDeleted: false }).sort({ popularity: -1, _id: 1 }).limit(SEARCH_RESULT_LIMIT).maxTimeMS(SEARCH_MAX_TIME_MS);
};

/**
 * A live author by id, with its books' titles (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} AUTHOR_NOT_EXIST (400).
 */
const getAuthorById = async (id) => {
  const author = await Author.findOne({ _id: id, isDeleted: false }).populate({ path: 'books', select: '_id title' });
  if (!author) throw new AppError('AUTHOR_NOT_EXIST');
  return author;
};

/**
 * A live author by its public `authorId`, with its books' list fields.
 * @param {string} authorId
 * @returns {Promise<object>}
 * @throws {AppError} AUTHOR_NOT_EXIST (400).
 */
const getAuthorByAuthorId = async (authorId) => {
  const author = await Author.findOne({ authorId, isDeleted: false }).populate({
    path: 'books',
    select: 'title bookId ISBN author poster price popularity availability editorsPick inventory currentDiscount inventory newRelease preOrder bestSeller',
  });
  if (!author) throw new AppError('AUTHOR_NOT_EXIST');
  return author;
};

/**
 * Soft-deletes a live author, clears the `author` of the books in its list and empties the list.
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} AUTHOR_NOT_EXIST (400).
 */
const deleteAuthor = async (id) => {
  const author = await Author.findOne({ _id: id, isDeleted: false });
  if (!author) throw new AppError('AUTHOR_NOT_EXIST');

  author.isDeleted = true;
  author.deletedAt = new Date();

  if (author.books.length > 0) {
    await Books.updateMany({ _id: mongoose.trusted({ $in: author.books }) }, { $set: { author: null } }, { multi: true });
  }

  author.books = [];
  await author.save();
};

module.exports = { createAuthor, deleteAuthor, getAuthorByAuthorId, getAuthorById, listAuthors, searchAuthors, updateAuthor };
