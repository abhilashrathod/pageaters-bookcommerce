const mongoose = require('mongoose');
const { ANALYTICS_SALE_STATUSES } = require('@pageaters/shared');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');

// Admin analytics (GET /analytics/*). Shapes: `responses/admin/analytics.ts` in @pageaters/shared. A "sale" is an
// order in ANALYTICS_SALE_STATUSES; days and months are Asia/Kolkata (UTC+5:30, no DST), oldest first, zero-filled.
// Every `$match` holds only ObjectIds built here from validated route ids, Dates and constants.

const Order = mongoose.model(models.ORDER);
const User = mongoose.model(models.USER);
const StoreBook = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const Author = mongoose.model(models.AUTHOR);
const Cart = mongoose.model(models.CART);
const Favorites = mongoose.model(models.FAVORITES);
const StockAlert = mongoose.model(models.STOCK_ALERT);

const TZ = 'Asia/Kolkata';
const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SALE = { orderStatus: { $in: [...ANALYTICS_SALE_STATUSES] } };
const { CANCELLED, RETURNED } = enums.ORDER_STAGES;
// Query filters (not aggregations) go through sanitizeFilter, so an operator built here is marked trusted.
const since = (date) => mongoose.trusted({ $gte: date });

// ----- Kolkata calendar helpers -----

const kolkataDay = (date) => new Date(date.getTime() + IST_MS).toISOString().slice(0, 10);
const startOfKolkataDay = (now) => new Date(Math.floor((now.getTime() + IST_MS) / DAY_MS) * DAY_MS - IST_MS);

// The last `n` Kolkata days (YYYY-MM-DD) incl. today, oldest first.
const lastDays = (now, n) => Array.from({ length: n }, (_, i) => kolkataDay(new Date(now.getTime() - (n - 1 - i) * DAY_MS)));

// The last `n` Kolkata months (YYYY-MM) incl. this one, oldest first, and the instant the first one starts.
const lastMonths = (now, n) => {
  const local = new Date(now.getTime() + IST_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const keys = Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - (n - 1 - i), 1)).toISOString().slice(0, 7));
  return { keys, start: new Date(Date.UTC(y, m - (n - 1), 1) - IST_MS) };
};

// Maps grouped rows `{ _id: key, ...values }` onto `keys`, zero-filling the gaps.
const fill = (keys, rows, keyName, empty) => {
  const byKey = new Map(rows.map(({ _id, ...values }) => [_id, values]));
  return keys.map((key) => ({ [keyName]: key, ...empty, ...byKey.get(key) }));
};

const toCounts = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]));

const recentOrders = async (filter) => {
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(5).populate('userId', 'fullName').lean();
  return orders.map((o) => ({
    _id: String(o._id),
    uniqueId: o.orderId,
    status: o.orderStatus,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    customerName: o.userId?.fullName || '',
  }));
};

// ----- GET /analytics/summary -----

const orderCounts = async (today, from30) => {
  const [total, todayCount, last30Days, byStatus] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: since(today) }),
    Order.countDocuments({ createdAt: since(from30) }),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
  ]);
  return { total, today: todayCount, last30Days, byStatus: toCounts(byStatus) };
};

const totalSince = (date) => ({ $sum: { $cond: [{ $gte: ['$createdAt', date] }, '$total', 0] } });

const revenue = async (today, from30) => {
  const [row] = await Order.aggregate([
    { $match: SALE },
    { $group: { _id: null, total: { $sum: '$total' }, last30Days: totalSince(from30), today: totalSince(today) } },
  ]);
  return { total: row?.total ?? 0, last30Days: row?.last30Days ?? 0, today: row?.today ?? 0 };
};

const customers = async (from30) => {
  const [total, newLast30Days] = await Promise.all([
    User.countDocuments({ role: enums.USER_ROLES.USER }),
    User.countDocuments({ role: enums.USER_ROLES.USER, createdAt: since(from30) }),
  ]);
  return { total, newLast30Days };
};

const catalog = async () => {
  const live = { isDeleted: false };
  const [books, outOfStock, bundles, authors] = await Promise.all([
    StoreBook.countDocuments(live),
    StoreBook.countDocuments({ ...live, inventory: mongoose.trusted({ $lte: 0 }) }),
    Bundle.countDocuments(live),
    Author.countDocuments(live),
  ]);
  return { books, outOfStock, bundles, authors };
};

const salesByDay = async (now, from30) => {
  const rows = await Order.aggregate([
    { $match: { ...SALE, createdAt: { $gte: from30 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
  ]);
  return fill(lastDays(now, 30), rows, 'date', { orders: 0, revenue: 0 });
};

const bestSellers = () =>
  Order.aggregate([
    { $match: SALE },
    { $unwind: '$products' },
    { $group: { _id: '$products.product', units: { $sum: '$products.quantity' }, revenue: { $sum: '$products.productTotal' } } },
    { $sort: { units: -1, _id: 1 } },
    { $limit: 5 },
    { $lookup: { from: StoreBook.collection.name, localField: '_id', foreignField: '_id', as: 'book' } },
    { $set: { book: { $arrayElemAt: ['$book', 0] } } },
    { $project: { _id: { $toString: '$_id' }, title: { $ifNull: ['$book.title', ''] }, poster: { $ifNull: ['$book.poster', ''] }, units: 1, revenue: 1 } },
  ]);

/** The admin dashboard's numbers. */
const summary = async (now = new Date()) => {
  const today = startOfKolkataDay(now);
  const from30 = new Date(today.getTime() - 29 * DAY_MS);
  const [orders, revenueTotals, customerCounts, catalogCounts, days, best, recent] = await Promise.all([
    orderCounts(today, from30),
    revenue(today, from30),
    customers(from30),
    catalog(),
    salesByDay(now, from30),
    bestSellers(),
    recentOrders({}),
  ]);
  return {
    orders,
    revenue: revenueTotals,
    customers: customerCounts,
    catalog: catalogCounts,
    salesByDay: days,
    bestSellers: best,
    recentOrders: recent,
  };
};

// ----- GET /analytics/books/:id -----

// Sales lines of one book, one row per line.
const bookLines = (bookId, extraMatch = {}) => [
  { $match: { ...SALE, ...extraMatch, 'products.product': bookId } },
  { $unwind: '$products' },
  { $match: { 'products.product': bookId } },
];

const bookTotals = async (bookId) => {
  const [row] = await Order.aggregate([
    ...bookLines(bookId),
    {
      $group: {
        _id: null,
        unitsSold: { $sum: '$products.quantity' },
        revenue: { $sum: '$products.productTotal' },
        orders: { $addToSet: '$_id' },
        firstSoldAt: { $min: '$createdAt' },
        lastSoldAt: { $max: '$createdAt' },
      },
    },
  ]);
  if (!row) return { unitsSold: 0, orderCount: 0, revenue: 0, averageSellingPrice: 0, firstSoldAt: null, lastSoldAt: null };
  return {
    unitsSold: row.unitsSold,
    orderCount: row.orders.length,
    revenue: row.revenue,
    averageSellingPrice: row.unitsSold ? row.revenue / row.unitsSold : 0,
    firstSoldAt: row.firstSoldAt.toISOString(),
    lastSoldAt: row.lastSoldAt.toISOString(),
  };
};

const bookSalesByMonth = async (bookId, now) => {
  const { keys, start } = lastMonths(now, 12);
  const rows = await Order.aggregate([
    ...bookLines(bookId, { createdAt: { $gte: start } }),
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } },
        units: { $sum: '$products.quantity' },
        revenue: { $sum: '$products.productTotal' },
      },
    },
  ]);
  return fill(keys, rows, 'month', { units: 0, revenue: 0 });
};

/**
 * One store book's sales and interest.
 * @param {string} id Validated ObjectId.
 * @throws {AppError} BOOK_NOT_EXIST (404) when there is no such book.
 */
const book = async (id, now = new Date()) => {
  const bookId = new mongoose.Types.ObjectId(id);
  if (!(await StoreBook.exists({ _id: bookId }))) throw new AppError('BOOK_NOT_EXIST', { status: 404 });
  const [totals, cancelledOrReturned, inCarts, inFavourites, pendingStockAlerts, salesByMonth] = await Promise.all([
    bookTotals(bookId),
    Order.countDocuments({ orderStatus: mongoose.trusted({ $in: [CANCELLED, RETURNED] }), 'products.product': bookId }),
    Cart.countDocuments({ isDeleted: false, 'products.product': bookId }),
    Favorites.countDocuments({ wishlist: bookId }),
    StockAlert.countDocuments({ isDeleted: false, product: bookId }),
    bookSalesByMonth(bookId, now),
  ]);
  return { ...totals, cancelledOrReturned, inCarts, inFavourites, pendingStockAlerts, salesByMonth };
};

// ----- GET /analytics/customers/:id -----

const customerOrders = async (userId) => {
  const rows = await Order.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        first: { $min: '$createdAt' },
        last: { $max: '$createdAt' },
        spent: { $sum: '$total' },
        items: { $sum: { $sum: '$products.quantity' } },
      },
    },
  ]);
  const sales = rows.filter((row) => ANALYTICS_SALE_STATUSES.includes(row._id));
  const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
  const dates = (key) => rows.map((row) => row[key].getTime());
  const saleCount = sum(sales, 'count');
  const totalSpent = sum(sales, 'spent');
  return {
    orderCount: sum(rows, 'count'),
    saleCount,
    totalSpent,
    averageOrderValue: saleCount ? totalSpent / saleCount : 0,
    itemsBought: sum(sales, 'items'),
    firstOrderAt: rows.length ? new Date(Math.min(...dates('first'))).toISOString() : null,
    lastOrderAt: rows.length ? new Date(Math.max(...dates('last'))).toISOString() : null,
    ordersByStatus: toCounts(rows),
  };
};

/**
 * One customer's orders, spend, favourites and store credit.
 * @param {string} id Validated ObjectId.
 * @throws {AppError} USER_NOT_FOUND (404) when there is no such user.
 */
const customer = async (id) => {
  const userId = new mongoose.Types.ObjectId(id);
  const user = await User.findOne({ _id: userId }).select('storeCredit').lean();
  if (!user) throw new AppError('USER_NOT_FOUND', { status: 404 });
  const [orders, favorites, recent] = await Promise.all([
    customerOrders(userId),
    Favorites.findOne({ userId }).select('wishlist bundles').lean(),
    recentOrders({ userId }),
  ]);
  return {
    ...orders,
    favouritesCount: (favorites?.wishlist?.length ?? 0) + (favorites?.bundles?.length ?? 0),
    storeCreditBalance: user.storeCredit ?? 0,
    recentOrders: recent,
  };
};

module.exports = { summary, book, customer };
