const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  adminBookAnalyticsSchema,
  adminCustomerAnalyticsSchema,
  adminStoreSummarySchema,
} = require('@pageaters/shared');

const { assertGuarded, createUser, ids, loadCatalog, startTestApp } = require('./helpers');

// Admin analytics: summary, one book, one customer. Sales are paid/confirmed/shipped/fulfilled orders.

const DAY_MS = 24 * 60 * 60 * 1000;
const missingId = '0123456789abcdef01234567';

let api;
let admin;
let shopper;

const get = async (path, cookie = admin.cookie) => api.request(path, { cookie });

const order = (n, orderStatus, quantity, total) => ({
  userId: shopper.user._id,
  orderId: `OD-${n}`,
  orderStatus,
  total,
  products: [{ product: ids.bookOne, quantity, price: total / quantity, productTotal: total }],
});

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  await loadCatalog();
  admin = await createUser({ role: 'ADMIN' });
  shopper = await createUser();
  const Order = mongoose.model('order');
  await Order.create([
    order(1, 'paid', 2, 500),
    order(2, 'fulfilled', 1, 300),
    order(3, 'cancelled', 1, 250),
    order(4, 'created', 1, 100),
  ]);
  const old = await Order.create(order(5, 'fulfilled', 3, 1000));
  await Order.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 40 * DAY_MS) } });
});

test('analytics routes are ADMIN only', async () => {
  for (const path of ['/analytics/summary', `/analytics/books/${ids.bookOne}`, `/analytics/customers/${missingId}`]) {
    await assertGuarded(api, ['GET', path], { admin: true, userCookie: shopper.cookie });
  }
});

test('GET /analytics/summary counts orders, sales revenue and zero-fills 30 days', async () => {
  const res = await get('/analytics/summary');
  assert.equal(res.status, 200);
  const data = adminStoreSummarySchema.parse(res.body.data);
  assert.deepEqual(data.orders, { total: 5, today: 4, last30Days: 4, byStatus: { paid: 1, fulfilled: 2, cancelled: 1, created: 1 } });
  assert.deepEqual(data.revenue, { total: 1800, last30Days: 800, today: 800 });
  assert.equal(data.customers.total, 1);
  assert.equal(data.salesByDay.length, 30);
  assert.deepEqual(data.salesByDay.at(-1).orders, 2);
  assert.equal(data.salesByDay.reduce((sum, day) => sum + day.revenue, 0), 800);
  assert.deepEqual(data.bestSellers[0], { _id: String(ids.bookOne), title: 'Test Book One', poster: data.bestSellers[0].poster, units: 6, revenue: 1800 });
  assert.equal(data.recentOrders.length, 5);
  assert.equal(data.recentOrders[0].customerName, shopper.user.fullName);
});

test('GET /analytics/books/:id sums sales of the book and zero-fills 12 months', async () => {
  const res = await get(`/analytics/books/${ids.bookOne}`);
  assert.equal(res.status, 200);
  const data = adminBookAnalyticsSchema.parse(res.body.data);
  assert.equal(data.unitsSold, 6);
  assert.equal(data.orderCount, 3);
  assert.equal(data.revenue, 1800);
  assert.equal(data.averageSellingPrice, 300);
  assert.equal(data.cancelledOrReturned, 1);
  assert.equal(data.salesByMonth.length, 12);
  assert.equal(data.salesByMonth.reduce((sum, month) => sum + month.units, 0), 6);
});

test('GET /analytics/customers/:id sums the customer’s orders and sales', async () => {
  const res = await get(`/analytics/customers/${shopper.user._id}`);
  assert.equal(res.status, 200);
  const data = adminCustomerAnalyticsSchema.parse(res.body.data);
  assert.equal(data.orderCount, 5);
  assert.equal(data.saleCount, 3);
  assert.equal(data.totalSpent, 1800);
  assert.equal(data.averageOrderValue, 600);
  assert.equal(data.itemsBought, 6);
  assert.deepEqual(data.ordersByStatus, { paid: 1, fulfilled: 2, cancelled: 1, created: 1 });
  assert.equal(data.recentOrders.length, 5);
});

test('unknown ids answer 404, malformed ids 400', async () => {
  const book = await get(`/analytics/books/${missingId}`);
  assert.equal(book.status, 404);
  assert.equal(book.body.status, 'BOOK_NOT_EXIST');
  const customer = await get(`/analytics/customers/${missingId}`);
  assert.equal(customer.status, 404);
  assert.equal(customer.body.status, 'USER_NOT_FOUND');
  assert.equal((await get('/analytics/books/not-an-id')).status, 400);
});
