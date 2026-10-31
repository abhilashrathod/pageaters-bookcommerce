import { z } from 'zod';

import { apiResponse, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { bookRefSchema } from './book.ts';
import { categoryRefSchema } from './category.ts';
import { ref } from './common.ts';

// One entry of a product set: a store book and its position. Mongoose gives each entry its own `_id`. Strict, so
// a bare book projection (the flattened detail shape below) can never pass for an entry.
export const productSetItemSchema = z.strictObject({
  _id: objectIdSchema,
  priority: z.number(),
  // No model default, so optional by the contract's rule, though every seeded entry has one. Populated, it is
  // null if the book was hard-deleted (books are soft-deleted today).
  get product() {
    return bookRefSchema.nullish();
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

// A set as GET /product-sets/slug/:slug and /product-sets/unique/:setId send it: the entries are sorted by
// priority and flattened to their populated books (`products: map(sortBy(products, 'priority'), 'product')`),
// each a projection with its author; null where a book was hard-deleted. Categories are populated. The book
// projection is strict (the controllers' `select` lists only book fields), so a stored `{ _id, priority,
// product }` entry can't pass for a book.
// (The admin's GET /product-sets/:id keeps the entries, sorted: that is `productSetSchema`.)
export const productSetDetailSchema = productSetSchema.extend({
  get products() {
    return z.array(bookRefSchema.options[1].strict().nullable());
  },
});
export type ProductSetDetail = z.infer<typeof productSetDetailSchema>;

// GET /product-sets (public, active sets): whole documents, nothing populated.
export const productSetListResponseSchema = apiResponse(paginated(productSetSchema));
export const productSetDetailResponseSchema = apiResponse(productSetDetailSchema);
