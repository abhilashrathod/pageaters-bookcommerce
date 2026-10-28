import { z } from 'zod';

import { objectIdSchema, paginationQuerySchema } from '../../primitives.ts';

// Shared pieces of the admin request payloads (apps/api routes guarded by `permissionValidator(USER_ROLES.ADMIN)`).
//
// Types first: the legacy API validates none of these payloads (no Joi validator on any admin route). The schemas
// describe what the admin may send and give the api-client its input types; Phase 4 enforces them with `validate()`.
// Objects strip unknown keys (not strict), so parsing a form value that still carries a server-only field
// (`wholeSalePriceHistory`, `isDeleted`…) drops it.

// List queries that only page: the API ignores sorting on these routes.
export const adminPageQuerySchema = paginationQuerySchema.pick({ page: true, limit: true });
export type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;

// `?q=` text searches (users by email, orders by `orderId`). The legacy API puts `q` straight into `$regex`
// (regex injection, Phase 4); the contract bounds its length.
export const adminSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});
export type AdminSearchQuery = z.infer<typeof adminSearchQuerySchema>;

// A list of references by ObjectId (related books, categories…).
export const adminIdListSchema = z.array(objectIdSchema);
