const axios = require('axios');
const mongoose = require('mongoose');
const { get } = require('lodash');

const { models } = require('../constants');
const { DELHIVERY } = require('../appConfig');
const { AppError } = require('../helpers/appError.helper');
const { checkServiceabilityInternal } = require('../helpers/order.helper');

// A shopper's delivery addresses (soft-deleted, at most one default) and the Delhivery pincode check.

const Address = mongoose.model(models.ADDRESS);

const clearDefault = (userId) => Address.updateMany({ isDeleted: false, userId }, { $set: { isDefault: false } });

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
 * Adds an address after checking its pincode with Delhivery; a default address clears the user's other defaults.
 * Legacy: a courier error counts as unserviceable; `email` falls back to the account email when empty.
 * @param {{ userId: string, email?: string }} user The caller (`req.user`: `userId`, `email`).
 * @param {object} fields fullName, email, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark,
 *   type, isDefault.
 * @returns {Promise<object>} The new address document.
 * @throws {AppError} PINCODE_ERROR (400, object form) when the pincode isn't serviceable.
 */
const createAddress = async (user, fields) => {
  if (!(await checkServiceabilityInternal(fields.pinCode))) throw new AppError('PINCODE_ERROR', { data: {} });

  if (fields.isDefault) await clearDefault(user.userId);

  const { fullName, contactNo, city, state, pinCode, addressLine1, addressLine2, isDefault, landmark, type } = fields;
  return Address.create({
    userId: user.userId,
    fullName,
    contactNo,
    email: fields.email ? fields.email : user.email,
    city,
    state,
    pinCode,
    addressLine1,
    addressLine2,
    isDefault,
    landmark,
    type,
  });
};

/**
 * Updates one of the user's addresses (`$set` of the given fields; fields left out stay as they are).
 * Legacy (fixed in the legacy-bugs step): no validator, the pincode isn't re-checked, and the existence check is an
 * unfiltered `findOne()`, so another user's or an unknown id answers success with `null` (nothing changes) unless
 * the collection is empty. `isDefault` clears the user's other defaults even when nothing is updated.
 * @param {{ userId: string, email?: string }} user The caller (`req.user`).
 * @param {string} id Address id.
 * @param {object} fields As for createAddress.
 * @returns {Promise<object | null>} The updated address, or null when it isn't the user's.
 * @throws {AppError} ADDRESS_NOT_EXIST (400) when there is no address at all.
 */
const updateAddress = async (user, id, fields) => {
  if (!(await Address.findOne())) throw new AppError('ADDRESS_NOT_EXIST');

  if (fields.isDefault) await clearDefault(user.userId);

  const { fullName, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark, isDefault, type } = fields;
  const payload = {
    fullName,
    contactNo,
    email: fields.email ? fields.email : user.email,
    city,
    state,
    pinCode,
    addressLine1,
    addressLine2,
    landmark,
    isDefault,
    type,
  };

  return Address.findOneAndUpdate({ _id: id, isDeleted: false, userId: user.userId }, { $set: payload }, { new: true });
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
 * Asks Delhivery whether a pincode is serviceable.
 * Legacy: also answers the courier's raw record (`raw`); a courier error propagates (500).
 * @param {string} pincode
 * @returns {Promise<{ main: object, raw: object }>} `main`: serviceable, isCod, isPrepaid, district, state.
 * @throws {AppError} PINCODE_ERROR (400, object form) when Delhivery has no record for it.
 */
const checkPincode = async (pincode) => {
  const apiRes = await axios({
    method: 'get',
    url: `${DELHIVERY.BASE_URL}/c/api/pin-codes/json?filter_codes=${pincode}&token=${DELHIVERY.API_TOKEN}`,
    headers: {},
  });
  const pincodeRes = apiRes.data.delivery_codes[0];

  if (!pincodeRes) throw new AppError('PINCODE_ERROR', { data: {} });

  return {
    main: {
      serviceable: true,
      isCod: get(pincodeRes, 'postal_code.cod', ''),
      isPrepaid: get(pincodeRes, 'postal_code.pre_paid', ''),
      district: get(pincodeRes, 'postal_code.district', ''),
      state: get(pincodeRes, 'postal_code.state_code', ''),
    },
    raw: pincodeRes,
  };
};

module.exports = { checkPincode, createAddress, deleteAddress, getAddress, listAddresses, makeDefault, updateAddress };
