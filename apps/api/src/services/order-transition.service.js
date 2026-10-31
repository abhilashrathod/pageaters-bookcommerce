const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');

// Moving a placed order from the stage it was read in to the next (ship, deliver, cancel). The write is conditional
// on that stage, so of two concurrent transitions (a cancel and a ship, two cancels…) only one wins and the other
// changes nothing: it answers 409 ORDER_CHANGED_CONFLICT (reload the order and try again).

const Order = mongoose.model(models.ORDER);

/**
 * Applies a transition to `order` in the database, only while it is still in the stage it was read in, then to the
 * document in memory (for the e-mail and the answer).
 * @param {import('mongoose').Document & { orderStatus: string }} order The order as read.
 * @param {{ set: object, history: object, push?: object }} change `history` is the new `orderHistory` entry; `push`
 *   other array entries (e.g. `requests`).
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_CHANGED_CONFLICT (409) when the order changed since it was read.
 */
const transitionOrder = async (order, { set, history, push = {} }) => {
  const entry = { _id: new mongoose.Types.ObjectId(), ...history };
  const moved = await Order.updateOne(
    { _id: order._id, orderStatus: order.orderStatus },
    { $set: set, $push: { orderHistory: entry, ...push } },
  );
  if (moved.matchedCount !== 1) throw new AppError('ORDER_CHANGED_CONFLICT', { status: 409 });

  order.set(set);
  order.orderHistory.push(entry);
  for (const [path, value] of Object.entries(push)) order.get(path).push(value);
};

module.exports = { transitionOrder };
