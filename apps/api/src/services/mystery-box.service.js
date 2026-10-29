const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');

// Mystery boxes (a number of surprise books): public list and detail; admin create/update/delete.

const MysteryBox = mongoose.model(models.MYSTERY_BOX);

const findLive = async (query) => {
  const box = await MysteryBox.findOne({ ...query, isDeleted: false });
  if (!box) throw new AppError('MYSTERY_BOX_NOT_EXIST');
  return box;
};

/**
 * One page of live boxes, fewest books first. Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit? }} paging
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 */
const listBoxes = ({ page, limit }) => MysteryBox.paginate({ isDeleted: false }, { page, limit, sort: { books: 'asc' } });

/**
 * Creates a box. Legacy: its `boxId` uses the product-set prefix `SET-`.
 * @param {{ title?, description?, tags?, images?, books?, currentDiscount?, weight?, price? }} fields
 * @returns {Promise<object>} The new box document.
 */
const createBox = ({ title, description, tags, images, books, currentDiscount, weight, price }) =>
  MysteryBox.create({ boxId: `SET-${generateRandomNumber(10)}`, title, description, tags, images, books, currentDiscount, weight, price });

/**
 * Updates a live box.
 * @param {string} id
 * @param {{ title?, description?, tags?, images?, books?, currentDiscount?, weight?, price? }} fields
 * @returns {Promise<object>} The updated box.
 * @throws {AppError} MYSTERY_BOX_NOT_EXIST (400).
 */
const updateBox = async (id, { title, description, tags, books, images, currentDiscount, weight, price }) => {
  await findLive({ _id: id });
  return MysteryBox.findOneAndUpdate(
    { _id: id },
    { $set: { title, description, tags, images, books, currentDiscount, weight, price } },
    { new: true },
  );
};

/**
 * A live box by id (admin).
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {AppError} MYSTERY_BOX_NOT_EXIST (400).
 */
const getBoxById = (id) => findLive({ _id: id });

/**
 * A live box by its public `boxId`.
 * @param {string} boxId
 * @returns {Promise<object>}
 * @throws {AppError} MYSTERY_BOX_NOT_EXIST (400).
 */
const getBoxByBoxId = (boxId) => findLive({ boxId });

/**
 * Soft-deletes a live box. Legacy: writes `deactivatedAt`, which the model doesn't have, so `deletedAt` stays ''.
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {AppError} MYSTERY_BOX_NOT_EXIST (400).
 */
const deleteBox = async (id) => {
  const box = await findLive({ _id: id });
  box.isDeleted = true;
  box.deactivatedAt = new Date();
  await box.save();
};

module.exports = { createBox, deleteBox, getBoxByBoxId, getBoxById, listBoxes, updateBox };
