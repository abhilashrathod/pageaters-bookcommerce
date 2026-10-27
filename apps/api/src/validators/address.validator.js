const Joi = require('joi');

const { email, fullName, phone, objectId } = require('./common.validator');
const { enums } = require('../constants');

const name = Joi.string().required().trim().description('Name for Address').error(new Error('INVALID_NAME'));
const city = Joi.string().required().trim().description('City Name').error(new Error('INVALID_CITY'));
const state = Joi.string().required().trim().description('State Name').error(new Error('INVALID_STATE'));
const pinCode = Joi.string().required().trim().description('Zip code of address').error(new Error('INVALID_PINCODE'));
const isDefault = Joi.boolean().required().description('Checks whether this address is default one').error(new Error('INVALID_DEFAULT_SELECTION'));
const addressLine1 = Joi.string().required().trim().description('Address Line 1').error(new Error('INVALID_ADD_1'));
const addressLine2 = Joi.string().trim().allow('').error(new Error('INVALID_ADD_2'));
const landmark = Joi.string().trim().allow('').error(new Error('INVALID_LANDMARK'));
const type = Joi.string().valid(...Object.values(enums.ADDRESS_TYPES));

module.exports.createPayload = Joi.object({
  fullName: name,
  contactNo: phone,
  email,
  city,
  state,
  pinCode,
  isDefault,
  addressLine1,
  addressLine2,
  landmark,
  type,
});

module.exports.updatePayload = Joi.object({
  id: objectId,
  fullName,
  contactNo: phone,
  email,
  city,
  state,
  pinCode,
  isDefault,
  addressLine1,
  addressLine2,
  landmark,
  type,
});

module.exports.getPayload = Joi.object({
  id: objectId,
});

module.exports.pincodePayload = Joi.object({
  pincode: pinCode,
});
