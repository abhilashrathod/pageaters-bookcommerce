import {
  favoritesListResponseSchema,
  favoritesRequestPayloadSchema,
  shopperCheckResponseSchema,
  shopperEmptyResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The shopper's favourite books (`apps/api/src/routes/favorites.routes.js`). `product` is the book's ObjectId.
export const favorites = {
  // GET /favorites — null for a legacy shopper with no favourites document.
  list: defineEndpoint({ method: 'GET', path: '/favorites', response: favoritesListResponseSchema.shape.data }),
  // GET /favorites/:product — whether the book is a favourite.
  check: defineEndpoint({ method: 'GET', path: '/favorites/:product', response: shopperCheckResponseSchema.shape.data }),
  // POST /favorites — `product` is required here (the shared schema keeps the legacy validator's optional id).
  // Adding a favourite twice is a 400 `WISH_LIST_BOOK_PRESENT`.
  add: defineEndpoint({
    method: 'POST',
    path: '/favorites',
    body: favoritesRequestPayloadSchema.required({ product: true }),
    response: shopperEmptyResponseSchema.shape.data,
  }),
  // DELETE /favorites/:product
  remove: defineEndpoint({ method: 'DELETE', path: '/favorites/:product', response: shopperEmptyResponseSchema.shape.data }),
};
