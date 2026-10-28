import {
  adminAuthorCreatePayloadSchema,
  adminAuthorUpdatePayloadSchema,
  adminEmptyResponseSchema,
  authorDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin author routes (`author.routes.js`). `id` is the author's `_id`; GET populates `books` (`_id title`). Writes
// point every listed book at the author; delete unlinks them. Public list/detail/search are 2b's.
export const authors = {
  detail: defineEndpoint({ method: 'GET', path: '/authors/:id', response: authorDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/authors',
    body: adminAuthorCreatePayloadSchema,
    response: authorDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/authors/:id',
    body: adminAuthorUpdatePayloadSchema,
    response: authorDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/authors/:id', response: adminEmptyResponseSchema.shape.data }),
};
