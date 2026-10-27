const Joi = require('joi');

const { name, email } = require('./common.validator');

module.exports.contactUs = Joi.object({
  name: name.required(),
  email,
  message: Joi.string()
    .required()
    .trim()
    .description('Message')
    .error(new Error('INVALID_MESSAGE')),
});
