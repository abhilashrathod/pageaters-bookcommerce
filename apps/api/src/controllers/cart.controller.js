const { get } = require('lodash');

const { ENVIRONMENT } = require('../appConfig');
const { enums } = require('../constants');
const { handleControllerError } = require('../helpers/appError.helper');
const { cartIdFrom } = require('../helpers/cart-cookie.helper');
const cartBooks = require('../services/cart-books.service');
const cartExtras = require('../services/cart-extras.service');
const cartRead = require('../services/cart-read.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).
// The shopper's cart is addressed by the cart cookie; this controller owns that cookie.

// SameSite=Lax and Secure outside development/test, as the session cookie (PLAN.md 7a/7b): a cross-site form can't
// write to the shopper's cart.
const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: !['development', 'test'].includes(ENVIRONMENT),
};

const cartOf = (req) => ({
  cartId: cartIdFrom(req),
  userId: get(req, 'user.userId', ''),
});

module.exports.retrieve = async (req, res) => {
  try {
    const { cartId, userId } = cartOf(req);
    const cart = await cartRead.getUserCart(cartId, userId);
    // Legacy: the id is an ObjectId, so Express writes the cookie as JSON (`j:"<id>"`).
    res.cookie(enums.TOKEN_ID.CART_COOKIE, cart._id, CART_COOKIE_OPTIONS);
    return res.ok({ message: 'CART_LIST_SUCCESS', data: cart });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const { product, quantity } = req.allParams();
    const data = await cartBooks.addBook({ ...cartOf(req), product, quantity });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const { id, quantity } = req.allParams();
    await cartBooks.setBookQuantity({ ...cartOf(req), id, quantity });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const { id } = req.allParams();
    await cartBooks.removeBook({ ...cartOf(req), id });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// Revokes the cart cookie only; the cart itself is untouched.
module.exports.clear = async (req, res) => {
  res.cookie(enums.TOKEN_ID.CART_COOKIE, '', { ...CART_COOKIE_OPTIONS, expires: new Date(0) });
  return res.ok('CART_DELETE_SUCCESS');
};

module.exports.empty = async (req, res) => {
  try {
    await cartBooks.emptyCart(cartOf(req));
    return res.ok({ message: 'CART_DELETE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* ADMIN */

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await cartRead.listCarts({ page, limit });
    return res.ok({ message: 'CART_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.view = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await cartRead.getCartById(id);
    return res.ok({ message: 'CART_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* BUNDLES */

module.exports.addBundle = async (req, res) => {
  try {
    const { bundle, quantity } = req.allParams();
    await cartExtras.addBundle({ ...cartOf(req), bundle, quantity });
    return res.ok({ message: 'BUNDLE_ADD_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.removeBundle = async (req, res) => {
  try {
    const { bundleId } = req.allParams();
    await cartExtras.removeBundle({ ...cartOf(req), bundleId });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* MYSTERY BOXES */

module.exports.addBox = async (req, res) => {
  try {
    const { box, preferences, quantity } = req.allParams();
    await cartExtras.addBox({ ...cartOf(req), box, preferences, quantity });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.removeBox = async (req, res) => {
  try {
    const { boxId } = req.allParams();
    await cartExtras.removeBox({ ...cartOf(req), boxId });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

/* ADD ONS */

module.exports.addAddon = async (req, res) => {
  try {
    const { addOn, quantity } = req.allParams();
    const { merged, data } = await cartExtras.addAddOn({ ...cartOf(req), addOn, quantity });
    return res.ok({ message: merged ? 'ADD_ON_UPDATE_SUCCESS' : 'CART_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.updateAddonQuantity = async (req, res) => {
  try {
    const { id, quantity } = req.allParams();
    await cartExtras.setAddOnQuantity({ ...cartOf(req), id, quantity });
    return res.ok({ message: 'ADD_ON_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.removeAddon = async (req, res) => {
  try {
    const { addOnId } = req.allParams();
    await cartExtras.removeAddOn({ ...cartOf(req), addOnId });
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
