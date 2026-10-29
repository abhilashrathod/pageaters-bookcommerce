const mongoose = require('mongoose');

const { models, enums } = require('../constants');

// Admin views of customer accounts (/users). Not the shopper's own profile (auth services).
// Legacy (fixed in the security step): every function here answers full user documents — password hash, salt,
// OTP, tokens and `razorPayCustId` included — instead of mapping through the shared user schema.

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
 * One page of shopper (USER role) accounts. Legacy: full documents; without `limit` the page has no documents.
 * @param {{ page?, limit? }} paging
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 */
const listUsers = ({ page, limit }) => Users.paginate({ role: enums.USER_ROLES.USER }, { page, limit });

/**
 * "Updates" a user. Legacy (fixed in the legacy-bugs step): runs `findOneAndUpdate({})` with no filter and no
 * update, so nothing changes and it answers the first user in the collection, whatever was asked.
 * @returns {Promise<object | null>} The first user document (full).
 */
const updateUser = () => Users.findOneAndUpdate({});

/**
 * An account with its cart, addresses (deleted ones included) and orders, newest first. Unknown ids answer
 * `user: null, cart: null` and empty lists.
 * @param {string} id User id.
 * @returns {Promise<{ user: object | null, cart: object | null, addresses: object[], orders: object[] }>}
 */
const getUserDetails = async (id) => {
  const user = await Users.findOne({ _id: id });
  const cart = await Cart.findOne({ user: id }).populate(CART_POPULATE);
  const addresses = await Address.find({ userId: id });
  const orders = await Order.find({ userId: id })
    .select(`orderId orderDate deliveryAddress orderStatus shipmentTrackingId products boxes bundles total`)
    .sort({ createdAt: -1 })
    .populate(ORDER_POPULATE);

  return { user, cart, addresses, orders };
};

/**
 * Accounts of any role whose email matches `q`, case-insensitive.
 * Legacy (fixed in the security step): `q` goes into `$regex` unescaped (regex injection / ReDoS; an invalid
 * pattern is a 500).
 * @param {string} q
 * @returns {Promise<object[]>} Full user documents.
 */
const searchUsers = (q) => Users.find({ email: { $regex: q, $options: 'i' } });

module.exports = { getUserDetails, listUsers, searchUsers, updateUser };
