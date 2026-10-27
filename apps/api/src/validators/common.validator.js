const Joi = require('joi');

module.exports.objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .error(new Error('INVALID_ID'));

module.exports.page = Joi.number()
  .integer()
  .min(1)
  .optional()
  .default(1)
  .description('Page')
  .error(new Error('INVALID_PAGE'));

module.exports.phone = Joi.string()
  .length(10)
  .required()
  .regex(/^\d+$/)
  .trim()
  .description('Contact No')
  .error(new Error('INVALID_PHONE'));

module.exports.otp = Joi.string()
  .length(6)
  .required()
  .regex(/^\d+$/)
  .trim()
  .description('OTP')
  .error(new Error('INVALID_OTP'));

module.exports.limit = Joi.number()
  .integer()
  .min(0)
  .optional()
  .default(10)
  .description('Records per page')
  .error(new Error('INVALID_LIMIT'));

module.exports.email = Joi.string()
  .email()
  .max(50)
  .required()
  .trim()
  .description('Email Id')
  .error(new Error('INVALID_EMAIL'));

module.exports.password = Joi.string()
  .max(50)
  .required()
  .trim()
  .description('Password')
  .error(new Error('INVALID_PASSWORD'));

module.exports.fullName = Joi.string()
  .max(50)
  .allow('')
  .error(new Error('INVALID_NAME'));

module.exports.name = Joi.string()
  .max(50)
  .allow('')
  .error(new Error('INVALID_NAME'));

module.exports.date = Joi.string()
  .regex(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/)
  .required()
  .trim()
  .description('Date of meeting. Format: "YYYY-MM-DD"')
  .error(new Error('INVALID_MEETING_DATE'));

module.exports.time = Joi.string()
  .regex(/^[0-9]{2}\:[0-9]{2}$/)
  .required()
  .trim()
  .description('Time of meeting. Format: "HH:MM" (24 hour)')
  .error(new Error('INVALID_MEETING_TIME'));

module.exports.sortBy = Joi.string()
  .default('createdAt')
  .optional()
  .allow('')
  .error(new Error('INVALID_SORT_BY'));

module.exports.q = Joi.string()
  .max(50)
  .optional()
  .allow('')
  .error(new Error('INVALID_QUERY_SEARCH'));
