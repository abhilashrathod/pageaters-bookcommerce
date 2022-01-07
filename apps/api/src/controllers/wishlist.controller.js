const mongoose = require('mongoose');
const { get } = require('lodash');
const { getId } = require('../helpers/utils.helper');

const { models, enums } = require('../constants');

const Users = mongoose.model(models.USER);
const Books = mongoose.model(models.STORE_BOOK);

module.exports.getAll = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');

    const query = {
      _id: userId,
      isDeleted: false,
      status: enums.USER_STATUS.ACTIVE,
    };

    const populateOptions = {
      path: 'wishlist',
      select: `title bookId ISBN author inventory poster price popularity editorsPick currentDiscount bestSeller`,
    };

    const userRes = await Users.findOne(query).select('wishlist').populate(populateOptions);

    return res.ok({ message: 'WISH_LIST_SUCCESS', data: userRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.checkPresent = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const { product } = req.allParams();

    const query = {
      _id: userId,
      isDeleted: false,
      status: enums.USER_STATUS.ACTIVE,
      wishlist: getId(product),
    };

    const isPresent = await Users.findOne(query);

    if (isPresent) {
      return res.ok({ message: 'SUCCESS', data: true });
    }

    return res.ok({ message: 'SUCCESS', data: false });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const { product } = req.allParams();

    const query = {
      _id: userId,
      isDeleted: false,
      status: enums.USER_STATUS.ACTIVE,
    };

    const payload = {
      $addToSet: {
        wishlist: product,
      },
    };

    const productRes = await Books.findOne({ _id: product, isDeleted: false });

    if (!productRes) {
      return res.error('BOOK_NOT_EXIST');
    }

    const isPresent = await Users.findOne({ _id: userId, isDeleted: false, wishlist: getId(product) });

    if (isPresent) {
      return res.error('WISH_LIST_BOOK_PRESENT');
    }

    await Users.findOneAndUpdate(query, payload, { new: true });

    return res.ok({ message: 'WISH_LIST_ADD_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const { product } = req.allParams();

    const query = {
      _id: userId,
      isDeleted: false,
      status: enums.USER_STATUS.ACTIVE,
    };

    const update = { $pull: { 'wishlist': getId(product) } };

    await Users.findOneAndUpdate(query, update, { new: true });

    return res.ok({ message: 'WISH_LIST_DELETE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};


