import {
  adminCategoryCreatePayloadSchema,
  adminCategoryUpdatePayloadSchema,
  adminEmptyResponseSchema,
  categoryDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin category routes (`category.routes.js`). `id` is the category's `_id`. Create answers 201 (`res.created`).
// Public list/detail/products/search are 2b's.
export const categories = {
  detail: defineEndpoint({ method: 'GET', path: '/categories/:id', response: categoryDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/categories',
    body: adminCategoryCreatePayloadSchema,
    response: categoryDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/categories/:id',
    body: adminCategoryUpdatePayloadSchema,
    response: categoryDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/categories/:id', response: adminEmptyResponseSchema.shape.data }),
};
