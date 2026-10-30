const { objectIdSchema } = require('@pageaters/shared');

const { enums } = require('../constants');

// The shopper's cart is addressed by the `_CID` cookie. cookie-parser decodes `j:`-prefixed values as JSON, so a forged
// `_CID=j:{"$ne":null}` would reach the cart queries as a MongoDB operator object; only a 24-hex id counts as a cart.

/**
 * Whether a value is a cart id (a 24-hex ObjectId string).
 * @param {unknown} cartId
 * @returns {boolean}
 */
const isCartId = (cartId) => objectIdSchema.safeParse(cartId).success;

/**
 * The cart id from the request's cart cookie, or undefined when the cookie is missing or isn't a cart id.
 * @param {import('express').Request} req
 * @returns {string | undefined}
 */
const cartIdFrom = (req) => {
  const cartId = req.cookies[enums.TOKEN_ID.CART_COOKIE];
  return isCartId(cartId) ? cartId : undefined;
};

module.exports = { cartIdFrom, isCartId };
