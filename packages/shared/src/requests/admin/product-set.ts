import { z } from 'zod';

import { productSetSchema } from '../../catalog/product-set.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminIdListSchema, adminOptionalIdListSchema, adminPageQuerySchema } from './common.ts';

// Product-set admin requests (productSets.controller.js). Types first (see common.ts), except the `categories`
// filter and the `categories` and `products` references, which the API enforces since Phase 4.

// One id or a comma-separated list of ids: a query string carries a filter with a single value as a plain string.
const commaSeparatedIdsSchema = z.string().regex(/^[0-9a-fA-F]{24}(,[0-9a-fA-F]{24})*$/, 'INVALID_ID');

// The GET /product-sets filter: sets in any of these categories, sent as repeated keys or one comma-separated value.
// '' (the admin's deal form with no category selected) means no filter. The API enforces this part; page and limit
// are checked by its paging helper, so a bad one answers INVALID_PAGING like every other list.
export const adminProductSetListFilterSchema = z.object({
  categories: z
    .union([adminIdListSchema, commaSeparatedIdsSchema, z.literal('').transform(() => undefined)], { error: 'INVALID_ID' })
    .optional(),
});
export type AdminProductSetListFilter = z.infer<typeof adminProductSetListFilterSchema>;

// GET /product-sets: paged (newest first), optionally filtered (above). No sorting.
export const adminProductSetListQuerySchema = adminPageQuerySchema.extend(adminProductSetListFilterSchema.shape);
export type AdminProductSetListQuery = z.infer<typeof adminProductSetListQuerySchema>;

// One entry as written: a store book and its position.
export const adminProductSetEntryPayloadSchema = z.object({
  product: objectIdSchema,
  priority: z.number(),
});
export type AdminProductSetEntryPayload = z.infer<typeof adminProductSetEntryPayloadSchema>;

const productSetPayloadFields = productSetSchema.pick({ title: true, description: true }).extend({
  products: z.array(adminProductSetEntryPayloadSchema),
  categories: adminOptionalIdListSchema,
});

// POST /product-sets. `setId` and `slug` are generated (slug from the title).
export const adminProductSetCreatePayloadSchema = productSetPayloadFields.partial().extend({
  title: productSetSchema.shape.title,
});
export type AdminProductSetCreatePayload = z.infer<typeof adminProductSetCreatePayloadSchema>;

// PUT /product-sets/:id: every field but `categories`, which may be left out (common.ts). A new title regenerates the
// slug, which breaks links that used the old one.
export const adminProductSetUpdatePayloadSchema = productSetPayloadFields.required().extend({ categories: adminOptionalIdListSchema });
export type AdminProductSetUpdatePayload = z.infer<typeof adminProductSetUpdatePayloadSchema>;

// The legacy admin (rebuilt in Phase 8) sends each entry's `product` as the whole populated book, not its id. The API
// accepts that form too: Mongoose casts the object to its `_id`, so only the id is stored.
const legacyProductRefSchema = z.union([objectIdSchema, z.looseObject({ _id: objectIdSchema })], { error: 'INVALID_ID' });

// What the API enforces on POST and PUT (see common.ts): `categories` is a list of ids and `products` a list of
// { product, priority: number } entries, `product` an id or (legacy admin) a book with a valid `_id`.
export const adminProductSetReferencesPayloadSchema = z.object({
  categories: adminOptionalIdListSchema,
  products: z.array(z.object({ product: legacyProductRefSchema, priority: z.number() })).optional(),
});
export type AdminProductSetReferencesPayload = z.infer<typeof adminProductSetReferencesPayloadSchema>;
