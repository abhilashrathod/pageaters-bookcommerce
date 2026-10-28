import {
  adminCollectionCreatePayloadSchema,
  adminCollectionUpdatePayloadSchema,
  adminEmptyResponseSchema,
  collectionDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin collection routes (`collection.routes.js`). `id` is the collection's `_id`; GET populates books,
// related categories/collections and featured authors. Public list/detail/search are 2b's.
export const collections = {
  detail: defineEndpoint({ method: 'GET', path: '/collections/:id', response: collectionDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/collections',
    body: adminCollectionCreatePayloadSchema,
    response: collectionDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/collections/:id',
    body: adminCollectionUpdatePayloadSchema,
    response: collectionDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/collections/:id', response: adminEmptyResponseSchema.shape.data }),
};
