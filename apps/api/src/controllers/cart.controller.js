const mongoose = require('mongoose');
const { get } = require('lodash');
const { getId } = require('../helpers/utils.helper');
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

    if (userId) {
      const userCart = await Cart.findOne({ user: userId });

      if (userCart) {
        return res.ok({ message: 'CART_LIST_SUCCESS', data: userCart });
      } else {
        const payload = {
          user: userId,
        };

        const newUserCart = await Cart.create(payload);

        const cookieOptions = {
          httpOnly: true,
        };
        res.cookie('cart', newUserCart._id, cookieOptions);

        return res.ok({ message: 'CART_LIST_SUCCESS', data: newUserCart });
      }
    }

    if (cart) {
      const retrievedCart = await Cart.findOne({ _id: cart });

      if (retrievedCart) {
        return res.ok({ message: 'CART_LIST_SUCCESS', data: retrievedCart });
      } else {
        const payload = {
          user: null,
        };

        const newUserCart = await Cart.create(payload);

        const cookieOptions = {
          httpOnly: true,
        };
        res.cookie('cart', newUserCart._id, cookieOptions);

        return res.ok({ message: 'CART_LIST_SUCCESS', data: newUserCart });
      }
    }

    return res.ok({ message: 'CART_NOT_EXIST', data: {} });

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

      const query = { _id: cart, "products.product": getId(product)};
      const update = {$set: {"products.$.quantity": quantity}};
      const options = {new : true};

      const updatedCart = await Cart.findOneAndUpdate(query, update, options);

      return res.ok({ message: 'CART_UPDATE_SUCCESS', data: updatedCart });
    } else {
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
    }
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
