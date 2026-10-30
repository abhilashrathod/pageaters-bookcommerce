import { dealDetailResponseSchema, dealListResponseSchema, objectIdSchema, paginationQuerySchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public deal reads (`apps/api/src/routes/storeDeal.routes.js`, mounted at /deals). The admin routes are 2c's.
export const deals = {
  // GET /deals — active deals, by priority (lowest first) unless `sortBy` (title, createdAt) says otherwise (then
  // descending without a `sortOrder`); `category` (an ObjectId; else 400 INVALID_ID) filters by category. Paged by
  // page only (an `offset` is ignored).
  list: defineEndpoint({
    method: 'GET',
    path: '/deals',
    query: paginationQuerySchema.extend({ category: objectIdSchema.optional() }),
    response: dealListResponseSchema.shape.data,
  }),
  // GET /deals/unique/:id — `id` is the public `dealId`. Product sets (and their books) sorted by priority.
  detail: defineEndpoint({
    method: 'GET',
    path: '/deals/unique/:id',
    response: dealDetailResponseSchema.shape.data,
  }),
};
