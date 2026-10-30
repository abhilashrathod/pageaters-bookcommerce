import { z } from 'zod';

import { addOnSchema } from '../../catalog/add-on.ts';
import { countSchema } from '../../catalog/common.ts';
import { hasAtMostTwoDecimals, paginationQuerySchema } from '../../primitives.ts';

// Add-on admin requests (add-on.controller.js). Types first (see common.ts).

// GET /add-ons: newest first by default (the API's paging helper); `name` is the only other sort field it allows
// (anything else is SORTING_NOT_ALLOWED), so `sortBy` is optional here instead of defaulting to createdAt.
export const adminAddOnListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.literal('name').optional(),
});
export type AdminAddOnListQuery = z.infer<typeof adminAddOnListQuerySchema>;

// The controllers also read `productPrefrerence` and `products`, which the model doesn't have (Mongoose drops them),
// so they are not part of the contract.
const addOnPayloadFields = addOnSchema.pick({
  name: true,
  description: true,
  poster: true,
  category: true,
  priority: true,
  price: true,
  currentDiscount: true,
  inventory: true,
});

// POST /add-ons.
export const adminAddOnCreatePayloadSchema = addOnPayloadFields.partial().extend({ name: addOnSchema.shape.name });
export type AdminAddOnCreatePayload = z.infer<typeof adminAddOnCreatePayloadSchema>;

// PUT /add-ons/:id. The update `$set`s the fields it reads. Mongoose 8 drops undefined keys from `$set`, so an omitted
// field keeps its current value (it is never written as null); the contract still asks for every field, as for the
// other catalog updates. An add-on has no references, so the API enforces none of it.
export const adminAddOnUpdatePayloadSchema = addOnPayloadFields.required();
export type AdminAddOnUpdatePayload = z.infer<typeof adminAddOnUpdatePayloadSchema>;

// What the API enforces on POST and PUT (since Phase 4): each field it stores, when sent, has the right type, so a bad
// value is refused with a 400 before any write instead of failing Mongoose's cast (500). `price` is a non-negative
// amount (INVALID_AMOUNT), `currentDiscount` a percentage from 0 to 100 (INVALID_DISCOUNT); the rest answer
// INVALID_REQUEST. Text fields are not checked further (the image is a stored key until uploads answer URLs).
export const adminAddOnFieldsPayloadSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  poster: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().optional(),
  price: z.number({ error: 'INVALID_AMOUNT' }).nonnegative().refine(hasAtMostTwoDecimals).optional(),
  currentDiscount: z.number({ error: 'INVALID_DISCOUNT' }).min(0).max(100).optional(),
  inventory: countSchema.optional(),
});
export type AdminAddOnFieldsPayload = z.infer<typeof adminAddOnFieldsPayloadSchema>;
