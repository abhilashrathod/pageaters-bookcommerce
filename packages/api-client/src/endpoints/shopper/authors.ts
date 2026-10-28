import { z } from 'zod';
import {
  authorDetailResponseSchema,
  authorListResponseSchema,
  paginationQuerySchema,
  shopperAuthorSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public author reads (`apps/api/src/routes/author.routes.js`). The admin routes are 2c's.
export const authors = {
  // GET /authors — `sortBy` must be one of name, createdAt, popularity, priority.
  list: defineEndpoint({
    method: 'GET',
    path: '/authors',
    query: paginationQuerySchema,
    response: authorListResponseSchema.shape.data,
  }),
  // GET /authors/unique/:id — `id` is the public `authorId`, not the ObjectId.
  detail: defineEndpoint({
    method: 'GET',
    path: '/authors/unique/:id',
    response: authorDetailResponseSchema.shape.data,
  }),
  // GET /authors/search?q= — prefix search, not paginated.
  search: defineEndpoint({
    method: 'GET',
    path: '/authors/search',
    query: z.object({ q: z.string() }),
    response: shopperAuthorSearchResponseSchema.shape.data,
  }),
};
