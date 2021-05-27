const mongoose = require('mongoose');
const moment = require('moment');

const { models } = require('./../constants');
const { DELETE_ACCOUNT_DATA_AFTER } = require('./../appConfig');

const User = mongoose.model(models.USER);

module.exports.deleteAccount = async ({}) => {
  console.log('deleteAccount start');
  return new Promise(async resolve => {
    try {
      const users = await User.find({
        isDeleted: false,
        scheduledForDeletion: true,
        deletedAt: { $lt: moment().subtract(...DELETE_ACCOUNT_DATA_AFTER) },
      });

      for (const user of users) {
        await User.deleteMany({ _id: user._id });
      }

      console.log('deleteAccount end');
      return resolve();
    } catch (e) {
      console.log(e);

      console.log('deleteAccount errored');
      return resolve();
    }
  });
};
