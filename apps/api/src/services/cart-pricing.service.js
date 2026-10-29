// Cart pricing: line totals and the cart subtotal. `calculateTotal` is the shared arithmetic (checkout imports it
// from here, order → cart); `priceCart`/`priceCartForAdmin` decide what each cart read passes to it.
//
// Per line: total = quantity × floor(price − currentDiscount% of price), summed with Math.floor. Books get
// `productTotal` and `price`, bundles `total`, boxes and add-ons `total` and `price`. Prices are read from the
// populated product at read time, never from the cart.

/**
 * Prices cart lines in place and returns their sum. Per line: quantity × floor(price − currentDiscount% of price);
 * books get `productTotal` and `price`, bundles `total`, boxes and add-ons `total` and `price`.
 * Legacy: any error (a missing argument, a line whose product is null) is swallowed and the total is 0; lines priced
 * before the error keep their decorations.
 * @param {object[]} books Lines `{ product, quantity }` with a populated product.
 * @param {object[]} bundles Lines `{ bundle, quantity }`.
 * @param {object[]} boxes Lines `{ box, quantity }`.
 * @param {object[]} addOns Lines `{ addOn, quantity }`.
 * @returns {Promise<number>} The subtotal (0 on any error).
 */
const calculateTotal = async function(books, bundles, boxes, addOns) {
  try {
    let total = 0;

    for (let book of books) {
      book.productTotal = book.quantity * Math.floor((book.product.price - ((book.product.currentDiscount * book.product.price) / 100)));
      book.price = book.product.price;
      total = total + Math.floor(book.productTotal);
    }

    for (let bundle of bundles) {
      bundle.total = bundle.quantity * Math.floor((bundle.bundle.price - ((bundle.bundle.currentDiscount * bundle.bundle.price) / 100)));
      total = total + Math.floor(bundle.total);
    }

    for (let box of boxes) {
      box.total = box.quantity * Math.floor((box.box.price - ((box.box.currentDiscount * box.box.price) / 100)));
      box.price = box.box.price;
      total = total + Math.floor(box.total);
    }

    for (let addOn of addOns) {
      addOn.total = addOn.quantity * Math.floor((addOn.addOn.price - ((addOn.addOn.currentDiscount * addOn.addOn.price) / 100)));
      addOn.price = addOn.addOn.price;
      total = total + Math.floor(addOn.total);
    }

    return total;
  } catch (e) {
    return 0;
  }
};

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

module.exports = { calculateTotal, priceCart, priceCartForAdmin };
