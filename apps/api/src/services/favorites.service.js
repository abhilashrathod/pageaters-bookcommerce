const mongoose = require('mongoose');

const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { getId } = require('../helpers/utils.helper');

// A shopper's favourites (wishlist of store books). One favourites document per user, created at signup.

const Favorites = mongoose.model(models.FAVORITES);
const Books = mongoose.model(models.STORE_BOOK);

const WISHLIST_BOOK_FIELDS =
  'title bookId ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller';

/**
 * The user's favourites document with its wishlist books populated (list fields only).
 * Soft-deleted books stay listed (legacy behaviour).
 * @param {string} userId
 * @returns {Promise<object | null>} `{ _id, wishlist }`, or null when the user has no favourites document.
 */
const getFavorites = (userId) =>
  Favorites.findOne({ userId }).select('wishlist').populate({ path: 'wishlist', select: WISHLIST_BOOK_FIELDS });

/**
 * Whether a product is in the user's wishlist.
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<boolean>}
 */
const isFavorite = async (userId, product) => Boolean(await Favorites.findOne({ userId, wishlist: getId(product) }));

/**
 * Adds a store book to the user's wishlist. Without a favourites document nothing is saved and no error is thrown
 * (legacy behaviour).
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<void>}
 * @throws {AppError} BOOK_NOT_EXIST (400) for a missing, unknown or soft-deleted book; WISH_LIST_BOOK_PRESENT (400)
 *   when it is already in the wishlist.
 */
const addFavorite = async (userId, product) => {
  const book = await Books.findOne({ _id: product, isDeleted: false });
  if (!book) throw new AppError('BOOK_NOT_EXIST');

  if (await isFavorite(userId, product)) throw new AppError('WISH_LIST_BOOK_PRESENT');

  await Favorites.findOneAndUpdate({ userId }, { $addToSet: { wishlist: product } });
};

/**
 * Removes a product from the user's wishlist; a product that isn't there is not an error.
 * @param {string} userId
 * @param {string} product Store book id.
 * @returns {Promise<void>}
 */
const removeFavorite = async (userId, product) => {
  await Favorites.findOneAndUpdate({ userId }, { $pull: { wishlist: getId(product) } });
};

module.exports = { addFavorite, getFavorites, isFavorite, removeFavorite };
