import {
  adminBookCreatePayloadSchema,
  adminBookUpdatePayloadSchema,
  adminEmptyResponseSchema,
  bookDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin store-book routes (`apps/api/src/routes/storeBooks.routes.js`). `id` is the book's `_id`. The public list,
// detail and search are 2b's; `GET /store-books/bulk/export` is excluded (unauthenticated dev-only CSV export).
// Responses are whole documents: the legacy API still sends `wholeSalePriceHistory` and the soft-delete flags, which
// the contract leaves out (dropped when validation is on; Phase 4 stops sending them).
export const storeBooks = {
  // GET /store-books/get/:id — author, categories and related* populated.
  detail: defineEndpoint({ method: 'GET', path: '/store-books/get/:id', response: bookDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/store-books',
    body: adminBookCreatePayloadSchema,
    response: bookDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/store-books/:id',
    body: adminBookUpdatePayloadSchema,
    response: bookDetailResponseSchema.shape.data,
  }),
  // Soft delete; also unlinks the book from related books, bundles and collections.
  remove: defineEndpoint({ method: 'DELETE', path: '/store-books/:id', response: adminEmptyResponseSchema.shape.data }),
};
