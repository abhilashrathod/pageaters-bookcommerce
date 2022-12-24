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
    .max(100)
    .optional()
    .allow('')
    .trim()
    .description('Delivery Instructions')
    .error(new Error('INVALID_INSTRUCTIONS')),
  giftOptions: Joi.object({
    isGift: Joi.boolean()
      .required()
      .description('Checks whether this address is default one')
      .error(new Error('INVALID_DEFAULT_SELECTION')),
    details: Joi.object({
      package: Joi.string()
        .optional()
        .allow('')
        .trim()
        .description('Package Details'),
      from: Joi.string()
        .optional()
        .allow('')
        .trim()
        .description('From Name'),
      message: Joi.string()
        .optional()
        .allow('')
        .trim()
        .description('Gift Message'),
      cost: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .description('Cost of the gift'),
    }),
  }),
});

module.exports.returnRequestPayload = Joi.object({
  uniqueId: Joi.string(),
  type: Joi.string(),
  comments: Joi.string(),
  reason: Joi.string(),
  books: Joi.string(),
  bundles: Joi.string(),
});
