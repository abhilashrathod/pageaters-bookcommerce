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

module.exports.limit = Joi.number()
  .integer()
  .min(0)
  .optional()
  .default(10)
  .description('Records per page')
  .error(new Error('INVALID_LIMIT'));

module.exports.email = Joi.string()
  .email()
  .required()
  .trim()
  .description('Email Id')
  .error(new Error('INVALID_EMAIL'));

module.exports.password = Joi.string()
  .required()
  .trim()
  .description('Password')
  .error(new Error('INVALID_PASSWORD'));

module.exports.firstName = Joi.string()
  .allow('')
  .error(new Error('INVALID_FIRST_NAME'));

module.exports.lastName = Joi.string()
  .allow('')
  .error(new Error('INVALID_LAST_NAME'));

module.exports.fullName = Joi.string()
  .allow('')
  .error(new Error('INVALID_NAME'));

module.exports.name = Joi.string()
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

module.exports.sortMode = Joi.string()
  .default('desc')
  .valid('', 'asc', 'desc')
  .optional()
  .allow('')
  .error(new Error('INVALID_SORT_MODE'));

module.exports.q = Joi.string()
  .optional()
  .allow('')
  .error(new Error('INVALID_QUERY_SEARCH'));
