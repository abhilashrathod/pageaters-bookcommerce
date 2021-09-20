const mongoose = require('mongoose');
const { get } = require('lodash');
const { generateRandomString } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);

module.exports.create = async (req, res) => {
  try {

    return res.ok();
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.retrieve = async (req, res) => {
  try {
    const cart = get(req, 'cookies.cart', '');
    const userId = get(req, 'user.userId', '');

    console.log("cart", cart);
    console.log("cookies", JSON.stringify(req.cookies));

    if (cart) {
      console.info("inside in");
      const retrievedCart = await Cart.findOne({ _id: cart });

      console.log("retrievedCart", retrievedCart);

      if (retrievedCart) {
        console.info("inside if II");
        return res.ok({ message: 'CART_LIST_SUCCESS', data: retrievedCart });
      }

      return res.ok({ message: 'CART_NOT_EXIST', data: {} });
    }
    else {
      const payload = {
        user: userId ? userId : null,
      };

      const newUserCart = await Cart.create(payload);

      const cookieOptions = {
        httpOnly: true,
      };

      await res.cookie('cart', newUserCart._id, cookieOptions);

      return res.ok({ message: 'CART_LIST_SUCCESS', data: newUserCart });
    }
  } catch (e) {
    console.log('e', JSON.stringify(e));
    console.trace("trace it man!");
    // return res.internalServerError(e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const { cart } = req.cookies;
    const { product, quantity } = req.allParams();

    if (!cart) return res.error('CART_NOT_EXIST');

    const isCart = await Cart.findOne({ _id: cart });

    if (!isCart) return res.error('CART_NOT_EXIST');

    const book = await Book.findOne({ _id: product }).select('price inventory');

    if (!book) return res.error('BOOK_NOT_EXIST');

    if (quantity > book.inventory) return res.error('INVALID_QUANTITY');

    const addedBook = {
      product,
      quantity,
      price: book.price,
      productTotal: book.price * quantity,
      addedOn: new Date(),
    };

    const updatedCart = await Cart.findOneAndUpdate({ _id: cart }, {
      $addToSet: {
        products: addedBook,
      },
    }, { new: true });

    return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });

  } catch (e) {
    return res.internalServerError(e);
  }
};
module.exports.update = async (req, res) => {
};
module.exports.remove = async (req, res) => {
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
