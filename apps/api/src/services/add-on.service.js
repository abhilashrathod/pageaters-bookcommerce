const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { pageOptions } = require('../helpers/paging.helper');

// Add-ons (gift wrap, bookmarks…) offered at checkout: the storefront list grouped by category; admin list,
// detail, create, update and delete (soft). Add-ons are not linked to products: every live add-on is offered with
// every live store book.

const Addon = mongoose.model(models.ADD_ON);
const StoreBook = mongoose.model(models.STORE_BOOK);

const SORTABLE = ['name'];
// The public add-on fields (shared `addOnSchema`): the grouped list leaves out isDeleted, deletedAt and __v.
const PUBLIC_FIELDS = { _id: 1, createdAt: 1, updatedAt: 1, addOnId: 1, name: 1, description: 1, poster: 1, category: 1, priority: 1, price: 1, currentDiscount: 1, inventory: 1 };

/**
 * One page of live add-ons, newest first unless sorted by name. Paging defaults: helpers/paging.helper.js.
 * @param {{ page?, limit?, sortBy?, sortOrder? }} params As sent.
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} INVALID_PAGING (400), SORTING_NOT_ALLOWED (400).
 */
const listAddOns = (params) => Addon.paginate({ isDeleted: false }, pageOptions(params, { sortable: SORTABLE }));

/**
 * Creates an add-on. `productPrefrerence` and `products` are not in the schema, so the controller doesn't pass them.
 * @param {{ name?, description?, poster?, category?, priority?, price?, currentDiscount?, inventory? }} fields
 * @returns {Promise<object>} The new add-on document.
 */
const createAddOn = ({ name, description, poster, category, priority, price, currentDiscount, inventory }) =>
  Addon.create({ addOnId: `AO-${generateRandomNumber(10)}`, name, description, poster, category, inventory, priority, price, currentDiscount });

/**
 * Updates a live add-on. A field left out keeps its value (Mongoose drops undefined keys from `$set`).
 * @param {string} id
 * @param {{ name?, description?, poster?, category?, priority?, price?, currentDiscount?, inventory? }} fields
 * @returns {Promise<object>} The updated add-on.
 * @throws {AppError} ADD_ON_NOT_EXIST (400) for a missing or deleted add-on.
 */
const updateAddOn = async (id, { name, description, poster, category, priority, price, currentDiscount, inventory }) => {
  const updated = await Addon.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { name, description, poster, category, priority, price, currentDiscount, inventory } },
    { new: true },
  );
  if (!updated) throw new AppError('ADD_ON_NOT_EXIST');
  return updated;
};

/**
 * A live add-on by id (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} ADD_ON_NOT_EXIST (400) for a missing or deleted add-on.
 */
const getAddOnById = async (id) => {
  const addOn = await Addon.findOne({ _id: id, isDeleted: false });
  if (!addOn) throw new AppError('ADD_ON_NOT_EXIST');
  return addOn;
};

/**
 * The live add-ons offered with a store book, grouped by category: `[{ _id: category, addOns: [addOn] }]`, each
 * add-on with its public fields only; groups by category, add-ons in a group by priority then name. The same for
 * every live book (add-ons aren't linked to products); the book must exist.
 * @param {string} productId A store book's `_id` (the route checks it is an id).
 * @returns {Promise<object[]>}
 * @throws {AppError} BOOK_NOT_EXIST (400) for a missing or deleted store book.
 */
const groupAddOnsByCategory = async (productId) => {
  if (!(await StoreBook.exists({ _id: productId, isDeleted: false }))) throw new AppError('BOOK_NOT_EXIST');

  return Addon.aggregate([
    { $match: { isDeleted: false } },
    { $sort: { priority: 1, name: 1, _id: 1 } },
    { $project: PUBLIC_FIELDS },
    { $group: { _id: '$category', addOns: { $push: '$$ROOT' } } },
    { $sort: { _id: 1 } },
  ]);
};

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
