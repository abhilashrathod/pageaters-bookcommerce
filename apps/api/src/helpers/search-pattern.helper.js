const mongoose = require('mongoose');
const { escapeRegExp } = require('lodash');
const { adminSearchQuerySchema } = require('@pageaters/shared');

// Text search as literal `$regex` patterns: admin search (users by email, orders by id) and the public catalogue
// search (books, authors, categories, collections, bundles).

// The longest text any search uses (the shared admin request schema's limit); a longer `q` is cut to it.
const SEARCH_MAX_LENGTH = adminSearchQuerySchema.shape.q.maxLength;

// Catalogue search: terms after the first few are ignored, at most this many results, and a query that runs longer
// than this is aborted (an error answer) instead of holding the connection.
const SEARCH_MAX_TERMS = 5;
const SEARCH_RESULT_LIMIT = 10;
const SEARCH_MAX_TIME_MS = 1000;

// ASCII control characters (NUL included): each becomes a space, so `%00` can't reach MongoDB and a tab or newline
// still separates terms.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/**
 * Text searched for, as a literal `$regex` pattern (admin and catalogue search): control characters replaced by
 * spaces, trimmed, cut to SEARCH_MAX_LENGTH and escaped, so `.*` or `(` match those characters instead of acting
 * as a pattern (regex injection: raw, `.*` matched every record and an invalid pattern was a 500). Anything but a
 * string (an array or object from `?q[]=` or `?q[key]=`) is nothing to search for.
 * @param {unknown} q
 * @returns {string} '' when there is nothing to search for.
 */
const literalPattern = (q) => {
  if (typeof q !== 'string') return '';
  return escapeRegExp(q.replace(CONTROL_CHARACTERS, ' ').trim().slice(0, SEARCH_MAX_LENGTH));
};

/**
 * Catalogue search filter: each whitespace-separated term of `q` (literal, see literalPattern; the first
 * SEARCH_MAX_TERMS) must start a word, case-insensitive, in at least one of `fields`. A word starts at the
 * beginning of the field or after a non-word character (anything but A–Z, a–z, 0–9, _), so `tw` finds
 * "Test Book Two" and `ook` doesn't find "Book". For an array field, any element may match.
 * @param {unknown} q
 * @param {string[]} fields
 * @returns {object | null} null when `q` has no terms (nothing to search for).
 */
const wordPrefixFilter = (q, fields) => {
  // Escaping adds no whitespace, so the escaped text splits into escaped terms.
  const terms = literalPattern(q).split(/\s+/).filter(Boolean).slice(0, SEARCH_MAX_TERMS);
  if (!terms.length) return null;

  // Each operator object is trusted on its own: sanitizeFilter is on and doesn't look inside a trusted filter.
  const startsWord = (term) => mongoose.trusted({ $regex: `(?:^|\\W)${term}`, $options: 'i' });
  return { $and: terms.map((term) => ({ $or: fields.map((field) => ({ [field]: startsWord(term) })) })) };
};

module.exports = { SEARCH_MAX_LENGTH, SEARCH_MAX_TIME_MS, SEARCH_RESULT_LIMIT, literalPattern, wordPrefixFilter };
