const { get } = require('lodash');

module.exports = fn => async (req, res, next) => {
  const { cart } = req.cookies;
  const userId = get(req, 'user.userId', '');

  if (!cart) return res.error('CART_NOT_EXIST');

  if (!userId) return res.unauthorized('NO_AUTH_HEADER');

  next();
};
