const Joi = require('joi');

const { objectId } = require('./common.validator');

module.exports.orderAttempt = Joi.object({
  address: objectId,
});

module.exports.updatePayment = Joi.object({
  method: Joi.string()
    .valid('cod', 'online')
    .required()
    .trim()
    .description('Payment Method')
    .error(new Error('INVALID_PAYMENT_METHOD')),
  id: objectId,
});

module.exports.orderCreate = Joi.object({
  method: Joi.string()
    .valid('cod', 'online')
    .required()
    .trim()
    .description('Payment Method')
    .error(new Error('INVALID_PAYMENT_METHOD')),
  instructions: Joi.string()
    .length(100)
    .optional()
    .allow('')
    .trim()
    .description('Delivery Instructions')
    .error(new Error('INVALID_INSTRUCTIONS')),
});

module.exports.returnRequestPayload = Joi.object({
  uniqueId: Joi.string(),
  type: Joi.string(),
  comments: Joi.string(),
  reason: Joi.string(),
  books: Joi.string(),
  bundles: Joi.string(),
});
