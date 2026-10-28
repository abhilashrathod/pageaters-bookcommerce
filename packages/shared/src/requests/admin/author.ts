import type { z } from 'zod';

import { authorFieldsSchema } from '../../catalog/author.ts';
import { adminIdListSchema } from './common.ts';

// POST /authors and PUT /authors/:id (author.controller.js). Types first (see common.ts). `books` is required on both:
// the controllers read `books.length`, so a missing list is a 500 today. They point each listed book at the author.
const authorPayloadFields = authorFieldsSchema.pick({ name: true, intro: true, avatar: true });

export const adminAuthorCreatePayloadSchema = authorPayloadFields.partial().extend({
  name: authorFieldsSchema.shape.name,
  books: adminIdListSchema,
});
export type AdminAuthorCreatePayload = z.infer<typeof adminAuthorCreatePayloadSchema>;

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminAuthorUpdatePayloadSchema = authorPayloadFields.extend({ books: adminIdListSchema });
export type AdminAuthorUpdatePayload = z.infer<typeof adminAuthorUpdatePayloadSchema>;
