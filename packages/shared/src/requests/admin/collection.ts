import type { z } from 'zod';

import { collectionFieldsSchema } from '../../catalog/collection.ts';
import { adminIdListSchema } from './common.ts';

// POST /collections and PUT /collections/:id (collection.controller.js). Types first (see common.ts). `books` and
// `relatedCollections` are iterated by both controllers (a missing list is a 500 today), so they are always required.
const collectionPayloadFields = collectionFieldsSchema.pick({
  title: true,
  description: true,
  tags: true,
  poster: true,
  priority: true,
  popularity: true,
});

const collectionRelations = {
  books: adminIdListSchema,
  relatedCollections: adminIdListSchema,
  relatedCategories: adminIdListSchema,
  featuredAuthors: adminIdListSchema,
};

// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminCollectionCreatePayloadSchema = collectionPayloadFields.partial().extend({
  title: collectionFieldsSchema.shape.title,
  poster: collectionFieldsSchema.shape.poster,
  books: collectionRelations.books,
  relatedCollections: collectionRelations.relatedCollections,
  relatedCategories: collectionRelations.relatedCategories.optional(),
  featuredAuthors: collectionRelations.featuredAuthors.optional(),
});
export type AdminCollectionCreatePayload = z.infer<typeof adminCollectionCreatePayloadSchema>;

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminCollectionUpdatePayloadSchema = collectionPayloadFields.extend(collectionRelations).required();
export type AdminCollectionUpdatePayload = z.infer<typeof adminCollectionUpdatePayloadSchema>;
