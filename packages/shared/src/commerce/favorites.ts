import { z } from 'zod';

import { isoDateSchema, objectIdSchema } from '../primitives.ts';

// A shopper's favourites (apps/api/src/models/favorites.model.js), one document per user, created at signup.
// Only `wishlist` is used by an endpoint: GET /favorites selects `_id wishlist` and populates
//   wishlist[] → book (store book: title bookId ISBN author inventory poster price popularity editorsPick
//                currentDiscount newRelease preOrder bestSeller)
// `deals`, `collections` and `bundles` exist in the model but no endpoint writes or reads them.
export const favoritesSchema = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  wishlist: z.array(objectIdSchema),
  deals: z.array(objectIdSchema),
  collections: z.array(objectIdSchema),
  bundles: z.array(objectIdSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Favorites = z.infer<typeof favoritesSchema>;

// GET /favorites: the document selected down to `_id wishlist`.
export const favoritesResponseSchema = favoritesSchema.pick({ _id: true, wishlist: true });
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>;
