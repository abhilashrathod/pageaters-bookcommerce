import { categoryDetailResponseSchema, categoryListResponseSchema, paginationQuerySchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public category reads (`apps/api/src/routes/category.routes.js`). The admin routes (`GET /:id`, writes) are 2c's.
export const categories = {
  // GET /categories — `sortBy` must be one of title, createdAt, popularity, priority, currentDiscount, price.
  list: defineEndpoint({
    method: 'GET',
    path: '/categories',
    query: paginationQuerySchema,
    response: categoryListResponseSchema.shape.data,
  }),
  // GET /categories/unique/:id — `id` is the public `categoryId` (`CA-…`), not the ObjectId.
  detail: defineEndpoint({
    method: 'GET',
    path: '/categories/unique/:id',
    response: categoryDetailResponseSchema.shape.data,
  }),
};
