import {
  adminPageQuerySchema,
  adminSearchQuerySchema,
  adminUserDetailsResponseSchema,
  adminUserListResponseSchema,
  adminUserSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin customer routes (`users.routes.js`). Users are typed by `userSchema` (no credentials), but the types alone
// don't remove anything: the legacy API sends whole user documents (password hash, salt, OTP, tokens) until Phase 4.
// Admin callers must pass `{ validate: true }` on every `users.*` call until then, so parsing strips those keys before
// the data reaches state, logs or the DOM.
// The API has no admin route that edits a user (`PUT /users/:id` was removed in Phase 4).
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
