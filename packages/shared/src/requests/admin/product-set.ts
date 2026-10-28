import { z } from 'zod';

import { productSetSchema } from '../../catalog/product-set.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminIdListSchema, adminPageQuerySchema } from './common.ts';

// Product-set admin requests (productSets.controller.js). Types first (see common.ts).

// GET /product-sets: paged, optionally filtered to sets in any of these categories (sent as repeated keys; the API
// also accepts one comma-separated value). No sorting.
export const adminProductSetListQuerySchema = adminPageQuerySchema.extend({
  categories: adminIdListSchema.optional(),
});
export type AdminProductSetListQuery = z.infer<typeof adminProductSetListQuerySchema>;

// One entry as written: a store book and its position.
export const adminProductSetEntryPayloadSchema = z.object({
  product: objectIdSchema,
  priority: z.number(),
});
export type AdminProductSetEntryPayload = z.infer<typeof adminProductSetEntryPayloadSchema>;

const productSetPayloadFields = productSetSchema.pick({ title: true, description: true }).extend({
  products: z.array(adminProductSetEntryPayloadSchema),
  categories: adminIdListSchema,
});

// POST /product-sets. `setId` and `slug` are generated (slug from the title).
export const adminProductSetCreatePayloadSchema = productSetPayloadFields.partial().extend({
  title: productSetSchema.shape.title,
});
export type AdminProductSetCreatePayload = z.infer<typeof adminProductSetCreatePayloadSchema>;

// PUT /product-sets/:id: every field (`$set` writes an omitted one as null). A new title regenerates the slug, which
// breaks links that used the old one.
export const adminProductSetUpdatePayloadSchema = productSetPayloadFields.required();
export type AdminProductSetUpdatePayload = z.infer<typeof adminProductSetUpdatePayloadSchema>;
