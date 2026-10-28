import {
  adminMysteryBoxCreatePayloadSchema,
  adminMysteryBoxUpdatePayloadSchema,
  adminEmptyResponseSchema,
  mysteryBoxDetailResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin mystery-box routes (`mysteryBox.routes.js`). `id` is the box's `_id`. Public list/detail are 2b's.
export const mysteryBoxes = {
  detail: defineEndpoint({ method: 'GET', path: '/mystery-boxes/:id', response: mysteryBoxDetailResponseSchema.shape.data }),
  create: defineEndpoint({
    method: 'POST',
    path: '/mystery-boxes',
    body: adminMysteryBoxCreatePayloadSchema,
    response: mysteryBoxDetailResponseSchema.shape.data,
  }),
  update: defineEndpoint({
    method: 'PUT',
    path: '/mystery-boxes/:id',
    body: adminMysteryBoxUpdatePayloadSchema,
    response: mysteryBoxDetailResponseSchema.shape.data,
  }),
  remove: defineEndpoint({ method: 'DELETE', path: '/mystery-boxes/:id', response: adminEmptyResponseSchema.shape.data }),
};
