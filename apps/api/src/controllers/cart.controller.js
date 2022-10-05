const mongoose = require('mongoose');
const { get } = require('lodash');
const { getId } = require('../helpers/utils.helper');
const { calculateTotal } = require('../helpers/cart.helper');
const { models, enums } = require('../constants');

const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const MysteryBox = mongoose.model(models.MYSTERY_BOX);

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
};

const populateOptions = [{
  path: 'products.product',
  select: 'bookId title poster author currentDiscount price',
  populate: {
    path: 'author',
    select: 'name avatar',
  },
}, {
  path: 'bundles.bundle',
  select: 'bundleId title poster bundledBooks currentDiscount price',
}, {
  path: 'mysteryBoxes.box',
  select: 'boxId title images currentDiscount price',
}];

module.exports.retrieve = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];

    let userCart = await Cart.findOne({ user: userId, _id: cart }).populate(populateOptions);

    if (userCart) {
      userCart = userCart.toObject();

      res.cookie(enums.TOKEN_ID.CART_COOKIE, userCart._id, CART_COOKIE_OPTIONS);

      userCart.subTotal = await calculateTotal(userCart.products, userCart.bundles, userCart.mysteryBoxes);
      return res.ok({ message: 'CART_LIST_SUCCESS', data: userCart });
    }

    return res.error('CART_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    let { product, quantity } = req.allParams();
    const userId = get(req, 'user.userId', '');

    const populateOptions = {
      path: 'bundles.bundle',
      select: 'bundledBooks',
    };

    let currentCart = await Cart.findOne({ _id: cart, user: userId }).populate(populateOptions);
    if (!currentCart) return res.error('CART_NOT_EXIST');

    currentCart = currentCart.toObject();

    let book = await Book.findOne({ _id: product, isDeleted: false }).select('price inventory');
    if (!book) return res.error('BOOK_NOT_EXIST');

    book = book.toObject();

    // check if this book is already a part of a bundle
    if (currentCart.bundles.length > 0) {
      for (let bundleItem of currentCart.bundles) {
        let isFound = bundleItem.bundle.bundledBooks.find(book => book.toString() === product.toString());
        if (isFound) {
          return res.error('BUNDLE_BOOKS_ALREADY_PRESENT');
        }
      }
    }

    // check if product is already in the cart then increase the quantity if available
    const alreadyThere = currentCart.products.find(x => x.product.toString() === product.toString());

    if (alreadyThere) {
      quantity = alreadyThere.quantity + quantity; // add upcoming and already exist qty to check final quantity is available.

      if (quantity > 2) return res.error('QUANTITY_LIMIT');

      if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

      const query = { _id: cart, 'products.product': getId(product) };
      const update = { $set: { 'products.$.quantity': quantity } };
      const options = { new: true };

      const updatedCart = await Cart.findOneAndUpdate(query, update, options);

      return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
    } else {
      if (quantity > 2) return res.error('QUANTITY_LIMIT');

      if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

      const addedBook = {
        product,
        quantity,
        addedOn: new Date(),
      };

      await Cart.findOneAndUpdate({ _id: cart }, {
        $addToSet: {
          products: addedBook,
        },
      }, { new: true });

      return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    let { id, quantity } = req.allParams();
    const userId = get(req, 'user.userId', '');

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let book = await Book.findOne({ _id: id, isDeleted: false }).select('price inventory');
    if (!book) return res.error('BOOK_NOT_EXIST');

    book = book.toObject();

    if (quantity > 2) return res.error('QUANTITY_LIMIT');

    if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

    const query = { _id: cart, 'products.product': getId(id) };
    const update = { $set: { 'products.$.quantity': quantity } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');

    let { id } = req.allParams(); // id is the productObjectId

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let book = await Book.findOne({ _id: id });
    if (!book) return res.error('BOOK_NOT_EXIST');

    const query = { _id: cart };
    const update = { $pull: { 'products': { product: id } } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.clear = async (req, res) => {
  try {
    // revoke cart
    const cookieOptions = {
      httpOnly: true,
      expires: 0,
    };
    res.cookie(enums.TOKEN_ID.CART_COOKIE, '', cookieOptions);

    res.ok('CART_DELETE_SUCCESS');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.empty = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');
    if (!cart) return res.error('CART_NOT_EXIST');

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    const query = { _id: cart };
    const update = { $set: { products: [] } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    res.ok({ message: 'CART_DELETE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};

/* ADMIN */

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit,
      populate: {
        path: 'user',
        select: 'fullName email',
      },
    };

    const cartRes = await Cart.paginate(query, options);

    return res.ok({ message: 'CART_LIST_SUCCESS', data: cartRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.view = async (req, res) => {
  try {
    let { id } = req.allParams();

    let cartRes = await Cart.findOne({ _id: id }).populate(populateOptions);

    if (cartRes) {
      cartRes = cartRes.toObject();

      cartRes.subTotal = await calculateTotal(cartRes.products, cartRes.bundles, cartRes.mysteryBoxes);

      return res.ok({ message: 'CART_LIST_SUCCESS', data: cartRes });
    }

    return res.error('CART_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};

/* BUNDLES */

module.exports.addBundle = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');
    let { bundle, quantity = 1 } = req.allParams();

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    currentCart = currentCart.toObject();

    let bundleRes = await Bundle.findOne({
      _id: bundle,
      isDeleted: false,
    }).select('bundledBooks currentDiscount price membersPrice');
    if (!bundleRes) return res.error('BUNDLE_NOT_EXIST');

    bundleRes = bundleRes.toObject();

    if (quantity > 1) return res.error('QUANTITY_LIMIT_BUNDLE');

    const bundlePresent = currentCart.bundles.find((item) => item.bundle.toString() === bundle.toString());

    if (bundlePresent) {
      return res.error('QUANTITY_LIMIT_BUNDLE');
    }

    for (let book of bundleRes.bundledBooks) {
      let bookRes = await Book.findOne({
        _id: book,
        isDeleted: false,
      }).select('currentDiscount price membersPrice inventory');

      // checking stock of all books from bundle
      if (bookRes.inventory <= 0) {
        return res.error('QUANTITY_OUT_OF_STOCK');
      }

      // making sure other books aren't added in the cart before.
      // check if product is already in the cart
      const alreadyThere = currentCart.products.find(x => x.product.toString() === book.toString());

      if (alreadyThere) {
        return res.error('BUNDLE_BOOKS_ALREADY_PRESENT');
      }
    }

    const addedBundle = {
      bundle,
      quantity,
      addedOn: new Date(),
    };

    await Cart.findOneAndUpdate({ _id: cart }, {
      $addToSet: {
        bundles: addedBundle,
      },
    }, { new: true });

    return res.ok({ message: 'BUNDLE_ADD_SUCCESS', data: true });

  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.removeBundle = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');
    let { bundleId } = req.allParams(); // id is the productObjectId

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let bundleRes = await Bundle.findOne({ _id: bundleId, isDeleted: false });
    if (!bundleRes) return res.error('BUNDLE_NOT_EXIST');

    const query = { _id: cart };
    const update = { $pull: { 'bundles': { bundle: bundleId } } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};

/* MYSTERY BOXES */

module.exports.addBox = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    let { box, preferences, quantity = 1 } = req.allParams();
    const userId = get(req, 'user.userId', '');

    if (quantity > 1) return res.error('QUANTITY_LIMIT_BOX');

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    currentCart = currentCart.toObject();

    let boxRes = await MysteryBox.findOne({ _id: box, isDeleted: false }).select('boxId');
    if (!boxRes) return res.error('MYSTERY_BOX_NOT_EXIST');

    const alreadyThere = currentCart.mysteryBoxes.find(x => x.box.toString() === box.toString());
    if (alreadyThere) return res.error('QUANTITY_LIMIT_BOX');

    const query = { _id: cart };
    const update = { $addToSet: { mysteryBoxes: { box, quantity, preferences, addedOn: new Date() } } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.removeBox = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');
    let { boxId } = req.allParams(); // id is the mysteryBoxObjectId

    let currentCart = await Cart.findOne({ _id: cart, user: userId });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let boxRes = await MysteryBox.findOne({ _id: boxId, isDeleted: false }).select('boxId');
    if (!boxRes) return res.error('MYSTERY_BOX_NOT_EXIST');

    const query = { _id: cart };
    const update = { $pull: { 'mysteryBoxes': { box: boxId } } };
    const options = { new: true };

    await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: true });
  } catch (e) {
    return res.internalServerError(e);
  }
};
