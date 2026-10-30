const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { SEARCH_MAX_TIME_MS, SEARCH_RESULT_LIMIT, wordPrefixFilter } = require('../helpers/search-pattern.helper');
const { addBackLinks } = require('./catalog-links.service');

// Collections (curated lists of store books): public list, detail and search; admin create/update/delete. A
// collection is listed on its books' `relatedCollections` and on its related collections' `relatedCollections`.

const Collection = mongoose.model(models.COLLECTION);
const Book = mongoose.model(models.STORE_BOOK);

const SORTABLE = ['title', 'createdAt', 'popularity', 'priority'];
const LIST_POPULATE = {
  path: 'books',
  select: 'title bookId ISBN author inventory poster price weight popularity availability newRelease preOrder editorsPick currentDiscount bestSeller',
  populate: [
    { path: 'author', select: 'name intro avatar' },
    { path: 'categories', select: '_id categoryId title' },
  ],
};
const DETAIL_POPULATE = [
  { path: 'books', select: 'bookId title ISBN author inventory poster price popularity availability newRelease preOrder editorsPick currentDiscount bestSeller' },
  { path: 'relatedCategories', select: 'categoryId _id title numberOfBooks thumbnail' },
  { path: 'featuredAuthors', select: 'name avatar books authorId' },
  { path: 'relatedCollections', select: 'collectionId title tags poster books', populate: { path: 'books', select: 'title poster' } },
];

const linkCollection = async (collection, { books, relatedCollections }) => {
  await addBackLinks(Book, books, 'relatedCollections', collection._id);
  await addBackLinks(Collection, relatedCollections, 'relatedCollections', collection._id);
};

const findLive = async (query) => {
  const collection = await Collection.findOne({ ...query, isDeleted: false }).populate(DETAIL_POPULATE);
  if (!collection) throw new AppError('COLLECTION_NOT_EXIST');
  return collection;
};

/**
 * One page of live collections with their books populated, optionally in one related category.
 * Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit?, sortBy?, sortOrder?, category? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listCollections = ({ page, limit, sortBy, sortOrder, category }) => {
  const query = { isDeleted: false };
  if (category) query.relatedCategories = category;

  if (sortBy && !SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  return Collection.paginate(query, {
    page,
    limit,
    sort: { [sortBy]: sortOrder },
    select: `title collectionId tags poster priority popularity books`,
    populate: LIST_POPULATE,
  });
};

/**
 * Creates a collection and links it from its books and related collections.
 * Legacy: without `books` or `relatedCollections` the collection is created and then the call fails (500).
 * @param {object} fields title, description, tags, books, poster, relatedCollections, relatedCategories,
 *   featuredAuthors, priority, popularity.
 * @returns {Promise<object>} The new collection document.
 */
const createCollection = async (fields) => {
  const { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = fields;

  const collectionRes = await Collection.create({
    collectionId: `CL-${generateRandomNumber(10)}`,
    title,
    description,
    tags,
    poster,
    books,
    relatedCollections,
    relatedCategories,
    featuredAuthors,
    priority,
    popularity,
  });

  await linkCollection(collectionRes, fields);

  return collectionRes;
};

/**
 * Updates a live collection and adds any missing links from its books and related collections (links from records
 * removed from the lists stay).
 * Legacy: without `books` or `relatedCollections` the collection is updated and then the call fails (500).
 * @param {string} id
 * @param {object} fields As for createCollection.
 * @returns {Promise<object>} The updated collection.
 * @throws {AppError} COLLECTION_NOT_EXIST (400).
 */
const updateCollection = async (id, fields) => {
  const { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = fields;

  if (!(await Collection.findOne({ _id: id, isDeleted: false }))) throw new AppError('COLLECTION_NOT_EXIST');

  const payload = { title, description, tags, poster, books, relatedCollections, relatedCategories, featuredAuthors, priority, popularity };
  const collectionRes = await Collection.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true });

  await linkCollection(collectionRes, fields);

  return collectionRes;
};

/**
 * Searches live collections by title, tags and description (word-prefix search on `q`,
 * helpers/search-pattern.helper.js): the first 10, most popular first (then oldest first).
 * @param {unknown} q
 * @returns {Promise<object[]>} Full collection documents; [] without `q`.
 */
const searchCollections = async (q) => {
  const filter = wordPrefixFilter(q, ['title', 'tags', 'description']);
  if (!filter) return [];

  return Collection.find({ ...filter, isDeleted: false }).sort({ popularity: -1, _id: 1 }).limit(SEARCH_RESULT_LIMIT).maxTimeMS(SEARCH_MAX_TIME_MS);
};

/**
 * A live collection by id, populated (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} COLLECTION_NOT_EXIST (400).
 */
const getCollectionById = (id) => findLive({ _id: id });

/**
 * A live collection by its public `collectionId`, populated.
 * @param {string} collectionId
 * @returns {Promise<object>}
 * @throws {AppError} COLLECTION_NOT_EXIST (400).
 */
const getCollectionByCollectionId = (collectionId) => findLive({ collectionId });

/**
 * Soft-deletes a live collection (links to it stay).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} COLLECTION_NOT_EXIST (400).
 */
const deleteCollection = async (id) => {
  const collection = await Collection.findOne({ _id: id, isDeleted: false });
  if (!collection) throw new AppError('COLLECTION_NOT_EXIST');

  collection.isDeleted = true;
  collection.deletedAt = new Date();
  await collection.save();
};

module.exports = {
  createCollection,
  deleteCollection,
  getCollectionByCollectionId,
  getCollectionById,
  listCollections,
  searchCollections,
  updateCollection,
};
