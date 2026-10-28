import { adminEmptyResponseSchema, adminStoreCreditIssuePayloadSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin store-credit route (`storeCredit.routes.js`). The shopper's balance and history are 2b's.
export const storeCredit = {
  // POST /store-credit — credits an active customer and emails them; answers 201 with no data.
  issue: defineEndpoint({
    method: 'POST',
    path: '/store-credit',
    body: adminStoreCreditIssuePayloadSchema,
    response: adminEmptyResponseSchema.shape.data,
  }),
};
