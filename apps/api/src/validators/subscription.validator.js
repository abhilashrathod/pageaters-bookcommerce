const Joi = require('joi');

module.exports.createPayload = Joi.object({
  planId: Joi.string()
    .required()
    .trim()
    .description('Subscription Plan Id')
    .error(new Error('SUBSCRIPTION_PLAN_ERROR')),
});
