import { z } from 'zod';

import { objectIdSchema } from '../primitives.ts';

// A gift card (apps/api/src/models/giftCard.model.js). A placeholder in the API: no endpoint creates or returns one,
// and checkout always sets `Order.giftCard` to null. The model has no timestamps.
export const giftCardSchema = z.object({
  _id: objectIdSchema,
  giftCardId: z.string(),
});
export type GiftCard = z.infer<typeof giftCardSchema>;
