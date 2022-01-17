const Joi = require('joi');

const { objectId } = require('./common.validator');

const quantityField = Joi.number()
  .integer()
  .min(1)
  .default(1)
  .description('Quantity')
  .error(new Error('REQUIRED_QUANTITY'));

module.exports.cartItemAddPayload = Joi.object({
  product: objectId,
  quantity: quantityField,
});

module.exports.cartItemUpdatePayload = Joi.object({
  id: objectId,
  quantity: quantityField,
});
