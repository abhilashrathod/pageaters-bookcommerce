const mongoose = require('mongoose');
const { get } = require('lodash');

const { models } = require('../constants');
const { logger } = require('../helpers/logger.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');

// What placing, cancelling or refunding an order does outside the order document: book stock, the buyer's cart and
// the store-credit ledger.

const Order = mongoose.model(models.ORDER);
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
 * Undoes a debitStoreCredit whose order could not be completed (compensation for a failed later write; there are no
 * MongoDB transactions): puts `amount` back on the balance, then deletes the DEBIT transaction. Never rejects: what
 * could not be done is logged with the order id, the transaction id and the amount, so a person can finish it.
 * @param {{ orderId: string, userId: unknown }} order
 * @param {import('mongoose').Types.ObjectId} transactionId What debitStoreCredit returned.
 * @param {number} amount The amount debited.
 * @returns {Promise<void>}
 */
const undoStoreCreditDebit = async (order, transactionId, amount) => {
  try {
    await User.updateOne({ _id: order.userId }, { $inc: { storeCredit: amount } });
  } catch (e) {
    logger.error({ err: e }, `Order ${order.orderId}: store credit ${amount} of DEBIT transaction ${transactionId} may not have been given back; check the balance before crediting it by hand`);
    return;
  }
  await StoreCreditTransaction.deleteOne({ _id: transactionId }).catch((e) => {
    logger.error({ err: e }, `Order ${order.orderId}: store credit ${amount} given back, but DEBIT transaction ${transactionId} could not be deleted`);
  });
};

/** MongoDB's duplicate-key error code. */
const DUPLICATE_KEY = 11000;

/**
 * Records the CREDIT transaction that gives back the store credit an order spent (a full refund). Idempotent, keyed by
 * the order: its `creditId` is `RF-<order _id>`, unique among `RF-` ids (index `one_refund_credit_per_order`), so a
 * retry or a concurrent call finds the one row instead of adding another. Of two concurrent upserts that both insert,
 * the loser's duplicate key is retried once, and then finds the row. The balance is not touched (addToBalance).
 * @param {import('mongoose').Types.ObjectId} orderId Order `_id`.
 * @param {string} userId
 * @param {number} amount More than 0.
 * @returns {Promise<string>} The transaction's `creditId`.
 */
const recordStoreCreditReturn = async (orderId, userId, amount) => {
  const creditId = `RF-${orderId}`;
  const upsert = () =>
    StoreCreditTransaction.findOneAndUpdate({ creditId }, { $setOnInsert: { orderId, userId, amount, action: 'CREDIT' } }, { upsert: true, new: true });
  await upsert().catch((e) => {
    if (e && e.code === DUPLICATE_KEY) return upsert();
    throw e;
  });
  return creditId;
};

/**
 * Adds a recorded credit to the user's balance, once per `creditId`: one conditional update on the user adds `amount`
 * and records the id in `appliedCreditIds` together, so a retry (after a crash, a lost acknowledgement or a concurrent
 * call) finds it applied and adds nothing.
 * @param {string} userId
 * @param {string} creditId The transaction's `creditId`.
 * @param {number} amount
 * @returns {Promise<'applied' | 'already-applied' | 'no-user'>} What happened; `no-user` when the user is missing.
 */
const addToBalance = async (userId, creditId, amount) => {
  // Server-built operator: trusted, so sanitizeFilter (Phase 4 7a) keeps it.
  const added = await User.updateOne(
    { _id: userId, appliedCreditIds: mongoose.trusted({ $ne: creditId }) },
    { $inc: { storeCredit: amount }, $push: { appliedCreditIds: creditId } },
  );
  if (added.matchedCount === 1) return 'applied';
  return (await User.exists({ _id: userId })) ? 'already-applied' : 'no-user';
};

// order.storeCreditReturn (order.model.js): giving back the store credit a cancelled or refunded order spent.
const STORE_CREDIT_RETURN = Object.freeze({ PENDING: 'pending', CREDITING: 'crediting', RETURNED: 'returned' });

/**
 * Whether an order's store credit is still to be given back by a cancel or a full refund: it spent credit (a debit
 * is linked) and no return was started. A return is started at most once per order, by whichever of the two comes
 * first, with `storeCreditReturn: null` in the same conditional update that records it.
 * @param {{ storeCredit?: number, storeCreditTransaction?: unknown, storeCreditReturn?: string }} order
 * @returns {boolean}
 */
const givesStoreCreditBack = (order) => order.storeCredit > 0 && Boolean(order.storeCreditTransaction) && !order.storeCreditReturn;

/**
 * Whether an order's store credit return is started but unfinished (`pending` or `crediting`).
 * @param {{ storeCreditReturn?: string }} order
 * @returns {boolean}
 */
const returnUnfinished = (order) =>
  order.storeCreditReturn === STORE_CREDIT_RETURN.PENDING || order.storeCreditReturn === STORE_CREDIT_RETURN.CREDITING;

/**
 * Gives back the store credit a cancelled or refunded order spent, from `storeCreditReturn` `pending` or `crediting`.
 * Every step is idempotent, so a retry or a concurrent call finishes it without giving anything twice: record the
 * CREDIT row (recordStoreCreditReturn), mark it `crediting`, add it to the balance once (addToBalance), mark it
 * `returned`.
 * @param {object} order The order (`_id`, `orderId`, `userId` as an id or the populated user, `storeCredit`).
 * @param {{ label: string, retry: string }} context For the logs: what the order is (`Refunded order`) and what
 *   retries the return (`a redelivered refund event`).
 * @returns {Promise<void>} Rejects when a step failed (left `pending` or `crediting`, logged). A missing user is
 *   logged and left `crediting`.
 */
const finishStoreCreditReturn = async (order, { label, retry }) => {
  const userId = get(order, 'userId._id', order.userId);
  const what = `${label} ${order.orderId}`;
  const creditId = await recordStoreCreditReturn(order._id, userId, order.storeCredit);
  try {
    await Order.updateOne(
      { _id: order._id, storeCreditReturn: STORE_CREDIT_RETURN.PENDING },
      { $set: { storeCreditReturn: STORE_CREDIT_RETURN.CREDITING } },
    );
  } catch (e) {
    logger.error({ err: e }, `${what}: CREDIT transaction ${creditId} is recorded, but marking the return crediting failed; ${retry} retries it`);
    throw e;
  }

  let outcome;
  try {
    outcome = await addToBalance(userId, creditId, order.storeCredit);
  } catch (e) {
    logger.error({ err: e }, `${what}: adding CREDIT transaction ${creditId} (${order.storeCredit}) to the balance failed; ${retry} retries it`);
    throw e;
  }
  if (outcome === 'no-user') {
    logger.error(`${what}: its user no longer exists, so CREDIT transaction ${creditId} is on no balance`);
    return;
  }

  // Server-built operator: trusted, so sanitizeFilter (Phase 4 7a) keeps it.
  const unfinished = mongoose.trusted({ $in: [STORE_CREDIT_RETURN.PENDING, STORE_CREDIT_RETURN.CREDITING] });
  try {
    await Order.updateOne({ _id: order._id, storeCreditReturn: unfinished }, { $set: { storeCreditReturn: STORE_CREDIT_RETURN.RETURNED } });
  } catch (e) {
    logger.error({ err: e }, `${what}: store credit given back (${creditId}), but marking the return returned failed; ${retry} finishes it`);
    throw e;
  }
};

module.exports = {
  STORE_CREDIT_RETURN,
  addToBalance,
  debitStoreCredit,
  deductInventory,
  finishStoreCreditReturn,
  givesStoreCreditBack,
  recordStoreCreditReturn,
  resetCart,
  restoreInventory,
  returnUnfinished,
  undoStoreCreditDebit,
};
