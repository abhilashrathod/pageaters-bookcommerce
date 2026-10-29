const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');

// Add-ons (gift wrap, bookmarks…) offered at checkout: the storefront list grouped by category; admin list,
// create, delete. Update and admin detail are broken in the legacy code and stay broken until the legacy-bugs step.

const Addon = mongoose.model(models.ADD_ON);

/**
 * One page of live add-ons, sortable by name only.
 * Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit?, sortBy?, sortOrder? }} options
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} SORTING_NOT_ALLOWED (400).
 */
const listAddOns = ({ page, limit, sortBy, sortOrder }) => {
  if (sortBy && !['name'].includes(sortBy)) throw new AppError('SORTING_NOT_ALLOWED');
  return Addon.paginate({ isDeleted: false }, { page, limit, sort: { [sortBy]: sortOrder } });
};

/**
 * Creates an add-on. `productPrefrerence` and `products` are accepted but not in the schema, so not stored.
 * @param {object} fields name, description, poster, category, priority, price, currentDiscount, inventory,
 *   productPrefrerence, products.
 * @returns {Promise<object>} The new add-on document.
 */
const createAddOn = (fields) => {
  const { name, description, poster, category, priority, price, currentDiscount, inventory, productPrefrerence, products } = fields;
  return Addon.create({
    addOnId: `AO-${generateRandomNumber(10)}`,
    name,
    description,
    poster,
    category,
    inventory,
    priority,
    price,
    currentDiscount,
    productPrefrerence,
    products,
  });
};

/**
 * Updates an add-on. Legacy (fixed in the legacy-bugs step): the handler reads `id` and `addOnId`, which it never
 * defines, so it fails with a ReferenceError (500) before any query and nothing is updated.
 * @returns {Promise<never>}
 * @throws {ReferenceError} Always.
 */
const updateAddOn = async () => {
  throw new ReferenceError('id is not defined');
};

/**
 * A live add-on by id. Legacy (fixed in the legacy-bugs step): a found add-on answers with an undefined variable
 * (`bundles`), a ReferenceError (500); only a missing one answers ADD_ON_NOT_EXIST.
 * @param {string} id
 * @returns {Promise<never>}
 * @throws {AppError} ADD_ON_NOT_EXIST (400) for a missing or deleted add-on.
 * @throws {ReferenceError} For a live add-on.
 */
const getAddOnById = async (id) => {
  const addOnRes = await Addon.findOne({ _id: id, isDeleted: false }).populate([
    { path: 'products', select: `title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount preOrder bestSeller` },
  ]);
  if (!addOnRes) throw new AppError('ADD_ON_NOT_EXIST');
  throw new ReferenceError('bundles is not defined');
};

/**
 * Every add-on grouped by category: `[{ _id: category, addOns: [rawDocument] }]`.
 * Legacy: ignores the product id it is called with and includes soft-deleted add-ons.
 * @returns {Promise<object[]>}
 */
const groupAddOnsByCategory = () => Addon.aggregate([{ $group: { _id: '$category', addOns: { $push: '$$ROOT' } } }]);

/**
 * Soft-deletes a live add-on.
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} ADD_ON_NOT_EXIST (400).
 */
const deleteAddOn = async (id) => {
  const addOnRes = await Addon.findOne({ _id: id, isDeleted: false });
  if (!addOnRes) throw new AppError('ADD_ON_NOT_EXIST');

  addOnRes.isDeleted = true;
  addOnRes.deletedAt = new Date();
  await addOnRes.save();
};

module.exports = { createAddOn, deleteAddOn, getAddOnById, groupAddOnsByCategory, listAddOns, updateAddOn };
