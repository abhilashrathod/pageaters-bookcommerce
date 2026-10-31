const mongoose = require('mongoose');
const { sortBy } = require('lodash');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { pageOptions } = require('../helpers/paging.helper');

// Store deals: a promo (poster + call to action) made of product sets, each with a priority. Public list and
// detail; admin create/update/deactivate. Deals are deactivated (`isActive: false`), never deleted.

const StoreDeal = mongoose.model(models.STORE_DEALS);
const ProductSets = mongoose.model(models.PRODUCT_SETS);

const SORTABLE = ['title', 'createdAt', 'priority'];
const PRODUCT_SELECT = 'bookId title ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller';
const CATEGORY_POPULATE = { path: 'categories', select: 'categoryId _id title numberOfBooks thumbnail' };

// Only active sets are populated (ACTIVE_SET); a set deleted or deactivated since is left `null` and skipped here.
const ACTIVE_SET = { path: 'productSets.set', match: { isActive: true } };

// The deal's remaining sets in priority order, and each set's products in priority order.
const sortSets = (deal) => {
  deal.productSets = sortBy(
    deal.productSets.filter((item) => item.set),
    (item) => item.priority,
  );
  for (const productSet of deal.productSets) {
    productSet.set.products = sortBy(productSet.set.products, (item) => item.priority);
  }
  return deal;
};

/**
 * One page of active deals (list fields), optionally in one category. Paging defaults: helpers/paging.helper.js,
 * here by priority, lowest first. Paged by page number only (a client `offset` is not read).
 * @param {{ page?, limit?, sortBy?, sortOrder?, category? }} params As sent.
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} INVALID_PAGING (400), SORTING_NOT_ALLOWED (400).
 */
const listDeals = ({ category, ...paging }) => {
  const query = { isActive: true };
  if (category) query.categories = category;

  return StoreDeal.paginate(query, {
    ...pageOptions(paging, { sortable: SORTABLE, sortBy: 'priority', sortOrder: 1 }),
    select: 'ctaLink ctaText dealId poster title _id',
  });
};

// Every `productSets[].set` must be an active product set. The route has checked each is an id or (legacy admin) a
// populated set with a valid `_id`.
const assertActiveSets = async (productSets) => {
  if (!Array.isArray(productSets) || productSets.length === 0) return;
  const setIds = [...new Set(productSets.map(({ set }) => String(set && typeof set === 'object' ? set._id : set)))];
  const found = await ProductSets.countDocuments({ _id: mongoose.trusted({ $in: setIds }), isActive: true });
  if (found !== setIds.length) throw new AppError('PRODUCT_SET_NOT_EXIST');
};

/**
 * Creates a deal.
 * @param {object} fields poster, ctaLink, ctaText, title, description, priority, categories, productSets
 *   (`[{ priority, set }]`).
 * @returns {Promise<object>} The new deal document.
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400) for a set that is missing or inactive (nothing is written).
 */
const createDeal = async ({ poster, ctaLink, ctaText, title, description, priority, categories, productSets }) => {
  await assertActiveSets(productSets);
  return StoreDeal.create({
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
};

/**
 * Updates an active deal in one write. A field left out keeps its value (Mongoose drops undefined keys from `$set`).
 * @param {string} id
 * @param {object} fields As for createDeal.
 * @returns {Promise<object>} The updated deal.
 * @throws {AppError} PRODUCT_SET_NOT_EXIST (400) for a missing or inactive set; STORE_DEAL_NOT_EXIST (400). Nothing is
 *   written in either case.
 */
const updateDeal = async (id, { poster, ctaLink, ctaText, title, description, categories, priority, productSets }) => {
  await assertActiveSets(productSets);

  const updated = await StoreDeal.findOneAndUpdate(
    { _id: id, isActive: true },
    { $set: { poster, ctaLink, ctaText, title, categories, description, priority, productSets } },
    { new: true },
  );
  if (!updated) throw new AppError('STORE_DEAL_NOT_EXIST');
  return updated;
};

/**
 * An active deal by id with its sets (and their books) and categories populated and sorted by priority (admin).
 * Books carry their author's name.
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} STORE_DEAL_NOT_EXIST (400).
 */
const getDealById = async (id) => {
  const dealRes = await StoreDeal.findOne({ _id: id, isActive: true }).populate([
    {
      ...ACTIVE_SET,
      populate: { path: 'products.product', select: PRODUCT_SELECT, populate: { path: 'author', select: 'name' } },
    },
    CATEGORY_POPULATE,
  ]);
  if (!dealRes) throw new AppError('STORE_DEAL_NOT_EXIST');
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
    { ...ACTIVE_SET, populate: { path: 'products.product', select: PRODUCT_SELECT } },
    CATEGORY_POPULATE,
  ]);
  if (!dealRes) throw new AppError('STORE_DEAL_NOT_EXIST');
  return sortSets(dealRes);
};

/**
 * Deactivates an active deal (the write is awaited, so a failed one answers 500).
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} STORE_DEAL_NOT_EXIST (400).
 */
const deactivateDeal = async (id) => {
  const dealRes = await StoreDeal.findOne({ _id: id, isActive: true });
  if (!dealRes) throw new AppError('STORE_DEAL_NOT_EXIST');

  dealRes.isActive = false;
  dealRes.deactivatedAt = new Date();
  await dealRes.save();
};

module.exports = { createDeal, deactivateDeal, getDealByDealId, getDealById, listDeals, updateDeal };
