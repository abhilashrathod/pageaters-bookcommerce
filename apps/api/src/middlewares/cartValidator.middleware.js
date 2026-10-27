const { get } = require('lodash');
const { enums } = require('../constants');

module.exports = fn => async (req, res, next) => {
  const cart  = req.cookies[enums.TOKEN_ID.CART_COOKIE];
  const userId = get(req, 'user.userId', '');

  if (!cart) return res.error('CART_NOT_EXIST');

  if (!userId) return res.unauthorized('NO_AUTH_HEADER');

  next();
};
