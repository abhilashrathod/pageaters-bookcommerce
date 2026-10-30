import {
  addOnListResponseSchema,
  adminAddOnCreatePayloadSchema,
  adminAddOnListQuerySchema,
  adminAddOnResponseSchema,
  adminAddOnUpdatePayloadSchema,
  adminEmptyResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin add-on routes (`add-on.routes.js`). `id` is the add-on's `_id`. The storefront's grouped list is 2b's.
export const addOns = {
  list: defineEndpoint({ method: 'GET', path: '/add-ons', query: adminAddOnListQuerySchema, response: addOnListResponseSchema.shape.data }),
  detail: defineEndpoint({ method: 'GET', path: '/add-ons/:id', response: adminAddOnResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/add-ons',
    body: adminAddOnCreatePayloadSchema,
    response: adminAddOnResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/add-ons/:id',
    body: adminAddOnUpdatePayloadSchema,
    response: adminAddOnResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/add-ons/:id', response: adminEmptyResponseSchema.shape.data }),
};
