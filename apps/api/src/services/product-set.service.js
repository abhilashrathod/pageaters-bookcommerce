const mongoose = require('mongoose');
const { kebabCase, sortBy, isArray, map } = require('lodash');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomString, generateRandomNumber } = require('../helpers/utils.helper');
const { pageOptions } = require('../helpers/paging.helper');

// Product sets: an ordered list of store books (`products: [{ priority, product }]`) used by deals and CMS rows.
// Public detail by setId or slug; admin list and create/update/deactivate.

const ProductSets = mongoose.model(models.PRODUCT_SETS);

const DETAIL_POPULATE = [
  {
    path: 'products.product',
    select: 'bookId title ISBN author inventory poster price popularity availability editorsPick inventory currentDiscount newRelease preOrder bestSeller',
    populate: { path: 'author', select: 'name avatar' },
  },
  { path: 'categories', select: 'categoryId _id title numberOfBooks thumbnail' },
];

const byPriority = (item) => item.priority;
const newSlug = (title) => `${kebabCase(title)}-${generateRandomString(6)}`;

// An active set, populated, as a plain object with its products in priority order (each still `{ priority,
// product }` when `unwrap` is false, just the product when true).
const findActive = async (query, unwrap) => {
  const found = await ProductSets.findOne({ ...query, isActive: true }).populate(DETAIL_POPULATE);
  if (!found) throw new AppError('PRODUCT_SET_NOT_EXIST');

  const productSet = found.toObject();
  const sorted = sortBy(productSet.products, byPriority);
  productSet.products = unwrap ? map(sorted, (item) => item.product) : sorted;
  return productSet;
};

/**
 * One page of active product sets, newest first, optionally only those in any of `categories` (array or
 * comma-separated; the route checks they are ids). Paging defaults: helpers/paging.helper.js (no client sorting).
 * @param {{ page?, limit?, categories?: string | string[] }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} INVALID_PAGING (400).
 */
const listProductSets = ({ page, limit, categories }) => {
  const query = { isActive: true };
  if (categories) query.categories = mongoose.trusted({ $in: isArray(categories) ? categories : categories.split(',') });

  return ProductSets.paginate(query, pageOptions({ page, limit }));
};

/**
 * Creates a product set with a slug from its title plus a random suffix.
 * @param {{ products?, title?, description?, categories? }} fields
 * @returns {Promise<object>} The new set document.
 */
const createProductSet = ({ products, title, description, categories }) =>
  ProductSets.create({
    setId: `SET-${generateRandomNumber(10)}`,
    title,
    description,
    products,
    categories,
    slug: newSlug(title),
  });

/**
 * Updates an active product set. The slug made at create never changes, so a renamed set keeps its links; a field
 * left out keeps its value (Mongoose drops undefined keys from `$set`).
 * @param {string} id
 * @param {{ products?, title?, description?, categories? }} fields
 * @returns {Promise<object>} The updated set.
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400).
 */
const updateProductSet = async (id, { products, title, description, categories }) => {
  const updated = await ProductSets.findOneAndUpdate({ _id: id, isActive: true }, { $set: { title, description, products, categories } }, { new: true });
  if (!updated) throw new AppError('PRODUCT_SET_NOT_EXIST');
  return updated;
};

/**
 * An active set by id, populated, products in priority order with their priority (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400).
 */
const getProductSetById = (id) => findActive({ _id: id }, false);

/**
 * An active set by its public `setId`, populated, `products` as the books in priority order.
 * @param {string} setId
 * @returns {Promise<object>}
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400).
 */
const getProductSetBySetId = (setId) => findActive({ setId }, true);

/**
 * An active set by slug, as getProductSetBySetId.
 * @param {string} slug
 * @returns {Promise<object>}
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400).
 */
const getProductSetBySlug = (slug) => findActive({ slug }, true);

/**
 * Deactivates an active set (deals that use it keep pointing at it).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400).
 */
const deactivateProductSet = async (id) => {
  const productSet = await ProductSets.findOne({ _id: id, isActive: true });
  if (!productSet) throw new AppError('PRODUCT_SET_NOT_EXIST');

  productSet.isActive = false;
  productSet.deactivatedAt = new Date();
  await productSet.save();
};

module.exports = {
  createProductSet,
  deactivateProductSet,
  getProductSetById,
  getProductSetBySetId,
  getProductSetBySlug,
  listProductSets,
  updateProductSet,
};
