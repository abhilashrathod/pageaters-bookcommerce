import { z } from 'zod';

import { apiResponse, isoDateSchema, imageUrlSchema, moneySchema, objectIdSchema, paginated } from '../primitives.ts';
import { countSchema, discountSchema } from './common.ts';

// A mystery box of unnamed books (API model `mysteryBox.model.js`, served at /mystery-boxes). Not in the seed.
export const mysteryBoxSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  boxId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  images: z.array(imageUrlSchema),
  currentDiscount: discountSchema,
  // Grams.
  weight: z.number().nonnegative(),
  inventory: countSchema,
  price: moneySchema,
  // How many books the box holds.
  books: countSchema,
});
export type MysteryBox = z.infer<typeof mysteryBoxSchema>;

// GET /mystery-boxes: whole documents.
export const mysteryBoxListResponseSchema = apiResponse(paginated(mysteryBoxSchema));
// GET /mystery-boxes/unique/:boxId.
export const mysteryBoxDetailResponseSchema = apiResponse(mysteryBoxSchema);
