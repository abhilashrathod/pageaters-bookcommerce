import { mysteryBoxDetailResponseSchema, mysteryBoxListResponseSchema, paginationQuerySchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public mystery-box reads (`apps/api/src/routes/mysteryBox.routes.js`). The admin routes are 2c's.
export const mysteryBoxes = {
  // GET /mystery-boxes — always sorted by number of books, ascending; no sort parameters.
  list: defineEndpoint({
    method: 'GET',
    path: '/mystery-boxes',
    query: paginationQuerySchema.pick({ page: true, limit: true }),
    response: mysteryBoxListResponseSchema.shape.data,
  }),
  // GET /mystery-boxes/unique/:id — `id` is the public `boxId`, not the ObjectId.
  detail: defineEndpoint({
    method: 'GET',
    path: '/mystery-boxes/unique/:id',
    response: mysteryBoxDetailResponseSchema.shape.data,
  }),
};
