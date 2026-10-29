const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { addBackLinks } = require('./catalog-links.service');

// Bundles (several store books sold together): public list, detail and search; admin create/update/delete. A
// bundle is listed on its books' `relatedBundles`.

const Bundles = mongoose.model(models.BUNDLE);
const Book = mongoose.model(models.STORE_BOOK);

const SORTABLE = ['title', 'createdAt', 'popularity', 'priority', 'currentDiscount', 'price'];
const LIST_FIELDS = 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice';
const DETAIL_POPULATE = [
  { path: 'bundledBooks', select: `title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount preOrder bestSeller` },
  { path: 'relatedCollections', select: 'collectionId title tags poster books', populate: { path: 'books', select: 'title poster' } },
  { path: 'relatedBundles', select: LIST_FIELDS },
  { path: 'categories', select: 'title poster' },
];

/**
 * One page of live bundles (list fields), optionally in one category.
 * Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit?, sortBy?, sortOrder?, category? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listBundles = ({ page, limit, sortBy, sortOrder, category }) => {
  const query = { isDeleted: false };
  if (category) query.categories = category;

  if (sortBy && !SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  return Bundles.paginate(query, { page, limit, select: LIST_FIELDS, sort: { [sortBy]: sortOrder } });
};

/**
 * Creates a bundle and lists it on each of its books.
 * Legacy: without `bundledBooks` the bundle is created and then the call fails (500).
 * @param {object} fields title, description, tags, poster, popularity, priority, currentDiscount, bundledBooks,
 *   categories, relatedBundles, relatedCollections, weight, price, membersPrice.
 * @returns {Promise<object>} The new bundle document.
 */
const createBundle = async (fields) => {
  const { title, description, tags, poster, popularity, priority, currentDiscount, bundledBooks, categories } = fields;
  const { relatedBundles, relatedCollections, weight, price, membersPrice } = fields;

  const bundleRes = await Bundles.create({
    bundleId: `BL-${generateRandomNumber(10)}`,
    title,
    description,
    tags,
    poster,
    currentDiscount,
    bundledBooks,
    categories,
    relatedBundles,
    relatedCollections,
    price,
    weight,
    popularity,
    priority,
    membersPrice,
  });

  await addBackLinks(Book, bundledBooks, 'relatedBundles', bundleRes._id);

  return bundleRes;
};

/**
 * Updates a live bundle and lists it on any of its books that don't list it yet (books removed from the bundle
 * keep the link). `weight` is not updatable.
 * Legacy: without `bundledBooks` the bundle is updated and then the call fails (500).
 * @param {string} id
 * @param {object} fields As for createBundle, without weight.
 * @returns {Promise<object>} The updated bundle.
 * @throws {AppError} BUNDLE_NOT_EXIST (400).
 */
const updateBundle = async (id, fields) => {
  const { title, description, tags, poster, popularity, priority, relatedBundles, bundledBooks, categories } = fields;
  const { relatedCollections, currentDiscount, price, membersPrice } = fields;

  if (!(await Bundles.findOne({ _id: id, isDeleted: false }))) throw new AppError('BUNDLE_NOT_EXIST');

  const payload = {
    title,
    description,
    tags,
    poster,
    popularity,
    priority,
    categories,
    relatedBundles,
    bundledBooks,
    relatedCollections,
    currentDiscount,
    price,
    membersPrice,
  };
  const bundleRes = await Bundles.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true });

  await addBackLinks(Book, bundledBooks, 'relatedBundles', bundleRes._id);

  return bundleRes;
};

/**
 * Searches live bundles by title and tags (lunr prefix search on `q`).
 * @param {object | undefined} bundlesIndex The lunr index (`app.bundlesIndex`).
 * @param {string} q
 * @returns {Promise<object[]>} Full bundle documents; [] before the index exists.
 */
const searchBundles = async (bundlesIndex, q) => {
  if (!bundlesIndex) return [];

  const lunrIdArray = bundlesIndex.search(`${q}*`).map(({ ref }) => getId(ref));
  return Bundles.find({ _id: { $in: lunrIdArray }, isDeleted: false });
};

/**
 * A live bundle by id with its books, collections, related bundles and categories populated (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} BUNDLE_NOT_EXIST (400).
 */
const getBundleById = async (id) => {
  const bundle = await Bundles.findOne({ _id: id, isDeleted: false }).populate(DETAIL_POPULATE);
  if (!bundle) throw new AppError('BUNDLE_NOT_EXIST');
  return bundle;
};

/**
 * A live bundle by its public `bundleId`, populated, as a plain object with `inventory`: 0 when any of its books
 * is out of stock, else 1.
 * @param {string} bundleId
 * @returns {Promise<object>}
 * @throws {AppError} BUNDLE_NOT_EXIST (400).
 */
const getBundleByBundleId = async (bundleId) => {
  const found = await Bundles.findOne({ bundleId, isDeleted: false }).populate(DETAIL_POPULATE);
  if (!found) throw new AppError('BUNDLE_NOT_EXIST');

  const bundle = found.toObject();
  const outOfStockBooks = bundle.bundledBooks.filter((x) => x.inventory <= 0);
  bundle.inventory = outOfStockBooks.length > 0 ? 0 : 1;
  return bundle;
};

/**
 * Soft-deletes a live bundle (its books keep the link).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} BUNDLE_NOT_EXIST (400).
 */
const deleteBundle = async (id) => {
  const bundle = await Bundles.findOne({ _id: id, isDeleted: false });
  if (!bundle) throw new AppError('BUNDLE_NOT_EXIST');

  bundle.isDeleted = true;
  bundle.deletedAt = new Date();
  await bundle.save();
};

module.exports = { createBundle, deleteBundle, getBundleByBundleId, getBundleById, listBundles, searchBundles, updateBundle };
