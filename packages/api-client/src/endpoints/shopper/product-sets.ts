import { adminProductSetListQuerySchema, productSetDetailResponseSchema, productSetListResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public product-set reads (`apps/api/src/routes/productSet.routes.js`). The writes and the by-ObjectId read are admin
// only (2c). The detail reads flatten `products` to the books themselves, sorted by priority.
export const productSets = {
  // GET /product-sets — active sets, newest first, at most 50 a page; `categories` keeps the sets in any of them.
  list: defineEndpoint({
    method: 'GET',
    path: '/product-sets',
    query: adminProductSetListQuerySchema,
    response: productSetListResponseSchema.shape.data,
  }),
  // GET /product-sets/unique/:id — `id` is the public `setId` or the set's ObjectId (what CMS blocks store).
  detail: defineEndpoint({
    method: 'GET',
    path: '/product-sets/unique/:id',
    response: productSetDetailResponseSchema.shape.data,
  }),
  // GET /product-sets/slug/:slug
  detailBySlug: defineEndpoint({
    method: 'GET',
    path: '/product-sets/slug/:slug',
    response: productSetDetailResponseSchema.shape.data,
  }),
};
