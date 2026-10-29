const { calculateTotal } = require('../helpers/cart.helper');

// Cart pricing: line totals and the cart subtotal. The arithmetic lives in helpers/cart.helper.js (shared with
// checkout until step 4e folds it in); this service decides what each read passes to it.
//
// Per line: total = quantity × floor(price − currentDiscount% of price), summed with Math.floor. Books get
// `productTotal` and `price`, bundles `total`, boxes and add-ons `total` and `price`. Prices are read from the
// populated product at read time, never from the cart.

/**
 * Prices a shopper's cart in place: decorates every line and sets `subTotal`.
 * Legacy: any line whose product no longer exists (populated as null) makes calculateTotal throw internally, and the
 * subTotal comes back 0. Out-of-stock and soft-deleted products are still priced.
 * @param {object} cart A populated cart as a plain object (`toObject()`).
 * @returns {Promise<object>} The same cart.
 */
const priceCart = async (cart) => {
  cart.subTotal = await calculateTotal(cart.products, cart.bundles, cart.mysteryBoxes, cart.addOns);
  return cart;
};

/**
 * Prices a cart for the admin view in place.
 * Legacy bug, kept: add-ons are not passed to calculateTotal, so it fails after pricing books, bundles and boxes;
 * `subTotal` is always 0 and add-on lines get no `total`/`price`.
 * @param {object} cart A populated cart as a plain object (`toObject()`).
 * @returns {Promise<object>} The same cart.
 */
const priceCartForAdmin = async (cart) => {
  cart.subTotal = await calculateTotal(cart.products, cart.bundles, cart.mysteryBoxes);
  return cart;
};

module.exports = { priceCart, priceCartForAdmin };
