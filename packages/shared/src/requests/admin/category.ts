import type { z } from 'zod';

import { categoryFieldsSchema } from '../../catalog/category.ts';

// POST /categories and PUT /categories/:id (category.controller.js). Types first (see common.ts). `numberOfBooks` is
// a stored count the book writes maintain; `categoryId` is generated.

// Create reads only these four.
export const adminCategoryCreatePayloadSchema = categoryFieldsSchema
  .pick({ title: true, description: true, thumbnail: true, meta: true })
  .partial({ description: true, thumbnail: true, meta: true });
export type AdminCategoryCreatePayload = z.infer<typeof adminCategoryCreatePayloadSchema>;

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminCategoryUpdatePayloadSchema = categoryFieldsSchema.pick({
  title: true,
  description: true,
  thumbnail: true,
  meta: true,
  popularity: true,
  priority: true,
});
export type AdminCategoryUpdatePayload = z.infer<typeof adminCategoryUpdatePayloadSchema>;
