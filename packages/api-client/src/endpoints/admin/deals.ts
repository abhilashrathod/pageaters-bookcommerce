import {
  adminDealCreatePayloadSchema,
  adminDealUpdatePayloadSchema,
  adminEmptyResponseSchema,
  dealDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin deal routes (`storeDeal.routes.js`). `id` is the deal's `_id`; GET populates the product sets (sorted, with
// their books) and categories. Delete deactivates the deal. Public list/detail are 2b's.
export const deals = {
  detail: defineEndpoint({ method: 'GET', path: '/deals/:id', response: dealDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/deals',
    body: adminDealCreatePayloadSchema,
    response: dealDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/deals/:id',
    body: adminDealUpdatePayloadSchema,
    response: dealDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/deals/:id', response: adminEmptyResponseSchema.shape.data }),
};
