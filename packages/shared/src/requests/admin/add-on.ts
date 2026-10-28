import { z } from 'zod';

import { addOnSchema } from '../../catalog/add-on.ts';
import { paginationQuerySchema } from '../../primitives.ts';

// Add-on admin requests (add-on.controller.js). Types first (see common.ts).

// GET /add-ons: `name` is the only sort field the controller allows (anything else is SORTING_NOT_ALLOWED), so
// `sortBy` is optional here instead of defaulting to createdAt.
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

// PUT /add-ons/:id — the target contract: every field, as the other updates `$set` them. The legacy route always
// answers 500 (the controller reads an undefined `id`), see Phase 4.
export const adminAddOnUpdatePayloadSchema = addOnPayloadFields.required();
export type AdminAddOnUpdatePayload = z.infer<typeof adminAddOnUpdatePayloadSchema>;
