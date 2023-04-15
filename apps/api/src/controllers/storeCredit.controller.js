const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const { get } = require('lodash');

const { HOST, PROJECT_ROOT, TWILIO, RAZOR_PAY, ENVIRONMENT } = require('./../appConfig');
const { models, enums } = require('../constants');

const { encrypt, decrypt, generateJwtToken } = require('../helpers/encryption.helper');
const { writeFile, generateRandomNumber } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);
const Cart = mongoose.model(models.CART);
const CreditTransactions = mongoose.model(models.STORE_CREDIT_TRANSACTIONS);
const Favorites = mongoose.model(models.FAVORITES);

const twilioClient = require('twilio')(TWILIO.ACCOUNT_SID, TWILIO.AUTH_TOKEN);


module.exports.getStoreCredit = async (req, res) => {
    try {
        const userId = get(req, 'user.userId', '');

        const userRes = await User.findOne({ _id: userId }).select(`storeCredit`);

        return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data: userRes });

    } catch (e) {
        return res.internalServerError(e);
    }
}

module.exports.getCreditHistory = async (req, res) => {
    try {
      const userId = get(req, 'user.userId', '');

      const creditRes = await CreditTransactions.find({ userId: userId });
  
      if (creditRes) {
        return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data: creditRes });
      }
  
      return res.error('STORE_CREDIT_NOT_EXIST');
    } catch (e) {
      return res.internalServerError(e);
    }
  };