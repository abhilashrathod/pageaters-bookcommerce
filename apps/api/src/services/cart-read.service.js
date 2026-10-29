const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { priceCart, priceCartForAdmin } = require('./cart-pricing.service');

// Cart reads: the shopper's priced cart, and the admin list and view. Also the cart lookup the mutation services
// share. A shopper's cart is addressed by the cart cookie and must belong to the session's user.

const Cart = mongoose.model(models.CART);

const CART_POPULATE = [
  {
    path: 'products.product',
    select: 'bookId title poster author currentDiscount availability price',
    populate: { path: 'author', select: 'name avatar' },
  },
  { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
  { path: 'addOns.addOn', select: 'name poster currentDiscount price' },
  { path: 'mysteryBoxes.box', select: 'boxId title images currentDiscount price' },
];

/**
 * The user's cart document, optionally populated.
 * @param {string} cartId From the cart cookie.
 * @param {string} userId
 * @param {object | object[]} [populate] Mongoose populate options.
 * @returns {Promise<object>} The cart document.
 * @throws {AppError} CART_NOT_EXIST (400) when there is no such cart for this user. A cart id that is not an ObjectId
 *   fails the cast (500, legacy).
 */
const findUserCart = async (cartId, userId, populate) => {
  const query = Cart.findOne({ _id: cartId, user: userId });
  const cart = await (populate ? query.populate(populate) : query);
  if (!cart) throw new AppError('CART_NOT_EXIST');
  return cart;
};

/**
 * The user's cart, populated and priced (see cart-pricing.service).
 * @param {string} cartId From the cart cookie.
 * @param {string} userId
 * @returns {Promise<object>} The cart as a plain object with line totals and `subTotal`.
 * @throws {AppError} CART_NOT_EXIST (400).
 */
const getUserCart = async (cartId, userId) => {
  const cart = await findUserCart(cartId, userId, CART_POPULATE);
  return priceCart(cart.toObject());
};

/**
 * Admin: one cart by id, populated and priced for the admin view (legacy: subTotal is always 0, see
 * priceCartForAdmin).
 * @param {string} id Cart id.
 * @returns {Promise<object>} The cart as a plain object.
 * @throws {AppError} CART_NOT_EXIST (400).
 */
const getCartById = async (id) => {
  const cart = await Cart.findOne({ _id: id }).populate(CART_POPULATE);
  if (!cart) throw new AppError('CART_NOT_EXIST');
  return priceCartForAdmin(cart.toObject());
};

/**
 * Admin: a page of carts with the owner's name and email.
 * Legacy: without `page`/`limit` the page has no documents.
 * @param {{ page?: string | number, limit?: string | number }} paging
 * @returns {Promise<object>} mongoose-paginate-v2 result.
 */
const listCarts = ({ page, limit }) =>
  Cart.paginate({}, { page, limit, populate: { path: 'user', select: 'fullName email' } });

module.exports = { findUserCart, getCartById, getUserCart, listCarts };
