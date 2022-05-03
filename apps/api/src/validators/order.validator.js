const Joi = require('joi');

const { objectId } = require('./common.validator');

module.exports.orderAttempt = Joi.object({
  address: objectId,
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
