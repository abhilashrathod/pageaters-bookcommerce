import type { z } from 'zod';

import { authorFieldsSchema } from '../../catalog/author.ts';
import { adminIdListSchema } from './common.ts';

// POST /authors and PUT /authors/:id (author.controller.js). Types first (see common.ts). `books` is required on both:
// the controllers read `books.length`, so a missing list is a 500 today. They point each listed book at the author.
const authorPayloadFields = authorFieldsSchema.pick({ name: true, intro: true, avatar: true });

// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminAuthorCreatePayloadSchema = authorPayloadFields.partial().extend({
  name: authorFieldsSchema.shape.name,
  avatar: authorFieldsSchema.shape.avatar,
  books: adminIdListSchema,
});
export type AdminAuthorCreatePayload = z.infer<typeof adminAuthorCreatePayloadSchema>;

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminAuthorUpdatePayloadSchema = authorPayloadFields.extend({ books: adminIdListSchema }).required();
export type AdminAuthorUpdatePayload = z.infer<typeof adminAuthorUpdatePayloadSchema>;
