import { addOnGroupsResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public add-on read (`apps/api/src/routes/add-on.routes.js`). Every other add-on route is admin only (2c).
export const addOns = {
  // GET /add-ons/produtct/:productId (sic) — every live add-on grouped by its `category`. `productId` must be a live
  // store book's id (400 INVALID_ID / BOOK_NOT_EXIST); add-ons aren't linked to products, so every book gets the same.
  grouped: defineEndpoint({
    method: 'GET',
    path: '/add-ons/produtct/:productId',
    response: addOnGroupsResponseSchema.shape.data,
  }),
};
