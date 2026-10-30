const mongoose = require('mongoose');

const { models } = require('../constants');
const { generateRandomNumber } = require('../helpers/utils.helper');

// What placing or cancelling an order does outside the order document: book stock, the buyer's cart and the
// store-credit ledger.

const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const Cart = mongoose.model(models.CART);
const User = mongoose.model(models.USER);
const StoreCreditTransaction = mongoose.model(models.STORE_CREDIT_TRANSACTIONS);

const BOOK_STOCK_FIELDS = 'currentDiscount price membersPrice inventory weight';

// Adds `sign × quantity` to the stock of every ordered book and of every book in every ordered bundle. Mystery boxes
// and add-ons keep their stock (legacy). Never fails: the first error (e.g. a book or bundle soft-deleted since the
// order) stops the walk and is swallowed, so later items keep their stock (legacy). Legacy saved each book without
// awaiting it; saves are awaited here, so the stock is final when the request answers.
const moveStock = async (order, sign) => {
  try {
    for (const item of order.products) {
      const book = await Book.findOne({ isDeleted: false, _id: item.product._id }).select(BOOK_STOCK_FIELDS);
      book.inventory = book.inventory + sign * item.quantity;
      await book.save();
    }

    for (const item of order.bundles) {
      const bundle = await Bundle.findOne({ isDeleted: false, _id: item.bundle._id })
        .select('currentDiscount bundledBooks price')
        .populate({ path: 'bundledBooks', select: 'bookId title poster author currentDiscount price inventory weight' });

      for (const bundledBook of bundle.bundledBooks) {
        const book = await Book.findOne({ isDeleted: false, _id: bundledBook._id }).select(BOOK_STOCK_FIELDS);
        book.inventory = book.inventory + sign * item.quantity;
        await book.save();
      }
    }
  } catch {
    // legacy: stock errors never fail the order
  }
};

/**
 * Takes an order's books (and bundled books) out of stock. See `moveStock` for what is skipped.
 * @param {object} order Order whose `products[].product` / `bundles[].bundle` are ids or populated documents.
 * @returns {Promise<void>} Never rejects.
 */
const deductInventory = (order) => moveStock(order, -1);

/**
 * Puts an order's books (and bundled books) back in stock (cancellations).
 * @param {object} order
 * @returns {Promise<void>} Never rejects.
 */
const restoreInventory = (order) => moveStock(order, 1);

/**
 * Empties the user's cart after an order is placed or paid.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const resetCart = async (userId) => {
  await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { products: [], bundles: [], mysteryBoxes: [], addOns: [], subTotal: 0 } },
    { new: true },
  );
};

/**
 * Takes store credit spent on an order off the user's balance and records the DEBIT transaction. The balance is
 * debited with a guarded update (only while it still covers `amount`), so it never goes below 0, even when the same
 * balance was applied to several orders or two debits race. There are no transactions: when recording the DEBIT
 * fails, the balance is put back before the error propagates.
 * @param {string} orderId Order `_id`.
 * @param {string} userId
 * @param {number} amount More than 0.
 * @returns {Promise<import('mongoose').Types.ObjectId | null>} The transaction's `_id`, or null when the balance no
 *   longer covers `amount` (nothing was debited or recorded).
 */
const debitStoreCredit = async (orderId, userId, amount) => {
  // Server-built operator: trusted, so sanitizeFilter (Phase 4 7a) keeps it.
  const debited = await User.findOneAndUpdate(
    { _id: userId, storeCredit: mongoose.trusted({ $gte: amount }) },
    { $inc: { storeCredit: -amount } },
  );
  if (!debited) return null;
  try {
    const transaction = await StoreCreditTransaction.create({
      orderId,
      creditId: `SC-${generateRandomNumber(10)}`,
      userId,
      amount,
      action: 'DEBIT',
    });
    return transaction._id;
  } catch (e) {
    await User.updateOne({ _id: userId }, { $inc: { storeCredit: amount } });
    throw e;
  }
};

/**
 * Undoes a debitStoreCredit whose order could not be completed: puts `amount` back on the balance and deletes the
 * DEBIT transaction. Compensation for a failed later write (there are no MongoDB transactions).
 * @param {import('mongoose').Types.ObjectId} transactionId What debitStoreCredit returned.
 * @param {string} userId
 * @param {number} amount The amount debited.
 * @returns {Promise<void>}
 */
const undoStoreCreditDebit = async (transactionId, userId, amount) => {
  await User.updateOne({ _id: userId }, { $inc: { storeCredit: amount } });
  await StoreCreditTransaction.deleteOne({ _id: transactionId });
};

module.exports = { debitStoreCredit, deductInventory, resetCart, restoreInventory, undoStoreCreditDebit };
