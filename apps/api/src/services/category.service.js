const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

// Categories: public list, detail, search and the category's books; admin create/update/delete.

const Category = mongoose.model(models.CATEGORY);
const Book = mongoose.model(models.STORE_BOOK);

const SORTABLE = ['title', 'createdAt', 'popularity', 'priority', 'currentDiscount', 'price'];
const PRODUCTS_SORTABLE = ['title', 'createdAt', 'updatedAt', 'publicationYear', 'popularity', 'currentDiscount', 'price'];
const PRODUCT_POPULATE = [
  { path: 'author', select: 'name avatar' },
  { path: 'categories', select: '_id categoryId title' },
];

const findLive = async (query) => {
  const category = await Category.findOne({ ...query, isDeleted: false });
  if (!category) throw new AppError('CATEGORY_NOT_EXIST');
  return category;
};

/**
 * One page of live categories (list fields).
 * Legacy: `sortOrder` goes through `Number()`, so 'asc'/'desc' become NaN and sort ascending; without `limit` the
 * page has no documents.
 * @param {{ page?: string, limit?: string, sortBy?: string, sortOrder?: string }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listCategories = ({ page, limit, sortBy, sortOrder }) => {
  if (sortBy && !SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  return Category.paginate(
    { isDeleted: false },
    { page, limit, select: `categoryId _id title numberOfBooks thumbnail`, sort: { [sortBy]: Number(sortOrder) } },
  );
};

/**
 * Creates a category.
 * @param {{ title?: string, description?: string, thumbnail?: string, meta?: object }} fields
 * @returns {Promise<object>} The new category document.
 */
const createCategory = ({ title, description, thumbnail, meta }) =>
  Category.create({ categoryId: `CA-${generateRandomNumber(10)}`, title, description, thumbnail, meta });

/**
 * Updates a live category.
 * @param {string} id
 * @param {{ title?, description?, thumbnail?, meta?, popularity?, priority? }} fields
 * @returns {Promise<object>} The updated category.
 * @throws {AppError} CATEGORY_NOT_EXIST (400).
 */
const updateCategory = async (id, { title, description, thumbnail, meta, popularity, priority }) => {
  await findLive({ _id: id });
  return Category.findOneAndUpdate(
    { _id: id },
    { $set: { title, description, thumbnail, meta, popularity, priority } },
    { new: true },
  );
};

/**
 * Searches live categories by title and description (lunr prefix search on `q`), at most 10.
 * @param {object | undefined} categoryIndex The lunr index (`app.categoryIndex`).
 * @param {string} q
 * @returns {Promise<object[]>} [] before the index exists.
 */
const searchCategories = async (categoryIndex, q) => {
  if (!categoryIndex) return [];

  const lunrIdArray = categoryIndex.search(`${q}*`).map(({ ref }) => getId(ref));
  return Category.find({ _id: { $in: lunrIdArray }, isDeleted: false }).select('categoryId title numberOfBooks _id').limit(10);
};

/**
 * A live category by id (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} CATEGORY_NOT_EXIST (400).
 */
const getCategoryById = (id) => findLive({ _id: id });

/**
 * A live category by its public `categoryId`.
 * @param {string} categoryId
 * @returns {Promise<object>}
 * @throws {AppError} CATEGORY_NOT_EXIST (400).
 */
const getCategoryByCategoryId = (categoryId) => findLive({ categoryId });

/**
 * The in-stock books of a category three ways (by popularity, publication year and discount), one page each.
 * Legacy: without `limit` all three lists are empty.
 * @param {string} id Category id.
 * @param {{ page?: string, limit?: string, sortOrder?: string }} options
 * @returns {Promise<{ trending: object[], newArrivals: object[], mostDiscounted: object[] }>}
 */
const getOverview = async (id, { page, limit, sortOrder }) => {
  const query = { isDeleted: false, type: enums.PRODUCT_TYPES.BOOK, categories: id, inventory: { $gt: 0 } };
  const options = {
    page,
    limit,
    select: `title bookId ISBN author poster price popularity editorsPick availability currentDiscount inventory newRelease preOrder bestSeller`,
    populate: PRODUCT_POPULATE,
  };
  const pageSortedBy = async (field) => (await Book.paginate(query, { ...options, sort: { [field]: sortOrder } })).docs;

  return {
    trending: await pageSortedBy('popularity'),
    newArrivals: await pageSortedBy('publicationYear'),
    mostDiscounted: await pageSortedBy('currentDiscount'),
  };
};

/**
 * One page of a category's books (soft-deleted ones excluded), sorted when both `sortBy` and `sortOrder` are given.
 * @param {string} id Category id.
 * @param {{ page?: string, limit?: string, sortBy?: string, sortOrder?: string }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listProducts = (id, { page, limit, sortBy, sortOrder }) => {
  if (sortBy && !PRODUCTS_SORTABLE.includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');

  const options = {
    page,
    limit,
    select: `title bookId ISBN author poster price popularity availability editorsPick inventory currentDiscount inventory newRelease preOrder bestSeller`,
    populate: PRODUCT_POPULATE,
  };
  if (sortBy && sortOrder) options.sort = { [sortBy]: [sortOrder] };

  return Book.paginate({ isDeleted: false, categories: id, type: enums.PRODUCT_TYPES.BOOK }, options);
};

/**
 * Soft-deletes a live category (books keep referencing it).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} CATEGORY_NOT_EXIST (400).
 */
const deleteCategory = async (id) => {
  const category = await findLive({ _id: id });
  category.isDeleted = true;
  category.deletedAt = new Date();
  await category.save();
};

module.exports = {
  createCategory,
  deleteCategory,
  getCategoryByCategoryId,
  getCategoryById,
  getOverview,
  listCategories,
  listProducts,
  searchCategories,
  updateCategory,
};
