const mongoose = require('mongoose');

const { models } = require('../constants');

// Admin sales analytics.
//
// Legacy (PLAN.md legacy-bugs step): both reports always answer []. `startDate`/`endDate` arrive as query strings
// and are compared with the `createdAt` dates, which never match a string; best-selling also matches `status`, a
// field orders don't have (it is `orderStatus`).

const Order = mongoose.model(models.ORDER);

/**
 * The ten best-selling books by quantity in fulfilled orders created in [startDate, endDate).
 * @param {{ startDate?: string, endDate?: string }} range
 * @returns {Promise<{ totalQuantity: number, bookDetails: { _id: unknown, title: string, author: unknown } }[]>}
 */
const bestSellingBooks = ({ startDate, endDate }) =>
  Order.aggregate([
    { $match: { status: 'fulfilled', createdAt: { $gte: startDate, $lt: endDate } } },
    { $unwind: '$products' },
    { $group: { _id: '$products.product', totalQuantity: { $sum: '$products.quantity' } } },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'storebooks', localField: '_id', foreignField: '_id', as: 'bookDetails' } },
    { $project: { _id: 0, totalQuantity: 1, bookDetails: { $arrayElemAt: ['$bookDetails', 0] } } },
    {
      $project: {
        totalQuantity: 1,
        bookDetails: { _id: '$bookDetails._id', title: '$bookDetails.title', author: '$bookDetails.author' },
      },
    },
  ]).exec();

/**
 * Revenue (sum of order totals) of fulfilled orders created in [startDate, endDate).
 * @param {{ startDate?: string, endDate?: string }} range
 * @returns {Promise<{ totalRevenue: number }[]>}
 */
const revenue = ({ startDate, endDate }) =>
  Order.aggregate([
    { $match: { orderStatus: 'fulfilled', createdAt: { $gte: startDate, $lt: endDate } } },
    { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    { $project: { _id: 0, totalRevenue: 1 } },
  ]).exec();

module.exports = { bestSellingBooks, revenue };
