import {
  adminPageQuerySchema,
  adminSearchQuerySchema,
  adminUserDetailsResponseSchema,
  adminUserListResponseSchema,
  adminUserSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin customer routes (`users.routes.js`). Users are typed by `userSchema` (no credentials). The legacy API sends
// whole user documents here until Phase 4, so these calls should run with `{ validate: true }`, which strips them.
// `PUT /users/:id` is excluded: the controller runs `findOneAndUpdate({})` with no update and answers with an
// arbitrary user's full document.
export const users = {
  // GET /users — customers (role USER), paged.
  list: defineEndpoint({ method: 'GET', path: '/users', query: adminPageQuerySchema, response: adminUserListResponseSchema.shape.data }),
  // GET /users/search?q= — users whose email contains `q` (every role); not paged.
  search: defineEndpoint({
    method: 'GET',
    path: '/users/search',
    query: adminSearchQuerySchema,
    response: adminUserSearchResponseSchema.shape.data,
  }),
  // GET /users/:id — the customer with cart, addresses and orders. `id` is the user's `_id`.
  detail: defineEndpoint({ method: 'GET', path: '/users/:id', response: adminUserDetailsResponseSchema.shape.data }),
};
