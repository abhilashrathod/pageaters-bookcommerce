const { paginationQuerySchema } = require('@pageaters/shared');

const { AppError } = require('./appError.helper');

// Paging defaults for list endpoints (mongoose-paginate-v2 options), from the shared list-query contract
// (`paginationQuerySchema` in @pageaters/shared): page 1, limit DEFAULT_PAGE_LIMIT (10), at most MAX_PAGE_LIMIT
// (1000), newest first (`createdAt` descending). `sortOrder` takes asc/desc/1/-1 (also ascending/descending).
// '' counts as missing, as the admin sends every key.

/**
 * A sort on `field` with `_id` as the tiebreak (same direction), so pages never repeat or skip documents that tie.
 * @param {string} field
 * @param {1 | -1} order
 * @returns {Record<string, 1 | -1>}
 */
const sortOn = (field, order) => (field === '_id' ? { _id: order } : { [field]: order, _id: order });

/**
 * A list query with the defaults applied and checked.
 * @param {{ page?: unknown, limit?: unknown, sortBy?: unknown, sortOrder?: unknown }} params As sent (strings).
 * @param {{ sortable?: string[], sortBy?: string, sortOrder?: 1 | -1 }} [options] `sortable` lists the fields a
 *   client may sort on (none by default; the default `sortBy` is always allowed); `sortBy`/`sortOrder` are the
 *   defaults (`createdAt`, -1).
 * @returns {{ page: number, limit: number, sortBy: string, sortOrder: 1 | -1 }}
 * @throws {AppError} INVALID_PAGING (400) for a page or limit that isn't a whole number in range, or an unknown
 *   sort order; SORTING_NOT_ALLOWED (400) for a `sortBy` outside `sortable`.
 */
const parsePaging = ({ page, limit, sortBy, sortOrder } = {}, { sortable = [], sortBy: defaultSortBy = 'createdAt', sortOrder: defaultSortOrder } = {}) => {
  const missing = (value) => value === undefined || value === null || value === '';
  const parsed = paginationQuerySchema.safeParse({ page, limit, sortOrder, sortBy: missing(sortBy) ? defaultSortBy : sortBy });
  if (!parsed.success) {
    if (parsed.error.issues.every((issue) => issue.path[0] === 'sortBy')) throw new AppError('SORTING_NOT_ALLOWED');
    throw new AppError('INVALID_PAGING');
  }

  const field = parsed.data.sortBy;
  if (field !== defaultSortBy && !sortable.includes(field)) throw new AppError('SORTING_NOT_ALLOWED');

  // The endpoint's default order goes with its default field only; another field without an order sorts -1.
  const order = missing(sortOrder) && defaultSortOrder && field === defaultSortBy ? defaultSortOrder : parsed.data.sortOrder;
  return { page: parsed.data.page, limit: parsed.data.limit, sortBy: field, sortOrder: order };
};

/**
 * Paging options for `Model.paginate(query, { ...pageOptions(params, { sortable }), select, populate })`: the
 * checked query (see parsePaging) as `{ page, limit, sort }`, sorted with the `_id` tiebreak. Always a page number
 * (never `offset`), so the envelope's `page` is set.
 * @param {{ page?: unknown, limit?: unknown, sortBy?: unknown, sortOrder?: unknown }} params As sent (strings).
 * @param {{ sortable?: string[], sortBy?: string, sortOrder?: 1 | -1 }} [options] As for parsePaging.
 * @returns {{ page: number, limit: number, sort: Record<string, 1 | -1> }}
 * @throws {AppError} INVALID_PAGING (400), SORTING_NOT_ALLOWED (400): see parsePaging.
 */
const pageOptions = (params, options) => {
  const { page, limit, sortBy, sortOrder } = parsePaging(params, options);
  return { page, limit, sort: sortOn(sortBy, sortOrder) };
};

module.exports = { pageOptions, parsePaging, sortOn };
