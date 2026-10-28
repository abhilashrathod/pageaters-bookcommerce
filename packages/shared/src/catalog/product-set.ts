import { z } from 'zod';

import { apiResponse, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { bookRefSchema } from './book.ts';
import { categoryRefSchema } from './category.ts';
import { ref } from './common.ts';

// One entry of a product set: a store book and its position. Mongoose gives each entry its own `_id`.
export const productSetItemSchema = z.object({
  _id: objectIdSchema,
  priority: z.number(),
  // No model default, so optional by the contract's rule, though every seeded entry has one.
  get product() {
    return bookRefSchema.optional();
  },
});
export type ProductSetItem = z.infer<typeof productSetItemSchema>;

// An ordered, hand-picked list of products (API model `productSet.model.js`, collection `product_sets`, served
// at /product-sets), e.g. "New releases". Deals and CMS blocks reference sets by id. Nothing references back
// into sets except deals, so the set's own references are already finite. Layers and references: see `common.ts`.
export const productSetSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  setId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  products: z.array(productSetItemSchema),
  get categories() {
    return z.array(categoryRefSchema);
  },
});
export type ProductSet = z.infer<typeof productSetSchema>;

export const productSetRefSchema = ref(productSetSchema);
export type ProductSetRef = z.infer<typeof productSetRefSchema>;

// GET /product-sets (admin only): whole documents, nothing populated.
export const productSetListResponseSchema = apiResponse(paginated(productSetSchema));
// GET /product-sets/slug/:slug and /product-sets/unique/:setId — products (with author) and categories populated.
export const productSetDetailResponseSchema = apiResponse(productSetSchema);
