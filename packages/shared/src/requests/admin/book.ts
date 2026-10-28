import type { z } from 'zod';

import { bookFieldsSchema } from '../../catalog/book.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminIdListSchema } from './common.ts';

// POST /store-books and PUT /store-books/:id (storeBook.controller.js `create` / `update`). Types first: the API
// validates nothing yet (see common.ts).
//
// Supplier prices are never part of this contract. The legacy controllers still read `wholeSalePriceHistory` from the
// body and store it; these schemas leave it out and, since they strip unknown keys, drop it when a form value is
// parsed. Fields the controllers don't read are left out too: `bookId` (generated), `blindTitle`, `books` (box size),
// `priority`, `totalReviews`, `averageReviews`, timestamps and soft-delete flags.
//
// Deliberate: the update leaves `wholeSalePriceHistory` out although the legacy controller `$set`s it, so an update
// through this contract writes it as null. That is intended (the seed never loads supplier prices); do not add it.

const bookPayloadFields = bookFieldsSchema.pick({
  type: true,
  title: true,
  tagline: true,
  eyebrow: true,
  description: true,
  message: true,
  tags: true,
  language: true,
  pages: true,
  readingLevel: true,
  version: true,
  dimensions: true,
  weight: true,
  ISBN: true,
  publicationYear: true,
  publisher: true,
  editorsPick: true,
  bestSeller: true,
  newRelease: true,
  preOrder: true,
  availability: true,
  poster: true,
  images: true,
  inventory: true,
  currentDiscount: true,
  popularity: true,
  price: true,
  rentPrice: true,
  membersPrice: true,
  membersRentPrice: true,
});

// `categories` and `relatedBooks` are iterated by both controllers, so a missing one is a 500 today: always required.
const bookRelations = {
  categories: adminIdListSchema,
  relatedBooks: adminIdListSchema,
  relatedBundles: adminIdListSchema,
  relatedCollections: adminIdListSchema,
};

// Create: model defaults fill whatever is left out, except the lists the controller walks and the poster.
// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminBookCreatePayloadSchema = bookPayloadFields.partial().extend({
  title: bookFieldsSchema.shape.title,
  poster: bookFieldsSchema.shape.poster,
  author: objectIdSchema.nullish(),
  categories: bookRelations.categories,
  relatedBooks: bookRelations.relatedBooks,
  relatedBundles: bookRelations.relatedBundles.optional(),
  relatedCollections: bookRelations.relatedCollections.optional(),
});
export type AdminBookCreatePayload = z.infer<typeof adminBookCreatePayloadSchema>;

// Update: the controller `$set`s every field it reads, so an omitted one is written as null (Mongoose 5 sends
// `undefined` through): every field is required. `author` is not read on update (Phase 4).
export const adminBookUpdatePayloadSchema = bookPayloadFields.extend(bookRelations).required();
export type AdminBookUpdatePayload = z.infer<typeof adminBookUpdatePayloadSchema>;
