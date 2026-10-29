const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const sendMailQueue = require('../helpers/sendMailQueue.helper');

// Back-in-stock alerts: a shopper subscribes to a store book; an admin sends the alerts, which closes them.
// Alerts are soft-deleted (`isDeleted`), never removed.

const StockAlert = mongoose.model(models.STOCK_ALERT);

const SUBSCRIBER_POPULATE = [
  { path: 'user', select: 'fullName email contactNo' },
  { path: 'product', select: `title bookId poster price currentDiscount` },
];

const activeAlert = (userId, product) => StockAlert.findOne({ user: userId, product, isDeleted: false });

/**
 * One page of products with open alerts: `{ _id: productId, totalProducts: count }` per product.
 * Legacy: `totalDocs` counts the matching alerts, not the product groups; without `limit` the page is empty.
 * @param {{ page?: number | string, limit?: number | string }} paging
 * @returns {Promise<object>} The mongoose-aggregate-paginate-v2 result.
 */
const listProductsWithAlerts = ({ page, limit }) => {
  const stockAggregate = StockAlert.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$product', totalProducts: { $sum: 1 } } },
  ]);
  return StockAlert.aggregatePaginate(stockAggregate, { page, limit });
};

/**
 * The open alerts for a product, with the subscriber's name, email and phone and the product summary.
 * @param {string} product Store book id.
 * @returns {Promise<object[]>}
 */
const listSubscribers = (product) => StockAlert.find({ isDeleted: false, product }).populate(SUBSCRIBER_POPULATE);

/**
 * Queues a STOCK_ALERT email for every open alert on a product and closes them all.
 * Legacy: the STOCK_ALERT template ships only `en.html` while the mail queue renders `en.ejs`, so no email is ever
 * sent; the email links point at the reserved root domain (fixed in the security step).
 * @param {string} product Store book id.
 * @returns {Promise<number>} How many alerts were closed.
 */
const sendAlerts = async (product) => {
  const query = { isDeleted: false, product };
  const subscribersRes = await StockAlert.find(query).populate(SUBSCRIBER_POPULATE);

  for (const alert of subscribersRes) {
    const sub = alert.toObject();
    sendMailQueue.add({
      emailModule: 'STOCK_ALERT',
      to: sub.user.email,
      data: {
        NAME: sub.user.fullName,
        PRODUCT: sub.product.title,
        LINK: `https://pageaters.com/book/${sub.product.bookId}`,
        IMAGE: sub.product.poster,
        PRICE: sub.product.price,
      },
    });
  }

  await StockAlert.updateMany(query, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true });

  return subscribersRes.length;
};

/**
 * Whether the user has an open alert for a product.
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<boolean>}
 */
const isSubscribed = async (userId, product) => Boolean(await activeAlert(userId, product));

/**
 * Opens an alert for the user on a product. Legacy: the product is not checked to exist; a malformed id is a 500.
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<object>} The new alert document.
 * @throws {AppError} STOCK_ALERT_EXISTS (400) when the user already has an open alert for it.
 */
const subscribe = async (userId, product) => {
  if (await activeAlert(userId, product)) throw new AppError('STOCK_ALERT_EXISTS');
  return StockAlert.create({ user: userId, product });
};

/**
 * Closes the user's open alert on a product (soft delete).
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<void>}
 * @throws {AppError} STOCK_ALERT_EXISTS (400) when there is no open alert (legacy: the wrong key).
 */
const unsubscribe = async (userId, product) => {
  const alert = await activeAlert(userId, product);
  if (!alert) throw new AppError('STOCK_ALERT_EXISTS');

  alert.isDeleted = true;
  alert.deletedAt = new Date();
  await alert.save();
};

module.exports = { isSubscribed, listProductsWithAlerts, listSubscribers, sendAlerts, subscribe, unsubscribe };
