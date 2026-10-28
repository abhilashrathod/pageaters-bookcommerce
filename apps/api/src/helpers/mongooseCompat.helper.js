const mongoose = require('mongoose');

// Mongoose 5 behaviour kept after the Mongoose 8 upgrade, so responses stay the same.
// The legacy-bugs step (PLAN.md Phase 4) fixes the callers and removes this file.

// Mongoose 5 ignored populate paths that are not in the schema; Mongoose 6+ throws StrictPopulateError.
// Known callers that rely on it:
// - storeDeal.contoller.js `getById`: nested populate `products.product.author` on the StoreBook model
//   (StoreBook has no `products` path).
// Remove once every populate path is checked against its model's schema.
mongoose.set('strictPopulate', false);

// Sort directions as Mongoose 5 (mquery 3) accepted them: the value is stringified (so a one-element array
// like `['-1']` from `{ [sortBy]: [sortOrder] }` unwraps), lower-cased, and a falsy value means ascending.
// Mongoose 8 only accepts 1, -1, 'asc', 'ascending', 'desc', 'descending' and `$meta` objects, and list
// controllers pass `sortOrder` straight from the query string (`'-1'`, `'DESC'`, missing, `NaN`).
const LEGACY_SORT_VALUES = { 1: 1, '-1': -1, asc: 1, ascending: 1, desc: -1, descending: -1 };

function legacySortValue(value) {
  if (value && value.$meta) {
    return value;
  }
  const key = String(value || 1).toLowerCase();
  // Anything Mongoose 5 rejected passes through unchanged, so Mongoose 8 still throws on it.
  return Object.hasOwn(LEGACY_SORT_VALUES, key) ? LEGACY_SORT_VALUES[key] : value;
}

const originalSort = mongoose.Query.prototype.sort;
mongoose.Query.prototype.sort = function sort(arg, ...rest) {
  if (arg && typeof arg === 'object' && !Array.isArray(arg) && !(arg instanceof Map)) {
    arg = Object.fromEntries(Object.entries(arg).map(([key, value]) => [key, legacySortValue(value)]));
  }
  return originalSort.call(this, arg, ...rest);
};

// mongoose-paginate-v2 1.7 returned no documents (limit 0) when `limit` was passed but not a number
// (e.g. `limit: undefined` from a missing query parameter); 1.9 falls back to 10. An absent `limit` key
// meant the default of 10 in both. Global plugins run when a model is compiled, after its own plugins.
mongoose.plugin((schema) => {
  const paginate = schema.statics.paginate;
  if (typeof paginate !== 'function') {
    return;
  }
  schema.statics.paginate = function legacyLimitPaginate(query, options, callback) {
    if (options && Object.hasOwn(options, 'limit') && Number.isNaN(Number(options.limit))) {
      options = { ...options, limit: 0 };
    }
    return paginate.call(this, query, options, callback);
  };
});
