import { shopperEmptyResponseSchema, subscriberRootPayloadSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Newsletter sign-up (`apps/api/src/routes/subscriber.route.js`, mounted at /subscribers). The list is admin only.
export const subscribers = {
  // POST /subscribers — public. An address already subscribed also succeeds (status `SUBSCRIBER_EXIST`).
  subscribe: defineEndpoint({
    method: 'POST',
    path: '/subscribers',
    body: subscriberRootPayloadSchema,
    response: shopperEmptyResponseSchema.shape.data,
  }),
};
