import { productSetDetailResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public product-set reads (`apps/api/src/routes/productSet.routes.js`). The list and the other routes are admin
// only (2c). Both reads flatten `products` to the books themselves, sorted by priority.
export const productSets = {
  // GET /product-sets/unique/:id — `id` is the public `setId`.
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
