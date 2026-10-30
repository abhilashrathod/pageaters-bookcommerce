const mongoose = require('mongoose');

const { models } = require('../constants');
const { BOOK_AVAILABILITY } = require('../constants/enums');
const { AppError } = require('../helpers/appError.helper');
const { getId } = require('../helpers/utils.helper');
const { findUserCart, ownCart } = require('./cart-read.service');

// Bundles, mystery boxes and add-ons in the shopper's cart. One of each bundle and box; up to 5 of an add-on, never
// more than its stock. Bundles and boxes only go with available books.

const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const MysteryBox = mongoose.model(models.MYSTERY_BOX);
const AddOn = mongoose.model(models.ADD_ON);

const MAX_ADD_ON_QUANTITY = 5;

const ADD_POPULATE = [
  { path: 'bundles.bundle', select: 'bundledBooks' },
  { path: 'products.product', select: 'bookId title poster author availability currentDiscount price' },
];

const ADD_ON_POPULATE = { path: 'addOns.addOn', select: 'name description poster price currentDiscount' };

// Bundles and boxes can't join a cart whose books aren't available (pre-order, import…).
const cartTakesBundlesAndBoxes = (products) =>
  products.length === 0 || products[0].product.availability === BOOK_AVAILABILITY.AVAILABLE;

/**
 * Adds a bundle to the cart.
 * Legacy bugs, kept: the "already in the cart" checks compare populated documents with ids, so neither fires — the
 * same bundle can be added twice, and a bundle whose book is already in the cart is added. A bundle with a
 * soft-deleted book fails (500).
 * @param {{ cartId: string, userId: string, bundle: string, quantity?: number }} input `quantity` defaults to 1.
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, BUNDLE_NOT_EXIST, QUANTITY_LIMIT_BUNDLE, BUNDLE_ITEM_MISMATCH,
 *   QUANTITY_OUT_OF_STOCK (any bundled book out of stock), BUNDLE_BOOKS_ALREADY_PRESENT (400).
 */
const addBundle = async ({ cartId, userId, bundle, quantity = 1 }) => {
  const userCart = await findUserCart(cartId, userId, ADD_POPULATE);
  const currentCart = userCart.toObject();

  const bundleRes = await Bundle.findOne({ _id: bundle, isDeleted: false }).select('bundledBooks currentDiscount price membersPrice');
  if (!bundleRes) throw new AppError('BUNDLE_NOT_EXIST');

  if (quantity > 1) throw new AppError('QUANTITY_LIMIT_BUNDLE');

  if (currentCart.bundles.find((item) => item.bundle.toString() === bundle.toString())) {
    throw new AppError('QUANTITY_LIMIT_BUNDLE');
  }

  if (!cartTakesBundlesAndBoxes(currentCart.products)) throw new AppError('BUNDLE_ITEM_MISMATCH');

  for (const book of bundleRes.toObject().bundledBooks) {
    const bookRes = await Book.findOne({ _id: book, isDeleted: false }).select('currentDiscount price membersPrice inventory');
    if (bookRes.inventory <= 0) throw new AppError('QUANTITY_OUT_OF_STOCK');

    if (currentCart.products.find((x) => x.product.toString() === book.toString())) {
      throw new AppError('BUNDLE_BOOKS_ALREADY_PRESENT');
    }
  }

  await Cart.findOneAndUpdate(ownCart(userCart), { $addToSet: { bundles: { bundle, quantity, addedOn: new Date() } } }, { new: true });
};

/**
 * Removes a bundle from the cart (a soft-deleted bundle can't be removed).
 * @param {{ cartId: string, userId: string, bundleId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, BUNDLE_NOT_EXIST (400).
 */
const removeBundle = async ({ cartId, userId, bundleId }) => {
  const userCart = await findUserCart(cartId, userId);

  if (!(await Bundle.findOne({ _id: bundleId, isDeleted: false }))) throw new AppError('BUNDLE_NOT_EXIST');

  await Cart.findOneAndUpdate(ownCart(userCart), { $pull: { bundles: { bundle: bundleId } } }, { new: true });
};

/**
 * Adds a mystery box, with the shopper's reading preferences, to the cart.
 * @param {{ cartId: string, userId: string, box: string, preferences?: object, quantity?: number }} input
 *   `quantity` defaults to 1.
 * @returns {Promise<void>}
 * @throws {AppError} QUANTITY_LIMIT_BOX (more than 1, checked first, or the box is already in the cart),
 *   CART_NOT_EXIST, MYSTERY_BOX_NOT_EXIST, BOX_ITEM_MISMATCH (400).
 */
const addBox = async ({ cartId, userId, box, preferences, quantity = 1 }) => {
  if (quantity > 1) throw new AppError('QUANTITY_LIMIT_BOX');

  const userCart = await findUserCart(cartId, userId, ADD_POPULATE);
  const currentCart = userCart.toObject();

  if (!(await MysteryBox.findOne({ _id: box, isDeleted: false }).select('boxId'))) throw new AppError('MYSTERY_BOX_NOT_EXIST');

  if (currentCart.mysteryBoxes.find((x) => x.box.toString() === box.toString())) throw new AppError('QUANTITY_LIMIT_BOX');

  if (!cartTakesBundlesAndBoxes(currentCart.products)) throw new AppError('BOX_ITEM_MISMATCH');

  await Cart.findOneAndUpdate(
    ownCart(userCart),
    { $addToSet: { mysteryBoxes: { box, quantity, preferences, addedOn: new Date() } } },
    { new: true },
  );
};

/**
 * Removes a mystery box from the cart (a soft-deleted box can't be removed).
 * @param {{ cartId: string, userId: string, boxId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, MYSTERY_BOX_NOT_EXIST (400).
 */
const removeBox = async ({ cartId, userId, boxId }) => {
  const userCart = await findUserCart(cartId, userId);

  if (!(await MysteryBox.findOne({ _id: boxId, isDeleted: false }).select('boxId'))) throw new AppError('MYSTERY_BOX_NOT_EXIST');

  await Cart.findOneAndUpdate(ownCart(userCart), { $pull: { mysteryBoxes: { box: boxId } } }, { new: true });
};

const findAddOn = async (id) => {
  const addOn = await AddOn.findOne({ _id: id, isDeleted: false }).select('price inventory');
  if (!addOn) throw new AppError('ADD_ON_NOT_EXIST');
  return addOn.toObject();
};

/**
 * Adds an add-on to the cart, or adds to its quantity when it is already there.
 * Legacy, kept: `quantity` has no default, so a new add-on without one gets the model default 1 (skipping the
 * checks) and an existing one fails (NaN, 500). The limit message differs: QUANTITY_LIMIT for a new line,
 * ADD_ON_ADD_QUANTITY_LIMIT when adding to one.
 * @param {{ cartId: string, userId: string, addOn: string, quantity?: number }} input
 * @returns {Promise<{ merged: boolean, data: true | object | null }>} `merged` with the updated cart document when
 *   the add-on was already there; otherwise `data` is `true` (legacy).
 * @throws {AppError} CART_NOT_EXIST, ADD_ON_NOT_EXIST, QUANTITY_LIMIT, ADD_ON_ADD_QUANTITY_LIMIT,
 *   INVALID_QUANTITY (400).
 */
const addAddOn = async ({ cartId, userId, addOn, quantity }) => {
  const userCart = await findUserCart(cartId, userId, ADD_ON_POPULATE);
  const currentCart = userCart.toObject();
  const addOnRes = await findAddOn(getId(addOn));

  const alreadyThere = currentCart.addOns.find((x) => x.addOn._id.toString() === addOn.toString());

  if (alreadyThere) {
    const total = alreadyThere.quantity + quantity;
    if (total > MAX_ADD_ON_QUANTITY) throw new AppError('ADD_ON_ADD_QUANTITY_LIMIT');
    if (total > addOnRes.inventory) throw new AppError('INVALID_QUANTITY');
    const data = await Cart.findOneAndUpdate(
      { ...ownCart(userCart), 'addOns.addOn': getId(addOn) },
      { $set: { 'addOns.$.quantity': total } },
      { new: true },
    );
    return { merged: true, data };
  }

  if (quantity > MAX_ADD_ON_QUANTITY) throw new AppError('QUANTITY_LIMIT');
  if (quantity > addOnRes.inventory) throw new AppError('INVALID_QUANTITY');
  await Cart.findOneAndUpdate(ownCart(userCart), { $addToSet: { addOns: { addOn, quantity, addedOn: new Date() } } }, { new: true });
  return { merged: false, data: true };
};

/**
 * Sets the quantity of an add-on in the cart (an add-on not in the cart: nothing changes, no error).
 * @param {{ cartId: string, userId: string, id: string, quantity: number }} input `id` is the add-on id.
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, ADD_ON_NOT_EXIST, QUANTITY_LIMIT, INVALID_QUANTITY (400).
 */
const setAddOnQuantity = async ({ cartId, userId, id, quantity }) => {
  const userCart = await findUserCart(cartId, userId);
  const addOnRes = await findAddOn(id);

  if (quantity > MAX_ADD_ON_QUANTITY) throw new AppError('QUANTITY_LIMIT');
  if (quantity > addOnRes.inventory) throw new AppError('INVALID_QUANTITY');

  await Cart.findOneAndUpdate({ ...ownCart(userCart), 'addOns.addOn': getId(id) }, { $set: { 'addOns.$.quantity': quantity } }, { new: true });
};

/**
 * Removes an add-on from the cart (a soft-deleted add-on can't be removed).
 * @param {{ cartId: string, userId: string, addOnId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CART_NOT_EXIST, ADD_ON_NOT_EXIST (400).
 */
const removeAddOn = async ({ cartId, userId, addOnId }) => {
  const userCart = await findUserCart(cartId, userId);
  await findAddOn(addOnId);

  await Cart.findOneAndUpdate(ownCart(userCart), { $pull: { addOns: { addOn: addOnId } } }, { new: true });
};

module.exports = { addAddOn, addBox, addBundle, removeAddOn, removeBox, removeBundle, setAddOnQuantity };
