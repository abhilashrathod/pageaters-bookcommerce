import {
  adminBundleCreatePayloadSchema,
  adminBundleUpdatePayloadSchema,
  adminEmptyResponseSchema,
  bundleDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin bundle routes (`bundle.routes.js`). `id` is the bundle's `_id`; GET populates bundled books, categories and
// related bundles/collections. Public list/detail/search are 2b's.
export const bundles = {
  detail: defineEndpoint({ method: 'GET', path: '/bundles/:id', response: bundleDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/bundles',
    body: adminBundleCreatePayloadSchema,
    response: bundleDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/bundles/:id',
    body: adminBundleUpdatePayloadSchema,
    response: bundleDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/bundles/:id', response: adminEmptyResponseSchema.shape.data }),
};
