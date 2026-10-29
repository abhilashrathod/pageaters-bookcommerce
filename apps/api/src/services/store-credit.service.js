const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const sendMailQueue = require('../helpers/sendMailQueue.helper');

// Store credit: a shopper's balance (`user.storeCredit`) and its transaction log. Spending credit at checkout is
// part of the order services.

const User = mongoose.model(models.USER);
const CreditTransactions = mongoose.model(models.STORE_CREDIT_TRANSACTIONS);

/**
 * Issues store credit to an active user: records a CREDIT transaction, adds `credit` to the balance and queues the
 * STORE_CREDIT_REWARD email.
 * Legacy (no validator, kept until the zod step): `credit` is not checked, so a negative or non-numeric amount is
 * recorded and applied as is; a malformed `userId` fails as a 500.
 * @param {{ userId: string, credit: number, orderId?: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} USER_NOT_FOUND (400) for an unknown or inactive user.
 */
const issueCredit = async ({ userId, credit, orderId }) => {
  const userRes = await User.findOne({ _id: userId, status: enums.USER_STATUS.ACTIVE }).select('email fullName');

  if (!userRes) throw new AppError('USER_NOT_FOUND');

  await CreditTransactions.create({
    creditId: `CR-${generateRandomNumber(10)}`,
    orderId,
    userId,
    amount: credit,
    action: 'CREDIT',
    expired: false,
  });
  await User.findOneAndUpdate({ _id: userId }, { $inc: { storeCredit: credit } }, { new: true });

  sendMailQueue.add({
    emailModule: 'STORE_CREDIT_REWARD',
    to: userRes.email,
    subject: `Your Store Credit is Here! - Pageaters`,
    data: {
      CUSTOMER_NAME: userRes.fullName ? userRes.fullName : 'Reader',
      AMOUNT: credit,
    },
  });
};

/**
 * The user's store credit balance.
 * @param {string} userId
 * @returns {Promise<object | null>} `{ _id, storeCredit }` (plus the `id` virtual when serialised).
 */
const getBalance = (userId) => User.findOne({ _id: userId }).select('storeCredit');

/**
 * One page of the user's credit transactions, newest first.
 * Legacy: without `limit` the page has no documents (mongoose-paginate-v2 `limit: 0`, see mongooseCompat.helper.js).
 * @param {string} userId
 * @param {{ page?: number | string, limit?: number | string }} paging
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 * @throws {AppError} STORE_CREDIT_NOT_EXIST (400) if paginate answers nothing (legacy guard; it always answers).
 */
const getHistory = async (userId, { page, limit }) => {
  const creditRes = await CreditTransactions.paginate({ userId }, { page, limit, sort: { createdAt: -1 } });
  if (!creditRes) throw new AppError('STORE_CREDIT_NOT_EXIST');
  return creditRes;
};

module.exports = { getBalance, getHistory, issueCredit };
