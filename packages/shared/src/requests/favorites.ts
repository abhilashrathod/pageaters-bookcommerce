import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';

// Favourites payloads, ported from apps/api/src/validators/favorites.validator.js. One schema serves
// GET /favorites/:product, POST /favorites and DELETE /favorites/:product. `product` is optional because the Joi
// `objectId` was; kept for parity, to be tightened in Phase 4.
export const favoritesRequestPayloadSchema = z.strictObject({
  product: objectIdFieldSchema.optional(),
});
export type FavoritesRequestPayload = z.infer<typeof favoritesRequestPayloadSchema>;
