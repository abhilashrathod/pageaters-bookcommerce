const mongoose = require('mongoose');
const { get } = require('lodash');
const { getId } = require('../helpers/utils.helper');

const { models } = require('../constants');

const Favorites = mongoose.model(models.FAVORITES);
const Books = mongoose.model(models.STORE_BOOK);

module.exports.getAll = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');

    const populateOptions = {
      path: 'wishlist',
      select: `title bookId ISBN author inventory poster price popularity editorsPick currentDiscount newRelease bestSeller`,
    };

    const wishlistRes = await Favorites.findOne({ userId }).select('wishlist').populate(populateOptions);

    return res.ok({ message: 'WISH_LIST_SUCCESS', data: wishlistRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.checkPresent = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const { product } = req.allParams();

    const query = {
      userId,
      wishlist: getId(product),
    };

    const isPresent = await Favorites.findOne(query);

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
      userId,
      wishlist: getId(product),
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

    const isPresent = await Favorites.findOne(query);

    if (isPresent) {
      return res.error('WISH_LIST_BOOK_PRESENT');
    }

    await Favorites.findOneAndUpdate({ userId }, payload, { new: true });

    return res.ok({ message: 'WISH_LIST_ADD_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const { product } = req.allParams();

    const update = { $pull: { 'wishlist': getId(product) } };

    await Favorites.findOneAndUpdate({ userId }, update, { new: true });

    return res.ok({ message: 'WISH_LIST_DELETE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};


