const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const StockAlert = mongoose.model(models.STOCK_ALERT);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = { isDeleted: false };

    const options = {
      page,
      limit,
    };

    const stockAggregate = StockAlert.aggregate(
      [
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$product',
            totalProducts: { $sum: 1 },
          },
        },
      ],
    );

    const alertsRes = await StockAlert.aggregatePaginate(stockAggregate, options);

    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data: alertsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getAllUsersByProduct = async (req, res) => {
  try {
    let { product } = req.allParams();

    const query = {
      isDeleted: false,
      product,
    };

    const populate = [{
      path: 'user',
      select: 'fullName email contactNo',
    }, {
      path: 'product',
      select: `title bookId poster price currentDiscount`,
    }];

    let subscribersRes = await StockAlert.find(query).populate(populate);

    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data: subscribersRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.sendAllUsersByProduct = async (req, res) => {
  try {
    let { product } = req.allParams();

    const query = {
      isDeleted: false,
      product,
    };

    const payload = {
      isDeleted: true,
      deletedAt: new Date(),
    };

    const populate = [{
      path: 'user',
      select: 'fullName email contactNo',
    }, {
      path: 'product',
      select: `title bookId poster price currentDiscount`,
    }];

    let subscribersRes = await StockAlert.find(query).populate(populate);

    for (let sub of subscribersRes) {
      sub = sub.toObject();

      sendMailQueue.add({
        emailModule: 'STOCK_ALERT',
        to: sub.user.email,
        data: {
          NAME: sub.user.fullName,
          PRODUCT: sub.product.title,
          LINK: `https://pageaters.com/book/${sub.product.bookId}`, // TODO: Will add more tracking details for analytics
          IMAGE: sub.product.poster,
          PRICE: sub.product.price,
        },
      });
    }

    await StockAlert.updateMany(query, {$set: payload}, {new: true});

    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data: { success: true, subscribers: subscribersRes.length } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.checkSubscription = async (req, res) => {
  try {
    let { product } = req.allParams();
    let { user } = req;

    const payload = {
      user: user.userId,
      product,
    };

    const isPresent = await StockAlert.findOne({ ...payload, isDeleted: false });

    if (isPresent) {
      return res.ok({ message: 'STOCK_ALERT_EXISTS', data: true });
    } else {
      return res.ok({ message: 'STOCK_ALERT_CHECK_NOT_EXIST', data: false });
    }

  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.subscribe = async (req, res) => {
  try {
    let { product } = req.allParams();
    let { user } = req;

    const payload = {
      user: user.userId,
      product,
    };

    const isPresent = await StockAlert.findOne({ ...payload, isDeleted: false });

    if (isPresent) {
      return res.error('STOCK_ALERT_EXISTS');
    }

    const alertsRes = await StockAlert.create(payload);

    return res.ok({ message: 'STOCK_ALERT_CREATE_SUCCESS', data: alertsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.unsubscribe = async (req, res) => {
  try {
    let { product } = req.allParams();
    let { user } = req;

    const payload = {
      user: user.userId,
      product,
    };

    const isPresent = await StockAlert.findOne({ ...payload, isDeleted: false });

    if (isPresent) {
      isPresent.isDeleted = true;
      isPresent.deletedAt = new Date();
      await isPresent.save();
      return res.ok('STOCK_ALERT_DELETE_SUCCESS');
    } else {
      return res.error('STOCK_ALERT_EXISTS');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
