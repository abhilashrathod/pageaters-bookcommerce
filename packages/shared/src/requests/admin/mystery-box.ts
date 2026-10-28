import type { z } from 'zod';

import { mysteryBoxSchema } from '../../catalog/mystery-box.ts';

// POST /mystery-boxes and PUT /mystery-boxes/:id (mysteryBox.controller.js). Types first (see common.ts). Neither
// controller reads `inventory`, so a box's stock can't be set through the API today (Phase 4).
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

// The update `$set`s every field it reads; an omitted one is written as null, so all are required.
export const adminMysteryBoxUpdatePayloadSchema = mysteryBoxPayloadFields;
export type AdminMysteryBoxUpdatePayload = z.infer<typeof adminMysteryBoxUpdatePayloadSchema>;
