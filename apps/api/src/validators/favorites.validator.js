const Joi = require('joi');

const { objectId } = require('./common.validator');

module.exports.requestPayload = Joi.object({
  product: objectId,
});
