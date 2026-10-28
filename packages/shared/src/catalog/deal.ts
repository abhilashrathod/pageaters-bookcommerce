import { z } from 'zod';

import { apiResponse, imageUrlSchema, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { categoryRefSchema } from './category.ts';
import { linkSchema } from './common.ts';
import { productSetRefSchema } from './product-set.ts';

// One product set inside a deal, with its position. Mongoose gives each entry its own `_id`.
export const dealProductSetSchema = z.object({
  _id: objectIdSchema,
  priority: z.number(),
  // No model default, so optional by the contract's rule. Populated, it is null if the set was hard-deleted.
  get set() {
    return productSetRefSchema.nullish();
  },
});
export type DealProductSet = z.infer<typeof dealProductSetSchema>;

// A promotional deal (API model `storeDeals.model.js`, served at /deals): a poster with a call to action and the
// product sets it features. Nothing references deals, so there is no ref layer. Not in the seed.
export const dealSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  dealId: z.string(),
  // '' is the model default and deals are not seeded, so a deal saved without an image sends ''.
  poster: imageUrlSchema.or(z.literal('')),
  // Rendered as an href: a site path or an https URL ('' is the model default).
  ctaLink: linkSchema.or(z.literal('')),
  ctaText: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.number(),
  productSets: z.array(dealProductSetSchema),
  get categories() {
    return z.array(categoryRefSchema);
  },
});
export type Deal = z.infer<typeof dealSchema>;

// GET /deals: its `select` projection.
export const dealListItemSchema = dealSchema.pick({
  _id: true,
  dealId: true,
  poster: true,
  ctaLink: true,
  ctaText: true,
  title: true,
});
export type DealListItem = z.infer<typeof dealListItemSchema>;

export const dealListResponseSchema = apiResponse(paginated(dealListItemSchema));
// GET /deals/unique/:dealId — the whole document; product sets (with their products) and categories populated.
export const dealDetailResponseSchema = apiResponse(dealSchema);
