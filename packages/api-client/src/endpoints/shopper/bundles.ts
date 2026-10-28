import {
  bundleDetailResponseSchema,
  bundleListResponseSchema,
  objectIdSchema,
  paginationQuerySchema,
  shopperBundleSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public bundle reads (`apps/api/src/routes/bundle.routes.js`). The admin routes are 2c's.
export const bundles = {
  // GET /bundles — `category` (an ObjectId) filters by category. `sortBy` must be one of title, createdAt,
  // popularity, priority, currentDiscount, price.
  list: defineEndpoint({
    method: 'GET',
    path: '/bundles',
    query: paginationQuerySchema.extend({ category: objectIdSchema.optional() }),
    response: bundleListResponseSchema.shape.data,
  }),
  // GET /bundles/unique/:id — `id` is the public `bundleId`, not the ObjectId. Adds a computed `inventory`.
  detail: defineEndpoint({
    method: 'GET',
    path: '/bundles/unique/:id',
    response: bundleDetailResponseSchema.shape.data,
  }),
  // GET /bundles/search/:q — prefix search, not paginated.
  search: defineEndpoint({
    method: 'GET',
    path: '/bundles/search/:q',
    response: shopperBundleSearchResponseSchema.shape.data,
  }),
};
