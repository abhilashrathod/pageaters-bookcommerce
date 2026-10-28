import {
  categoryDetailResponseSchema,
  categoryListResponseSchema,
  categoryProductsResponseSchema,
  paginationQuerySchema,
  shopperCategoryOverviewResponseSchema,
  shopperCategorySearchResponseSchema,
} from '@pageaters/shared';

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
  // GET /categories/:id/products — the category's plain books. Unlike `detail`, `id` is the category's ObjectId.
  // `sortBy` must be one of title, createdAt, updatedAt, publicationYear, popularity, currentDiscount, price; the
  // legacy API only sorts when both `sortBy` and `sortOrder` are sent.
  products: defineEndpoint({
    method: 'GET',
    path: '/categories/:id/products',
    query: paginationQuerySchema,
    response: categoryProductsResponseSchema.shape.data,
  }),
  // GET /categories/:id/overview — trending, newest and most discounted in-stock books. `id` is the ObjectId;
  // `page`/`limit` apply to each of the three lists.
  overview: defineEndpoint({
    method: 'GET',
    path: '/categories/:id/overview',
    query: paginationQuerySchema.pick({ page: true, limit: true, sortOrder: true }),
    response: shopperCategoryOverviewResponseSchema.shape.data,
  }),
  // GET /categories/search/:q — prefix search, at most 10.
  search: defineEndpoint({
    method: 'GET',
    path: '/categories/search/:q',
    response: shopperCategorySearchResponseSchema.shape.data,
  }),
};
