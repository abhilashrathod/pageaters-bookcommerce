const mongoose = require('mongoose');

// Fixed fixture ids, one range per fixture file so files written in parallel never collide: the first hex digit
// is the range, the rest the item number.
const RANGES = Object.freeze({
  catalog: 1, // fixtures/catalog.js (4a): authors, categories, books
  orders: 2, // 4b
  cart: 3, // 4c: carts, auth
  store: 4, // 4d: bundles, collections, deals, add-ons, mystery boxes, product sets, addresses, stock alerts, credit
});

/**
 * Returns an id factory for one range: fixtureId('orders')(1) → ObjectId('200000000000000000000001').
 * @param {keyof typeof RANGES} range
 * @returns {(n: number) => mongoose.Types.ObjectId}
 */
const fixtureId = (range) => {
  const prefix = RANGES[range];
  if (!prefix) throw new TypeError(`Unknown fixture id range '${range}'`);
  return (n) => new mongoose.Types.ObjectId(`${prefix}${n.toString(16).padStart(23, '0')}`);
};

module.exports = { RANGES, fixtureId };
