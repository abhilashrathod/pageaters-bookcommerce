const mongoose = require('mongoose');

const { demo, enums, models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { addBook } = require('./cart-books.service');
const { attemptOrder, placeOrder } = require('./order-checkout.service');
const { resetCart, restoreInventory } = require('./order-fulfilment.service');
const { cancelByAdmin, completeShipment, shipOrder } = require('./order-lifecycle.service');

// The weekly demo cleanup (DEMO_MODE, GET /demo/cleanup): wipes what visitors left (orders, carts, addresses,
// favourites, newsletter sign-ups, stock alerts, the outbox), puts the seeded address back as seeded, puts back the stock those orders took, resets the demo accounts' names, then places a
// small set of sample orders for the demo shopper through the order services, one per lifecycle stage (their
// e-mails land in the fresh outbox).

const { ATTEMPTED, CREATED, CANCELLED } = enums.ORDER_STAGES;

const User = mongoose.model(models.USER);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Address = mongoose.model(models.ADDRESS);
const Favorites = mongoose.model(models.FAVORITES);
const Book = mongoose.model(models.STORE_BOOK);
const Outbox = mongoose.model(models.OUTBOX);
const Subscriber = mongoose.model(models.SUBSCRIBER);
const StockAlert = mongoose.model(models.STOCK_ALERT);

// One sample order per stage: placed (COD, confirmed), shipped, delivered (fulfilled), cancelled by the admin.
const SAMPLE_STAGES = ['confirmed', 'shipped', 'fulfilled', 'cancelled'];

// Puts back the stock of every order past checkout that wasn't cancelled (a cancellation already put it back), then
// deletes every order.
const removeOrders = async () => {
  const placed = await Order.find({ orderStatus: mongoose.trusted({ $nin: [ATTEMPTED, CREATED, CANCELLED] }) });
  for (const order of placed) await restoreInventory(order);
  const { deletedCount } = await Order.deleteMany({});
  return deletedCount;
};

const resetVisitorData = async (shopper) => {
  await Cart.deleteMany({ user: mongoose.trusted({ $ne: shopper._id }) });
  await resetCart(shopper._id);
  await Address.deleteMany({ _id: mongoose.trusted({ $ne: demo.DEMO_SHOPPER_ADDRESS_ID }) });
  await Address.updateOne({ _id: demo.DEMO_SHOPPER_ADDRESS_ID }, { $set: demo.DEMO_SHOPPER_ADDRESS });
  await Favorites.updateMany({}, { $set: { wishlist: [], deals: [], collections: [], bundles: [] } });
  await Outbox.deleteMany({});
  await Subscriber.deleteMany({});
  await StockAlert.deleteMany({});
  await User.updateOne({ email: demo.DEMO_SHOPPER_EMAIL }, { $set: { fullName: 'Demo Shopper' } });
  await User.updateOne({ email: demo.DEMO_ADMIN_EMAIL }, { $set: { fullName: 'Demo Admin' } });
};

// Places one COD order of one book, then moves it on to `stage` as the admin would.
const placeSample = async (shopper, cartId, book, stage) => {
  const userId = String(shopper._id);
  await addBook({ cartId, userId, product: String(book._id) });
  await attemptOrder(userId, cartId, demo.DEMO_SHOPPER_ADDRESS_ID);
  const { orderId } = await placeOrder(userId, cartId, { method: 'cod' });
  const order = await Order.findOne({ orderId }).select('_id');
  if (stage === 'shipped' || stage === 'fulfilled') await shipOrder(order._id, `DEMO-${orderId}`);
  if (stage === 'fulfilled') await completeShipment(order._id);
  if (stage === 'cancelled') await cancelByAdmin({ uniqueId: orderId, userId, reason: 'Sample cancellation' });
  return { orderId, stage };
};

/**
 * Runs the weekly cleanup (see the module header).
 * @returns {Promise<{ ordersRemoved: number, sampleOrders: { orderId: string, stage: string }[] }>}
 * @throws {AppError} DEMO_ACCOUNT_MISSING (503) when the seed (demo shopper, its cart or address) hasn't been loaded.
 */
const runCleanup = async () => {
  const shopper = await User.findOne({ email: demo.DEMO_SHOPPER_EMAIL, isDeleted: false });
  const cart = shopper && (await Cart.findOne({ user: shopper._id }).select('_id'));
  const address = await Address.exists({ _id: demo.DEMO_SHOPPER_ADDRESS_ID });
  if (!shopper || !cart || !address) throw new AppError('DEMO_ACCOUNT_MISSING', { status: 503 });

  const ordersRemoved = await removeOrders();
  await resetVisitorData(shopper);

  const books = await Book.find({
    isDeleted: false,
    availability: enums.BOOK_AVAILABILITY.AVAILABLE,
    inventory: mongoose.trusted({ $gte: 5 }),
  })
    .sort({ _id: 1 })
    .limit(SAMPLE_STAGES.length)
    .select('_id');
  const sampleOrders = [];
  for (const [index, book] of books.entries()) {
    sampleOrders.push(await placeSample(shopper, String(cart._id), book, SAMPLE_STAGES[index]));
  }
  return { ordersRemoved, sampleOrders };
};

module.exports = { runCleanup };
