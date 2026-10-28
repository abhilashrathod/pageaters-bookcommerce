import { dealDetailResponseSchema, dealListResponseSchema, objectIdSchema, paginationQuerySchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public deal reads (`apps/api/src/routes/storeDeal.routes.js`, mounted at /deals). The admin routes are 2c's.
export const deals = {
  // GET /deals — active deals; `category` (an ObjectId) filters by category. `sortBy` must be one of title,
  // createdAt, priority. The legacy API also reads an `offset`, which this client doesn't send.
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
