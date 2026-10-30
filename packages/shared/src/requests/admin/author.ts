import { z } from 'zod';

import { authorFieldsSchema } from '../../catalog/author.ts';
import { adminOptionalIdListSchema } from './common.ts';

// POST /authors and PUT /authors/:id (author.controller.js). Types first (see common.ts). Both point each book in
// `books` at the author; `books` may be left out (create: no books; update: list unchanged).
const authorPayloadFields = authorFieldsSchema.pick({ name: true, intro: true, avatar: true });

// The image is required on create, as every catalog document has one (https, `imageUrlSchema`). Until Phase 4/5
// the legacy upload answers with a stored key, not a URL, so a form fed by it fails this check.
export const adminAuthorCreatePayloadSchema = authorPayloadFields.partial().extend({
  name: authorFieldsSchema.shape.name,
  avatar: authorFieldsSchema.shape.avatar,
  books: adminOptionalIdListSchema,
});
export type AdminAuthorCreatePayload = z.infer<typeof adminAuthorCreatePayloadSchema>;

// The update `$set`s every field it reads, so the scalar fields are required; `books` may be left out (common.ts).
export const adminAuthorUpdatePayloadSchema = authorPayloadFields.required().extend({ books: adminOptionalIdListSchema });
export type AdminAuthorUpdatePayload = z.infer<typeof adminAuthorUpdatePayloadSchema>;

// What the API enforces on POST and PUT: `books` is a list of ids (see common.ts).
export const adminAuthorBooksPayloadSchema = z.object({ books: adminOptionalIdListSchema });
export type AdminAuthorBooksPayload = z.infer<typeof adminAuthorBooksPayloadSchema>;
