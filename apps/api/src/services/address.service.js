const mongoose = require('mongoose');
const { get } = require('lodash');

const shipping = require('../adapters/shipping');
const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');

// A shopper's delivery addresses (soft-deleted, at most one default) and the pincode check (the shipping adapter:
// Delhivery or its mock).

const Address = mongoose.model(models.ADDRESS);

/**
 * Whether the courier delivers to a pincode.
 * Legacy: any courier or network error counts as unserviceable (false); the error is not logged.
 * @param {string} pincode
 * @returns {Promise<boolean>}
 */
const checkServiceabilityInternal = async (pincode) => {
  try {
    return Boolean(await shipping.checkPincode(pincode));
  } catch {
    return false;
  }
};

// Clears the user's default address, except `keep` (an address id) when given. The `$ne` is server-built, so it is
// marked trusted (sanitizeFilter neutralises untrusted operators).
const clearDefault = (userId, keep) =>
  Address.updateMany({ isDeleted: false, userId, ...(keep && { _id: mongoose.trusted({ $ne: keep }) }) }, { $set: { isDefault: false } });

// The fields a shopper sets on an address (create and update): the single allowlist, so a request can never set
// `userId`, `isDeleted`, `deletedAt` or `country`. Fields left out (undefined) are skipped.
const ADDRESS_FIELDS = ['fullName', 'contactNo', 'email', 'city', 'state', 'pinCode', 'addressLine1', 'addressLine2', 'landmark', 'isDefault', 'type'];
const pickAddressFields = (fields) =>
  Object.fromEntries(ADDRESS_FIELDS.filter((field) => fields[field] !== undefined).map((field) => [field, fields[field]]));

/**
 * The user's live addresses.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
const listAddresses = (userId) => Address.find({ isDeleted: false, userId });

/**
 * One of the user's live addresses.
 * @param {string} userId
 * @param {string} id Address id.
 * @returns {Promise<object>}
 * @throws {AppError} ADDRESS_NOT_EXIST (400) when it isn't the user's, is deleted or doesn't exist.
 */
const getAddress = async (userId, id) => {
  const address = await Address.findOne({ _id: id, isDeleted: false, userId });
  if (!address) throw new AppError('ADDRESS_NOT_EXIST');
  return address;
};

/**
 * Adds an address after checking its pincode with the courier; a default address clears the user's other defaults.
 * Legacy: a courier error counts as unserviceable; `email` falls back to the account email when empty.
 * @param {{ userId: string, email?: string }} user The caller (`req.user`: `userId`, `email`).
 * @param {object} fields The validated request; only ADDRESS_FIELDS are read.
 * @returns {Promise<object>} The new address document.
 * @throws {AppError} PINCODE_ERROR (400, object form) when the pincode isn't serviceable.
 */
const createAddress = async (user, fields) => {
  if (!(await checkServiceabilityInternal(fields.pinCode))) throw new AppError('PINCODE_ERROR', { data: {} });

  if (fields.isDefault) await clearDefault(user.userId);

  const picked = pickAddressFields(fields);
  return Address.create({ ...picked, userId: user.userId, email: picked.email ? picked.email : user.email });
};

/**
 * Updates one of the user's live addresses: only the ADDRESS_FIELDS that were sent are set; the others stay as they
 * are. A new PIN code must be serviceable, as on create. `isDefault: true` clears the user's other defaults only
 * after the update has succeeded, so a failed update never leaves the user without a default. The route validates
 * the fields (`addressUpdatePayloadSchema`).
 * @param {{ userId: string }} user The caller (`req.user`).
 * @param {string} id Address id.
 * @param {object} fields The validated request; only ADDRESS_FIELDS are read, each optional.
 * @returns {Promise<object>} The updated address.
 * @throws {AppError} ADDRESS_NOT_EXIST (400) when it isn't the user's, is deleted or doesn't exist (also when it is
 *   deleted while the update runs); PINCODE_ERROR (400, object form) when a new pincode isn't serviceable.
 */
const updateAddress = async (user, id, fields) => {
  const address = await getAddress(user.userId, id);

  const changes = pickAddressFields(fields);

  if (changes.pinCode && changes.pinCode !== address.pinCode && !(await checkServiceabilityInternal(changes.pinCode))) {
    throw new AppError('PINCODE_ERROR', { data: {} });
  }

  const updated = await Address.findOneAndUpdate({ _id: address._id, isDeleted: false, userId: user.userId }, { $set: changes }, { new: true });
  if (!updated) throw new AppError('ADDRESS_NOT_EXIST', { debugMessage: 'DELETED_DURING_UPDATE' });

  if (changes.isDefault) await clearDefault(user.userId, updated._id);
  return updated;
};

/**
 * Makes one of the user's addresses the default and clears the others.
 * @param {string} userId
 * @param {string} id Address id.
 * @returns {Promise<object>} The updated address.
 * @throws {AppError} ADDRESS_NOT_EXIST (400).
 */
const makeDefault = async (userId, id) => {
  const query = { _id: id, isDeleted: false, userId };
  await getAddress(userId, id);
  await clearDefault(userId);
  return Address.findOneAndUpdate(query, { $set: { isDefault: true } }, { new: true });
};

/**
 * Soft-deletes one of the user's addresses.
 * @param {string} userId
 * @param {string} id Address id.
 * @returns {Promise<void>}
 * @throws {AppError} ADDRESS_NOT_EXIST (400).
 */
const deleteAddress = async (userId, id) => {
  const address = await getAddress(userId, id);
  address.isDeleted = true;
  address.deletedAt = new Date();
  await address.save();
};

/**
 * Asks the courier whether a pincode is serviceable. Answers only the summary the storefront needs
 * (`shopperPincodeServiceabilitySchema`), never the courier's raw record. A courier error propagates (500, the clean
 * adapter error).
 * @param {string} pincode Validated: 6 digits.
 * @returns {Promise<{ main: object }>} `main`: serviceable, isCod, isPrepaid, district, state.
 * @throws {AppError} PINCODE_ERROR (400, object form) when the courier has no record for it.
 */
const checkPincode = async (pincode) => {
  const pincodeRes = await shipping.checkPincode(pincode);

  if (!pincodeRes) throw new AppError('PINCODE_ERROR', { data: {} });

  return {
    main: {
      serviceable: true,
      isCod: get(pincodeRes, 'postal_code.cod', ''),
      isPrepaid: get(pincodeRes, 'postal_code.pre_paid', ''),
      district: get(pincodeRes, 'postal_code.district', ''),
      state: get(pincodeRes, 'postal_code.state_code', ''),
    },
  };
};

module.exports = { checkPincode, createAddress, deleteAddress, getAddress, listAddresses, makeDefault, updateAddress };
