const mongoose = require('mongoose');
const { sortBy } = require('lodash');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');

// Store deals: a promo (poster + call to action) made of product sets, each with a priority. Public list and
// detail; admin create/update/deactivate. Deals are deactivated (`isActive: false`), never deleted.

const StoreDeal = mongoose.model(models.STORE_DEALS);

const SORTABLE = ['title', 'createdAt', 'priority'];
const PRODUCT_SELECT = 'bookId title ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller';
const CATEGORY_POPULATE = { path: 'categories', select: 'categoryId _id title numberOfBooks thumbnail' };

// Sets in priority order, and each set's products in priority order. Legacy: a set that no longer exists
// (`set: null`) makes this throw (500).
const sortSets = (deal) => {
  deal.productSets = sortBy(deal.productSets, (item) => item.priority);
  for (const productSet of deal.productSets) {
    productSet.set.products = sortBy(productSet.set.products, (item) => item.priority);
  }
  return deal;
};

/**
 * One page of active deals (list fields), optionally in one category.
 * Legacy: `offset` is always passed to mongoose-paginate-v2, so the result has `offset`, `page` and `pagingCounter`
 * null unless an offset is given; without `limit` the page has no documents.
 * @param {{ page?, limit?, sortBy?, sortOrder?, offset?, category? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listDeals = ({ page, limit, sortBy: sortField, sortOrder, offset, category }) => {
  const query = { isActive: true };
  if (category) query.categories = category;

  if (sortField && !SORTABLE.includes(sortField)) throw new AppError('SORTING_NOT_ALLOWED');

  return StoreDeal.paginate(query, {
    page,
    limit,
    offset,
    sort: { [sortField]: sortOrder },
    select: 'ctaLink ctaText dealId poster title _id',
  });
};

/**
 * Creates a deal.
 * @param {object} fields poster, ctaLink, ctaText, title, description, priority, categories, productSets
 *   (`[{ priority, set }]`).
 * @returns {Promise<object>} The new deal document.
 */
const createDeal = ({ poster, ctaLink, ctaText, title, description, priority, categories, productSets }) =>
  StoreDeal.create({
    dealId: `DE-${generateRandomNumber(10)}`,
    poster,
    ctaLink,
    ctaText,
    title,
    description,
    categories,
    priority,
    productSets,
  });

/**
 * Updates an active deal.
 * @param {string} id
 * @param {object} fields As for createDeal.
 * @returns {Promise<object>} The updated deal.
 * @throws {AppError} STORE_DEAL_NOT_EXIST (400).
 */
const updateDeal = async (id, { poster, ctaLink, ctaText, title, description, categories, priority, productSets }) => {
  if (!(await StoreDeal.findOne({ _id: id, isActive: true }))) throw new AppError('STORE_DEAL_NOT_EXIST');

  return StoreDeal.findOneAndUpdate(
    { _id: id },
    { $set: { poster, ctaLink, ctaText, title, categories, description, priority, productSets } },
    { new: true },
  );
};

/**
 * An active deal by id with its sets (and their books) and categories populated and sorted by priority (admin).
 * Legacy: answers with the author message keys (AUTHOR_LIST_SUCCESS / AUTHOR_NOT_EXIST); the nested populate path
 * `products.product.author` doesn't exist on store books (kept working by `strictPopulate: false`).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} AUTHOR_NOT_EXIST (400).
 */
const getDealById = async (id) => {
  const dealRes = await StoreDeal.findOne({ _id: id, isActive: true }).populate([
    {
      path: 'productSets.set',
      populate: { path: 'products.product', select: PRODUCT_SELECT, populate: { path: 'products.product.author', select: 'name' } },
    },
    CATEGORY_POPULATE,
  ]);
  if (!dealRes) throw new AppError('AUTHOR_NOT_EXIST');
  return sortSets(dealRes);
};

/**
 * An active deal by its public `dealId`, populated and sorted as getDealById.
 * @param {string} dealId
 * @returns {Promise<object>}
 * @throws {AppError} STORE_DEAL_NOT_EXIST (400).
 */
const getDealByDealId = async (dealId) => {
  const dealRes = await StoreDeal.findOne({ dealId, isActive: true }).populate([
    { path: 'productSets.set', populate: { path: 'products.product', select: PRODUCT_SELECT } },
    CATEGORY_POPULATE,
  ]);
  if (!dealRes) throw new AppError('STORE_DEAL_NOT_EXIST');
  return sortSets(dealRes);
};

/**
 * Deactivates an active deal. Legacy: the save is not awaited (the response doesn't wait for the write, and a
 * failed write goes unreported).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} STORE_DEAL_NOT_EXIST (400).
 */
const deactivateDeal = async (id) => {
  const dealRes = await StoreDeal.findOne({ _id: id, isActive: true });
  if (!dealRes) throw new AppError('STORE_DEAL_NOT_EXIST');

  dealRes.isActive = false;
  dealRes.deactivatedAt = new Date();
  void dealRes.save();
};

module.exports = { createDeal, deactivateDeal, getDealByDealId, getDealById, listDeals, updateDeal };
