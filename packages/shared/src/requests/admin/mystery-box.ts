import type { z } from 'zod';

import { mysteryBoxSchema } from '../../catalog/mystery-box.ts';

// POST /mystery-boxes and PUT /mystery-boxes/:id (mysteryBox.controller.js). Types first (see common.ts); a box has no
// references, so the API enforces none of it. Neither controller reads `inventory`, so a box's stock can't be set
// through the API today.
const mysteryBoxPayloadFields = mysteryBoxSchema.pick({
  title: true,
  description: true,
  tags: true,
  images: true,
  books: true,
  currentDiscount: true,
  weight: true,
  price: true,
});

export const adminMysteryBoxCreatePayloadSchema = mysteryBoxPayloadFields.partial().extend({
  title: mysteryBoxSchema.shape.title,
});
export type AdminMysteryBoxCreatePayload = z.infer<typeof adminMysteryBoxCreatePayloadSchema>;

// The update `$set`s the fields it reads. Mongoose 8 drops undefined keys from `$set`, so an omitted field keeps its
// current value (it is never written as null); the contract still asks for every field, as for the other catalog
// updates.
export const adminMysteryBoxUpdatePayloadSchema = mysteryBoxPayloadFields.required();
export type AdminMysteryBoxUpdatePayload = z.infer<typeof adminMysteryBoxUpdatePayloadSchema>;
