const mongoose = require('mongoose');
const { get } = require('lodash');
const { getId } = require('../helpers/utils.helper');
const { calculateTotal } = require('../helpers/cart.helper');
const { models } = require('../constants');

const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);

module.exports.retrieve = async (req, res) => {
  try {
    const cart = get(req, 'cookies.cart', '');
    const userId = get(req, 'user.userId', '');

    console.log("cart", cart);
    console.log("userId", userId);

    const populate = {
      path: 'products.product',
      select: 'bookId title poster author currentDiscount price',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    };

    if (userId) {
      let userCart = await Cart.findOne({ user: userId }).populate(populate);

      if (userCart) {
        userCart = userCart.toObject();
        res.cookie('cart', userCart._id, { httpOnly: true });
        userCart.subTotal = await calculateTotal(userCart.products);
        return res.ok({ message: 'CART_LIST_SUCCESS', data: userCart });
      }
    }

    if (cart) {
      let retrievedCart = await Cart.findOne({ _id: cart }).populate(populate);

      if (retrievedCart) {
        retrievedCart = retrievedCart.toObject();
        res.cookie('cart', retrievedCart._id, { httpOnly: true });
        retrievedCart.subTotal = await calculateTotal(retrievedCart.products);
        return res.ok({ message: 'CART_LIST_SUCCESS', data: retrievedCart });
      }
    }

    const cartCreatePayload = {
      user: userId ? userId : null,
    };

    const newUserCart = await Cart.create(cartCreatePayload);
    res.cookie('cart', newUserCart._id, { httpOnly: true });
    return res.ok({ message: 'CART_LIST_SUCCESS', data: newUserCart });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const { cart } = req.cookies;
    let { product, quantity } = req.allParams();

    if (!cart) return res.error('CART_NOT_EXIST');

    let currentCart = await Cart.findOne({ _id: cart });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    currentCart = currentCart.toObject();

    let book = await Book.findOne({ _id: product }).select('price inventory');
    if (!book) return res.error('BOOK_NOT_EXIST');

    book = book.toObject();

    // check if product is already in the cart then increase the quantity if available
    const alreadyThere = currentCart.products.find(x => x.product.toString() === product.toString());

    if (alreadyThere) {
      quantity = alreadyThere.quantity + quantity; // add upcoming and already exist qty to check final quantity is available.

      if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

      const query = { _id: cart, 'products.product': getId(product) };
      const update = { $set: { 'products.$.quantity': quantity } };
      const options = { new: true };

      const updatedCart = await Cart.findOneAndUpdate(query, update, options);

      return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
    } else {
      if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

      const addedBook = {
        product,
        quantity,
        addedOn: new Date(),
      };

      const updatedCart = await Cart.findOneAndUpdate({ _id: cart }, {
        $addToSet: {
          products: addedBook,
        },
      }, { new: true });

      return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const { cart } = req.cookies;
    let { id, quantity } = req.allParams();

    if (!cart) return res.error('CART_NOT_EXIST');

    let currentCart = await Cart.findOne({ _id: cart });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let book = await Book.findOne({ _id: id }).select('price inventory');
    if (!book) return res.error('BOOK_NOT_EXIST');

    book = book.toObject();

    if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

    const query = { _id: cart, 'products.product': getId(id) };
    const update = { $set: { 'products.$.quantity': quantity } };
    const options = { new: true };

    const updatedCart = await Cart.findOneAndUpdate(query, update, options);
    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const { cart } = req.cookies;
    let { id } = req.allParams(); // id is the productObjectId

    if (!cart) return res.error('CART_NOT_EXIST');

    let currentCart = await Cart.findOne({ _id: cart });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    let book = await Book.findOne({ _id: id });
    if (!book) return res.error('BOOK_NOT_EXIST');

    const query = { _id: cart };
    const update = { $pull: { 'products': { product: id } } };
    const options = { new: true };

    const updatedCart = await Cart.findOneAndUpdate(query, update, options);

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
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
    res.cookie('cart', '', cookieOptions);

    res.ok('CART_DELETE_SUCCESS');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.empty = async (req, res) => {
  try {
    const { cart } = req.cookies;
    if (!cart) return res.error('CART_NOT_EXIST');

    let currentCart = await Cart.findOne({ _id: cart });
    if (!currentCart) return res.error('CART_NOT_EXIST');

    const query = { _id: cart };
    const update = { $set: { products: [] } };
    const options = { new: true };


    const updatedCart = await Cart.findOneAndUpdate(query, update, options);

    res.ok({ message: 'CART_DELETE_SUCCESS', data: updatedCart });
  } catch (e) {
    return res.internalServerError(e);
  }
};
