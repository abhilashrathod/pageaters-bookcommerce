const mongoose = require('mongoose');

const { models } = require('../constants');
const { BOOK_AVAILABILITY } = require('../constants/enums');
const { AppError } = require('../helpers/appError.helper');
const { getId } = require('../helpers/utils.helper');
const { findUserCart } = require('./cart-read.service');

// Books in the shopper's cart: add, set quantity, remove, empty. Rules: at most 2 of a book, never more than its
// stock, all books of one availability (available / pre-order / import / procurement), only available books next to
// a bundle or mystery box, and no book that is already part of a bundle in the cart.

const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);

const MAX_BOOK_QUANTITY = 2;

const ADD_POPULATE = [
  { path: 'bundles.bundle', select: 'bundledBooks' },
  { path: 'products.product', select: 'bookId title poster author availability currentDiscount price' },
];

/**
 * A book that can't share the cart with what is already there. Not an AppError: the controller answers it with the
 * legacy PRODUCT_ITEM_MISMATCH body, whose message is this human-readable text (no message key).
 */
class ProductMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductMismatchError';
  }
}

// Whether a book matches the availability of the books already in the cart (the first one sets it).
const matchesCartAvailability = (book, products) =>
  products.length === 0 || book.availability === products[0].product.availability;

/**
 * Adds a book to the cart, or adds to its quantity when it is already there.
 * Legacy, kept: `quantity` gets no default (the validator's default isn't applied), so a new book without one is
 * stored with the model default 1 and skips the limit and stock checks (an out-of-stock book is added); an existing
 * book without one becomes NaN and fails (500).
 * @param {{ cartId: string, userId: string, product: string, quantity?: number }} input
 * @returns {Promise<true | object>} Legacy: `true` for a new book, the updated cart document for an existing one.
 * @throws {AppError} CART_NOT_EXIST, BOOK_NOT_EXIST, BUNDLE_BOOKS_ALREADY_PRESENT, QUANTITY_LIMIT, INVALID_QUANTITY (400).
 * @throws {ProductMismatchError} When the book's availability doesn't fit the cart.
 */
const addBook = async ({ cartId, userId, product, quantity }) => {
  const currentCart = (await findUserCart(cartId, userId, ADD_POPULATE)).toObject();

  const found = await Book.findOne({ _id: product, isDeleted: false }).select('price availability inventory');
  if (!found) throw new AppError('BOOK_NOT_EXIST');
  const book = found.toObject();

  for (const bundleItem of currentCart.bundles) {
    if (bundleItem.bundle.bundledBooks.find((bundled) => bundled.toString() === product.toString())) {
      throw new AppError('BUNDLE_BOOKS_ALREADY_PRESENT');
    }
  }

  if (!matchesCartAvailability(book, currentCart.products)) {
    const referenceType = currentCart.products[0].product.availability;
    throw new ProductMismatchError(
      `You current have a ${referenceType} item(s) in your cart, which can't be purchased with ${book.availability} item(s). Please place separate order for this.`,
    );
  }

  if (book.availability !== BOOK_AVAILABILITY.AVAILABLE && (currentCart.bundles.length > 0 || currentCart.mysteryBoxes.length > 0)) {
    throw new ProductMismatchError(
      `You current have a Bundle or Mystery Box in your cart, which can't be purchased with ${book.availability} item(s). Please place separate order for this.`,
    );
  }

  const alreadyThere = currentCart.products.find((x) => x.product._id.toString() === product.toString());
  const total = alreadyThere ? alreadyThere.quantity + quantity : quantity;

  if (total > MAX_BOOK_QUANTITY) throw new AppError('QUANTITY_LIMIT');
  if (total > book.inventory) throw new AppError('INVALID_QUANTITY');

  if (alreadyThere) {
    return Cart.findOneAndUpdate(
      { _id: cartId, 'products.product': getId(product) },
      { $set: { 'products.$.quantity': total } },
      { new: true },
    );
  }

  await Cart.findOneAndUpdate({ _id: cartId }, { $addToSet: { products: { product, quantity, addedOn: new Date() } } }, { new: true });
  return true;
};

/**
 * Sets the quantity of a book in the cart. Legacy: a book that isn't in the cart is not an error (nothing changes).
 * @param {{ cartId: string, userId: string, id: string, quantity: number }} input `id` is the store book id.
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, BOOK_NOT_EXIST, QUANTITY_LIMIT, INVALID_QUANTITY (400).
 */
const setBookQuantity = async ({ cartId, userId, id, quantity }) => {
  await findUserCart(cartId, userId);

  const book = await Book.findOne({ _id: id, isDeleted: false }).select('price inventory');
  if (!book) throw new AppError('BOOK_NOT_EXIST');

  if (quantity > MAX_BOOK_QUANTITY) throw new AppError('QUANTITY_LIMIT');
  if (quantity > book.inventory) throw new AppError('INVALID_QUANTITY');

  await Cart.findOneAndUpdate({ _id: cartId, 'products.product': getId(id) }, { $set: { 'products.$.quantity': quantity } }, { new: true });
};

/**
 * Removes a book from the cart. A soft-deleted book can be removed; an unknown one can't.
 * @param {{ cartId: string, userId: string, id: string }} input `id` is the store book id.
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, BOOK_NOT_EXIST (400).
 */
const removeBook = async ({ cartId, userId, id }) => {
  await findUserCart(cartId, userId);

  if (!(await Book.findOne({ _id: id }))) throw new AppError('BOOK_NOT_EXIST');

  await Cart.findOneAndUpdate({ _id: cartId }, { $pull: { products: { product: id } } }, { new: true });
};

/**
 * Empties the cart. Legacy bug, kept: only the books are removed; bundles, mystery boxes and add-ons stay.
 * @param {{ cartId: string, userId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST (400).
 */
const emptyCart = async ({ cartId, userId }) => {
  if (!cartId) throw new AppError('CART_NOT_EXIST');
  await findUserCart(cartId, userId);

  await Cart.findOneAndUpdate({ _id: cartId }, { $set: { products: [] } }, { new: true });
};

module.exports = { ProductMismatchError, addBook, emptyCart, removeBook, setBookQuantity };
