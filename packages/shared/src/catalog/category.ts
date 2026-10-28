import { z } from 'zod';

import { apiResponse, imageUrlSchema, isoDateSchema, objectIdSchema, paginated } from '../primitives.ts';
import { countSchema, ref } from './common.ts';
import { metaSchema } from './meta.ts';

// A category (API model `categories.model.js`, served at /categories). Books point at categories, not the
// other way round; `numberOfBooks` is a stored count (recomputed by the seed). With no references of its own,
// its fields are the whole document. Layers and references: see `common.ts`.
export const categoryFieldsSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  categoryId: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: imageUrlSchema,
  priority: z.number(),
  popularity: z.number(),
  numberOfBooks: countSchema,
  meta: metaSchema,
});

export const categoryRefSchema = ref(categoryFieldsSchema);
export type CategoryRef = z.infer<typeof categoryRefSchema>;

export const categorySchema = categoryFieldsSchema;
export type Category = z.infer<typeof categorySchema>;

// GET /categories: its `select` projection.
export const categoryListItemSchema = categorySchema.pick({
  _id: true,
  categoryId: true,
  title: true,
  numberOfBooks: true,
  thumbnail: true,
});
export type CategoryListItem = z.infer<typeof categoryListItemSchema>;

export const categoryListResponseSchema = apiResponse(paginated(categoryListItemSchema));
// GET /categories/unique/:categoryId — the whole document.
export const categoryDetailResponseSchema = apiResponse(categorySchema);
