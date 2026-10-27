const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');

const { writeFile, generateRandomNumber } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');
const moment = require('moment/moment');

const User = mongoose.model(models.USER);
const CreditTransactions = mongoose.model(models.STORE_CREDIT_TRANSACTIONS);

module.exports.issueCredit = async (req, res) => {
  try {
    const { userId, credit, orderId } = req.allParams();

    const userRes = await User.findOne({ _id: userId, status: enums.USER_STATUS.ACTIVE }).select('email fullName');

    if (!userRes) {
      return res.error('USER_NOT_FOUND');
    }

    const record = {
      creditId: `CR-${generateRandomNumber(10)}`,
      orderId,
      userId,
      amount: credit,
      action: 'CREDIT',
      expired: false,
    };

    await CreditTransactions.create(record);
    await User.findOneAndUpdate({ _id: userId }, { $inc: { storeCredit: credit } }, { new: true });

    const emailBody = {
      emailModule: 'STORE_CREDIT_REWARD',
      to: userRes.email,
      subject: `Your Store Credit is Here! - Pageaters`,
      data: {
        CUSTOMER_NAME: userRes.fullName ? userRes.fullName : 'Reader',
        AMOUNT: credit,
      },
    };
    sendMailQueue.add(emailBody);

    return res.created({ message: 'STORE_CREDIT_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getStoreCredit = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');

    const userRes = await User.findOne({ _id: userId }).select(`storeCredit`);

    return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data: userRes });

  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getCreditHistory = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    let { page, limit } = req.allParams();

    const creditRes = await CreditTransactions.paginate({userId}, { page, limit, sort: { createdAt: -1 } });

    if (creditRes) {
      return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data: creditRes });
    }

    return res.error('STORE_CREDIT_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};
