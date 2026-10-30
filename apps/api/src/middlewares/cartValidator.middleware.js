const { get } = require('lodash');
const { cartIdFrom } = require('../helpers/cart-cookie.helper');

// A missing cart cookie, or one that isn't a cart id (helpers/cart-cookie.helper.js), answers 400 CART_NOT_EXIST.
module.exports = () => async (req, res, next) => {
  const userId = get(req, 'user.userId', '');

  if (!cartIdFrom(req)) return res.error('CART_NOT_EXIST');

  if (!userId) return res.unauthorized('NO_AUTH_HEADER');

  next();
};
