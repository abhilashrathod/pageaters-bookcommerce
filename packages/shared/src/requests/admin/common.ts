import { z } from 'zod';

import { objectIdSchema, paginationQuerySchema } from '../../primitives.ts';

// Shared pieces of the admin request payloads (apps/api routes guarded by `permissionValidator(USER_ROLES.ADMIN)`).
//
// Types first: the full payload schemas describe what the admin may send and give the api-client its input types.
// Since Phase 4 the API enforces, with `validate()`, only each write's references (the `…ReferencesPayloadSchema`,
// `adminAuthorBooksPayloadSchema` and list-filter schemas): every reference is an id, so a bad one is refused before
// anything is written. The rest is enforced once uploads answer image URLs (the legacy upload's bare key fails the
// image fields). Unknown keys pass through those checks.
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

// A list of references by ObjectId (related books, categories…). A bad id answers INVALID_ID.
export const adminIdListSchema = z.array(objectIdSchema);

// Since Phase 4 a create or update may leave a reference list out: a create stores an empty list, an update keeps the
// current one (Mongoose 8 drops undefined keys from `$set`, so an omitted field is never written as null).
export const adminOptionalIdListSchema = adminIdListSchema.optional();

// One reference inside an entry list (a product-set entry's `product`, a deal entry's `set`) as the API accepts it:
// an id, or the whole populated document the legacy admin (rebuilt in Phase 8) sends back from its detail view.
// Mongoose casts that object to its `_id`, so only the id is stored; the `_id` is checked.
export const adminLegacyRefSchema = z.union([objectIdSchema, z.looseObject({ _id: objectIdSchema })], { error: 'INVALID_ID' });
