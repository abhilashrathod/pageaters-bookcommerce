import { z } from 'zod';

import { apiResponse, isoDateSchema, imageUrlSchema, moneySchema, objectIdSchema, paginated } from '../primitives.ts';
import { countSchema, discountSchema } from './common.ts';

// An add-on sold alongside books, e.g. a bookmark (API model `addOn.model.js`, served at /add-ons).
// Not in the seed.
export const addOnSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  addOnId: z.string(),
  name: z.string(),
  description: z.string(),
  // '' is the model default and add-ons are not seeded, so one saved without an image sends ''.
  poster: imageUrlSchema.or(z.literal('')),
  // Free-text grouping key; the storefront lists add-ons grouped by it.
  category: z.string(),
  priority: z.number(),
  price: moneySchema,
  currentDiscount: discountSchema,
  inventory: countSchema,
});
export type AddOn = z.infer<typeof addOnSchema>;

// GET /add-ons (admin only): whole documents. (GET /add-ons/:id answers one: `adminAddOnResponseSchema`.)
export const addOnListResponseSchema = apiResponse(paginated(addOnSchema));

// GET /add-ons/produtct/:productId (sic; the storefront's endpoint): every live add-on grouped by `category`, from an
// aggregation, so `_id` is the category text. Groups are sorted by category, add-ons in a group by priority then name.
// Add-ons aren't linked to products, so the list is the same for every live store book (`addOnGroupsParamsSchema`).
export const addOnGroupSchema = z.object({
  _id: z.string(),
  addOns: z.array(addOnSchema),
});
export type AddOnGroup = z.infer<typeof addOnGroupSchema>;
export const addOnGroupsResponseSchema = apiResponse(z.array(addOnGroupSchema));
