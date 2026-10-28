import { z } from 'zod';

import { apiResponse, imageUrlSchema, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { authorFieldsSchema, authorRefSchema } from './author.ts';
import { bookFieldsSchema, bookRefSchema } from './book.ts';
import { categoryFieldsSchema, categoryRefSchema } from './category.ts';
import { ref } from './common.ts';

// A curated collection of books (API model `collection.model.js`, served at /collections). Layers and
// references: see `common.ts`.
export const collectionFieldsSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  collectionId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  // https required: the seed guarantees every document has its image, and super-admin uploads must too (Phase 8).
  poster: imageUrlSchema,
  priority: z.number(),
  popularity: z.number(),
});

export const collectionRefSchema = z.union([
  objectIdSchema,
  collectionFieldsSchema.partial().extend({
    _id: objectIdSchema,
    get books() {
      return z.array(ref(bookFieldsSchema)).optional();
    },
    get relatedCollections() {
      return z.array(ref(collectionFieldsSchema)).optional();
    },
    get relatedCategories() {
      return z.array(ref(categoryFieldsSchema)).optional();
    },
    get featuredAuthors() {
      return z.array(ref(authorFieldsSchema)).optional();
    },
  }),
]);
export type CollectionRef = z.infer<typeof collectionRefSchema>;

export const collectionSchema = collectionFieldsSchema.extend({
  get books() {
    return z.array(bookRefSchema);
  },
  relatedCollections: z.array(collectionRefSchema),
  get relatedCategories() {
    return z.array(categoryRefSchema);
  },
  get featuredAuthors() {
    return z.array(authorRefSchema);
  },
});
export type Collection = z.infer<typeof collectionSchema>;

// GET /collections: its `select` projection, with `books` populated (each with author and categories).
export const collectionListItemSchema = collectionSchema.pick({
  _id: true,
  collectionId: true,
  title: true,
  tags: true,
  poster: true,
  priority: true,
  popularity: true,
  books: true,
});
export type CollectionListItem = z.infer<typeof collectionListItemSchema>;

export const collectionListResponseSchema = apiResponse(paginated(collectionListItemSchema));
// GET /collections/unique/:collectionId — the whole document; books, related* and featuredAuthors populated.
export const collectionDetailResponseSchema = apiResponse(collectionSchema);
