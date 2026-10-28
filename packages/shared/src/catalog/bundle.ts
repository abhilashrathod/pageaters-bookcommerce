import { z } from 'zod';

import { apiResponse, imageUrlSchema, isoDateSchema, moneySchema, objectIdSchema, paginated } from '../primitives.ts';
import { bookFieldsSchema, bookRefSchema } from './book.ts';
import { categoryFieldsSchema, categoryRefSchema } from './category.ts';
import { collectionFieldsSchema, collectionRefSchema } from './collection.ts';
import { countSchema, discountSchema, ref } from './common.ts';

// A bundle of books sold together (API model `bundle.model.js`, served at /bundles). Layers and references:
// see `common.ts`.
export const bundleFieldsSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  bundleId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  // https required: the seed guarantees every document has its image, and super-admin uploads must too (Phase 8).
  poster: imageUrlSchema,
  currentDiscount: discountSchema,
  // Grams.
  weight: z.number().nonnegative(),
  popularity: z.number(),
  priority: z.number(),
  price: moneySchema,
  membersPrice: moneySchema,
});

export const bundleRefSchema = z.union([
  objectIdSchema,
  bundleFieldsSchema.partial().extend({
    _id: objectIdSchema,
    get bundledBooks() {
      return z.array(ref(bookFieldsSchema)).optional();
    },
    get categories() {
      return z.array(ref(categoryFieldsSchema)).optional();
    },
    get relatedCollections() {
      return z.array(ref(collectionFieldsSchema)).optional();
    },
    get relatedBundles() {
      return z.array(ref(bundleFieldsSchema)).optional();
    },
  }),
]);
export type BundleRef = z.infer<typeof bundleRefSchema>;

export const bundleSchema = bundleFieldsSchema.extend({
  get bundledBooks() {
    return z.array(bookRefSchema);
  },
  get categories() {
    return z.array(categoryRefSchema);
  },
  get relatedCollections() {
    return z.array(collectionRefSchema);
  },
  relatedBundles: z.array(bundleRefSchema),
  // Not stored: GET /bundles/unique/:bundleId adds it, 0 when any bundled book is out of stock, else 1.
  inventory: countSchema.optional(),
});
export type Bundle = z.infer<typeof bundleSchema>;

// GET /bundles: its `select` projection (bundled books as ids).
export const bundleListItemSchema = bundleSchema.pick({
  _id: true,
  bundleId: true,
  title: true,
  bundledBooks: true,
  poster: true,
  currentDiscount: true,
  priority: true,
  price: true,
  membersPrice: true,
});
export type BundleListItem = z.infer<typeof bundleListItemSchema>;

export const bundleListResponseSchema = apiResponse(paginated(bundleListItemSchema));
// GET /bundles/unique/:bundleId — the whole document; bundledBooks, categories and related* populated.
export const bundleDetailResponseSchema = apiResponse(bundleSchema);
