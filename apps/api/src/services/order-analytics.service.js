const mongoose = require('mongoose');

const { models, enums } = require('../constants');

// Admin sales analytics over fulfilled orders created in [startDate, endDate).
//
// The routes validate the range first (`adminOrderAnalyticsQuerySchema` from `@pageaters/shared`: two ISO date-times
// with an offset, start strictly before end), because an aggregation's `$match` is not sanitised the way a query
// filter is (sanitizeFilter). Here they become Dates, the type `createdAt` holds (legacy compared the strings, which
// never matched, and best-selling matched `status`, a field orders don't have, so both always answered []).

const Order = mongoose.model(models.ORDER);

const { FULFILLED } = enums.ORDER_STAGES;

// Fulfilled orders created in [startDate, endDate).
const fulfilledIn = ({ startDate, endDate }) => ({
  $match: { orderStatus: FULFILLED, createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) } },
});

/**
 * The ten best-selling books by quantity in fulfilled orders created in [startDate, endDate).
 * @param {{ startDate: string, endDate: string }} range Validated ISO date-times.
 * @returns {Promise<{ totalQuantity: number, bookDetails: { _id: unknown, title: string, author: unknown } }[]>}
 */
const bestSellingBooks = (range) =>
  Order.aggregate([
    fulfilledIn(range),
    { $unwind: '$products' },
    { $group: { _id: '$products.product', totalQuantity: { $sum: '$products.quantity' } } },
    { $sort: { totalQuantity: -1, _id: 1 } },
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
 * @param {{ startDate: string, endDate: string }} range Validated ISO date-times.
 * @returns {Promise<{ totalRevenue: number }[]>} [] when there is no such order.
 */
const revenue = (range) =>
  Order.aggregate([
    fulfilledIn(range),
    { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    { $project: { _id: 0, totalRevenue: 1 } },
  ]).exec();

module.exports = { bestSellingBooks, revenue };
