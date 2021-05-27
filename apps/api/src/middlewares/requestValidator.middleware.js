const Joi = require('joi');

module.exports = schema => {
  return (req, res, next) => {
    const params = req.allParams();

    const valid = Joi.validate(params, schema);

    if (valid.error) {
      return res.error(valid.error);
    }

    next();
  };
};
