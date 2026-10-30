const { escapeRegExp } = require('lodash');
const { adminSearchQuerySchema } = require('@pageaters/shared');

// Admin text search (users by email, orders by id) as a literal `$regex` pattern.

// The longest search an admin may send (the shared request schema's limit); a longer `q` is cut to it.
const SEARCH_MAX_LENGTH = adminSearchQuerySchema.shape.q.maxLength;

/**
 * Text an admin searches for, as a literal `$regex` pattern: trimmed, cut to the shared schema's limit and
 * escaped, so `.*` or `(` match those characters instead of acting as a pattern (regex injection: raw, `.*`
 * matched every record and an invalid pattern was a 500). A non-string value is searched as its text.
 * @param {unknown} q
 * @returns {string} '' when there is nothing to search for.
 */
const literalPattern = (q) => escapeRegExp(String(q ?? '').trim().slice(0, SEARCH_MAX_LENGTH));

module.exports = { SEARCH_MAX_LENGTH, literalPattern };
