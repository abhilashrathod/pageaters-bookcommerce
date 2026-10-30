import { z } from 'zod';

import { collectionFieldsSchema } from '../../catalog/collection.ts';
import { adminOptionalIdListSchema } from './common.ts';

// POST /collections and PUT /collections/:id (collection.controller.js). Types first (see common.ts). Reference lists
// may be left out (common.ts).
const collectionPayloadFields = collectionFieldsSchema.pick({
  title: true,
  description: true,
  tags: true,
  poster: true,
  priority: true,
  popularity: true,
});

const collectionRelations = {
  books: adminOptionalIdListSchema,
  relatedCollections: adminOptionalIdListSchema,
  relatedCategories: adminOptionalIdListSchema,
  featuredAuthors: adminOptionalIdListSchema,
};

// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminCollectionCreatePayloadSchema = collectionPayloadFields.partial().extend({
  title: collectionFieldsSchema.shape.title,
  poster: collectionFieldsSchema.shape.poster,
  ...collectionRelations,
});
export type AdminCollectionCreatePayload = z.infer<typeof adminCollectionCreatePayloadSchema>;

// The update `$set`s every field it reads, so the scalar fields are required; the reference lists may be left out.
export const adminCollectionUpdatePayloadSchema = collectionPayloadFields.required().extend(collectionRelations);
export type AdminCollectionUpdatePayload = z.infer<typeof adminCollectionUpdatePayloadSchema>;

// What the API enforces on POST and PUT: every reference is an id (see common.ts).
export const adminCollectionReferencesPayloadSchema = z.object(collectionRelations);
export type AdminCollectionReferencesPayload = z.infer<typeof adminCollectionReferencesPayloadSchema>;
