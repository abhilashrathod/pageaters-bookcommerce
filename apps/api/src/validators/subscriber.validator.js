const Joi = require('joi');

const { email, limit, page} = require('./common.validator');

module.exports.rootPayload = Joi.object({
  email,
});

module.exports.pagination = Joi.object({
  limit,
  page
});
