import { z } from 'zod';

import { dealSchema } from '../../catalog/deal.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminIdListSchema, adminLegacyRefSchema, adminOptionalIdListSchema } from './common.ts';

// POST /deals and PUT /deals/:id (storeDeal.contoller.js). Types first (see common.ts), except the `categories` and
// `productSets` references, which the API enforces since Phase 4. `dealId` is generated.

// One featured product set as written: the set and its position.
export const adminDealProductSetPayloadSchema = z.object({
  set: objectIdSchema,
  priority: z.number(),
});
export type AdminDealProductSetPayload = z.infer<typeof adminDealProductSetPayloadSchema>;

const dealPayloadFields = dealSchema
  .pick({ poster: true, ctaLink: true, ctaText: true, title: true, description: true, priority: true })
  .extend({
    categories: adminIdListSchema,
    productSets: z.array(adminDealProductSetPayloadSchema),
  });

export const adminDealCreatePayloadSchema = dealPayloadFields.partial().extend({ title: dealSchema.shape.title });
export type AdminDealCreatePayload = z.infer<typeof adminDealCreatePayloadSchema>;

// The update `$set`s the fields it reads. Mongoose 8 drops undefined keys from `$set`, so an omitted field keeps its
// current value (it is never written as null); the contract still asks for every field but `categories` (common.ts),
// as for the other catalog updates.
export const adminDealUpdatePayloadSchema = dealPayloadFields.required().extend({ categories: adminOptionalIdListSchema });
export type AdminDealUpdatePayload = z.infer<typeof adminDealUpdatePayloadSchema>;

// What the API enforces on POST and PUT (see common.ts): `categories` is a list of ids and `productSets` a list of
// { set, priority: number } entries, `set` an id or (legacy admin) a product set with a valid `_id`.
export const adminDealReferencesPayloadSchema = z.object({
  categories: adminOptionalIdListSchema,
  productSets: z.array(z.object({ set: adminLegacyRefSchema, priority: z.number() })).optional(),
});
export type AdminDealReferencesPayload = z.infer<typeof adminDealReferencesPayloadSchema>;
