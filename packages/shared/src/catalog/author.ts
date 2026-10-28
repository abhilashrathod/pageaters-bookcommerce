import { z } from 'zod';

import { apiResponse, imageUrlSchema, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { bookFieldsSchema, bookRefSchema } from './book.ts';
import { ref } from './common.ts';

// An author (API model `author.model.js`, served at /authors). Layers and references: see `common.ts`.
export const authorFieldsSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  authorId: z.string(),
  name: z.string(),
  intro: z.string(),
  // https required: the seed guarantees every document has its image, and super-admin uploads must too (Phase 8).
  avatar: imageUrlSchema,
  priority: z.number(),
  popularity: z.number(),
});

export const authorRefSchema = z.union([
  objectIdSchema,
  authorFieldsSchema.partial().extend({
    _id: objectIdSchema,
    get books() {
      return z.array(ref(bookFieldsSchema)).optional();
    },
  }),
]);
export type AuthorRef = z.infer<typeof authorRefSchema>;

export const authorSchema = authorFieldsSchema.extend({
  // The author's store books.
  get books() {
    return z.array(bookRefSchema);
  },
});
export type Author = z.infer<typeof authorSchema>;

// GET /authors: its `select` projection (book references as ids).
export const authorListItemSchema = authorSchema.pick({
  _id: true,
  authorId: true,
  name: true,
  popularity: true,
  books: true,
});
export type AuthorListItem = z.infer<typeof authorListItemSchema>;

export const authorListResponseSchema = apiResponse(paginated(authorListItemSchema));
// GET /authors/unique/:authorId — the whole document with `books` populated.
export const authorDetailResponseSchema = apiResponse(authorSchema);
