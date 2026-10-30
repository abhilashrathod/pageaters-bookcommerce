import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';

// Favourites payloads, ported from apps/api/src/validators/favorites.validator.js. One schema serves
// GET /favorites/:product, POST /favorites and DELETE /favorites/:product. `product` is required since Phase 4
// (Joi's `objectId` was optional, so POST without a product reached the controller).
export const favoritesRequestPayloadSchema = z.strictObject({
  product: objectIdFieldSchema,
});
export type FavoritesRequestPayload = z.infer<typeof favoritesRequestPayloadSchema>;
