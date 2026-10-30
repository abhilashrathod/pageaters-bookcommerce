const mongoose = require('mongoose');
const { pick } = require('lodash');
const { userSchema } = require('@pageaters/shared');

const { models, enums } = require('../constants');
const { literalPattern } = require('../helpers/search-pattern.helper');

// Admin views of customer accounts (/users). Not the shopper's own profile (auth services).
// Every user leaves this service as the shared `userSchema` fields only: the queries select just those fields and
// `toAdminUser` picks them again, so the password hash, salt, OTP, tokens, rate-limit stamps and `razorPayCustId`
// never leave the database.

const Users = mongoose.model(models.USER);
const Address = mongoose.model(models.ADDRESS);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);

const CART_POPULATE = [
  {
    path: 'products.product',
    select: 'bookId title poster author currentDiscount availability price',
    populate: { path: 'author', select: 'name avatar' },
  },
  { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
  { path: 'mysteryBoxes.box', select: 'boxId title images currentDiscount price' },
];

// The fields of the shared user contract (packages/shared/src/commerce/user.ts), in its order.
const USER_FIELDS = Object.keys(userSchema.shape);
const USER_SELECT = USER_FIELDS.join(' ');

/**
 * A user document (or plain object) as the admin views send it: the `userSchema` fields only.
 * @param {object | null} user
 * @returns {object | null}
 */
const toAdminUser = (user) => (user ? pick(typeof user.toObject === 'function' ? user.toObject() : user, USER_FIELDS) : null);

const ORDER_POPULATE = [
  { path: 'deliveryAddress' },
  {
    path: 'products.product',
    select: 'bookId title poster author currentDiscount price',
    populate: { path: 'author', select: 'name avatar' },
  },
  { path: 'bundles.bundle', select: 'bundleId title poster bundledBooks currentDiscount price' },
  { path: 'boxes.box', select: 'boxId title images currentDiscount price' },
];

/**
 * One page of shopper (USER role) accounts, `userSchema` fields only.
 * Legacy: without `limit` the page has no documents.
 * @param {{ page?, limit? }} paging
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 */
const listUsers = async ({ page, limit }) => {
  const result = await Users.paginate({ role: enums.USER_ROLES.USER }, { page, limit, select: USER_SELECT });
  return { ...result, docs: result.docs.map(toAdminUser) };
};

/**
 * An account (`userSchema` fields only) with its cart, addresses (deleted ones included) and orders, newest
 * first. Unknown ids answer `user: null, cart: null` and empty lists.
 * @param {string} id User id.
 * @returns {Promise<{ user: object | null, cart: object | null, addresses: object[], orders: object[] }>}
 */
const getUserDetails = async (id) => {
  const user = toAdminUser(await Users.findOne({ _id: id }).select(USER_SELECT));
  const cart = await Cart.findOne({ user: id }).populate(CART_POPULATE);
  const addresses = await Address.find({ userId: id });
  const orders = await Order.find({ userId: id })
    .select(`orderId orderDate deliveryAddress orderStatus shipmentTrackingId products boxes bundles total`)
    .sort({ createdAt: -1 })
    .populate(ORDER_POPULATE);

  return { user, cart, addresses, orders };
};

/**
 * Accounts of any role whose email contains `q` as literal text (helpers/search-pattern.helper.js: escaped, at
 * most 100 characters), case-insensitive; `userSchema` fields only.
 * @param {unknown} q
 * @returns {Promise<object[]>} [] for an empty or non-string `q`.
 */
const searchUsers = async (q) => {
  const pattern = literalPattern(q);
  if (!pattern) return [];
  const users = await Users.find({ email: mongoose.trusted({ $regex: pattern, $options: 'i' }) }).select(USER_SELECT);
  return users.map(toAdminUser);
};

module.exports = { getUserDetails, listUsers, searchUsers, toAdminUser };
