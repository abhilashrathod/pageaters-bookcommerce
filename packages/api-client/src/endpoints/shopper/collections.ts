import {
  collectionDetailResponseSchema,
  collectionListResponseSchema,
  objectIdSchema,
  paginationQuerySchema,
  shopperCollectionSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public collection reads (`apps/api/src/routes/collection.routes.js`). The admin routes are 2c's.
export const collections = {
  // GET /collections — `category` (an ObjectId) keeps the collections related to it. `sortBy` must be one of title,
  // createdAt, popularity, priority.
  list: defineEndpoint({
    method: 'GET',
    path: '/collections',
    query: paginationQuerySchema.extend({ category: objectIdSchema.optional() }),
    response: collectionListResponseSchema.shape.data,
  }),
  // GET /collections/unique/:id — `id` is the public `collectionId`, not the ObjectId.
  detail: defineEndpoint({
    method: 'GET',
    path: '/collections/unique/:id',
    response: collectionDetailResponseSchema.shape.data,
  }),
  // GET /collections/search/:q — prefix search, not paginated.
  search: defineEndpoint({
    method: 'GET',
    path: '/collections/search/:q',
    response: shopperCollectionSearchResponseSchema.shape.data,
  }),
};
