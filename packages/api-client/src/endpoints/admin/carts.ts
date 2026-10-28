import { adminCartListResponseSchema, adminCartResponseSchema, adminPageQuerySchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin cart views (`cart.routes.js` ADMIN). `id` is the cart's `_id`. Shopper cart actions are 2b's.
export const carts = {
  list: defineEndpoint({ method: 'GET', path: '/cart', query: adminPageQuerySchema, response: adminCartListResponseSchema.shape.data }),
  detail: defineEndpoint({ method: 'GET', path: '/cart/:id', response: adminCartResponseSchema.shape.data }),
};
