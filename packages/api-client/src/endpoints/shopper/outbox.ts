import { shopperOutboxResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The demo's in-app outbox (`apps/api/src/routes/outbox.routes.js`): what the mock e-mail and SMS adapters "sent".
export const outbox = {
  // GET /outbox — the newest 50 messages to the signed-in user, newest first.
  list: defineEndpoint({ method: 'GET', path: '/outbox', response: shopperOutboxResponseSchema.shape.data }),
};
