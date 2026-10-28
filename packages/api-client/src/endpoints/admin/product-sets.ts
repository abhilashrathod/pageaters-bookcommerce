import {
  adminEmptyResponseSchema,
  adminProductSetCreatePayloadSchema,
  adminProductSetListQuerySchema,
  adminProductSetResponseSchema,
  adminProductSetUpdatePayloadSchema,
  productSetListResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin product-set routes (`productSet.routes.js`). `id` is the set's `_id`. Unlike the public detail (2b), the
// admin GET keeps the `{ _id, priority, product }` entries. Delete deactivates the set.
export const productSets = {
  // GET /product-sets — active sets, nothing populated.
  list: defineEndpoint({
    method: 'GET',
    path: '/product-sets',
    query: adminProductSetListQuerySchema,
    response: productSetListResponseSchema.shape.data,
  }),
  detail: defineEndpoint({ method: 'GET', path: '/product-sets/:id', response: adminProductSetResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/product-sets',
    body: adminProductSetCreatePayloadSchema,
    response: adminProductSetResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/product-sets/:id',
    body: adminProductSetUpdatePayloadSchema,
    response: adminProductSetResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/product-sets/:id', response: adminEmptyResponseSchema.shape.data }),
};
