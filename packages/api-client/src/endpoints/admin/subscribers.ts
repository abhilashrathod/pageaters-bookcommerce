import { adminPageQuerySchema, adminSubscriberListResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin newsletter route (`subscriber.route.js`). Subscribing is 2b's.
export const subscribers = {
  list: defineEndpoint({
    method: 'GET',
    path: '/subscribers',
    query: adminPageQuerySchema,
    response: adminSubscriberListResponseSchema.shape.data,
  }),
};
