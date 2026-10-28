import { z } from 'zod';

import { dealSchema } from '../../catalog/deal.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminIdListSchema } from './common.ts';

// POST /deals and PUT /deals/:id (storeDeal.contoller.js). Types first (see common.ts). `dealId` is generated.

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

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminDealUpdatePayloadSchema = dealPayloadFields;
export type AdminDealUpdatePayload = z.infer<typeof adminDealUpdatePayloadSchema>;
