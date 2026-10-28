import { addOnGroupsResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public add-on read (`apps/api/src/routes/add-on.routes.js`). Every other add-on route is admin only (2c).
export const addOns = {
  // GET /add-ons/produtct/:productId (sic) — every add-on grouped by its `category`. The legacy API ignores
  // `productId` (any non-empty segment works) and doesn't filter soft-deleted add-ons (Phase 4).
  grouped: defineEndpoint({
    method: 'GET',
    path: '/add-ons/produtct/:productId',
    response: addOnGroupsResponseSchema.shape.data,
  }),
};
