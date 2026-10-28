import { z } from 'zod';
import {
  bookDetailResponseSchema,
  bookListResponseSchema,
  paginationQuerySchema,
  productTypeSchema,
  shopperBookSearchResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Public store-book reads (`apps/api/src/routes/storeBooks.routes.js`, mounted at /store-books). The admin routes
// are 2c's; GET /store-books/bulk/export (a CSV dump) is left out.
export const books = {
  // GET /store-books — `type` defaults to 'book' (the collection also holds boxes and blind books). `sortBy` must be
  // one of title, createdAt, popularity, priority, currentDiscount.
  list: defineEndpoint({
    method: 'GET',
    path: '/store-books',
    query: paginationQuerySchema.extend({ type: productTypeSchema.optional() }),
    response: bookListResponseSchema.shape.data,
  }),
  // GET /store-books/unique/:id — `id` is the public `bookId`, not the ObjectId.
  detail: defineEndpoint({
    method: 'GET',
    path: '/store-books/unique/:id',
    response: bookDetailResponseSchema.shape.data,
  }),
  // GET /store-books/search?q= — prefix search, at most 10 books; an empty `q` answers [].
  search: defineEndpoint({
    method: 'GET',
    path: '/store-books/search',
    query: z.object({ q: z.string() }),
    response: shopperBookSearchResponseSchema.shape.data,
  }),
};
