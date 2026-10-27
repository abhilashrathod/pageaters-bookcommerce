const Joi = require('joi');

const { email } = require('./common.validator');

module.exports.rootPayload = Joi.object({
  email,
});
