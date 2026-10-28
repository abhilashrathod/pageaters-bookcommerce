import { paginationQuerySchema, shopperStoreCreditBalanceResponseSchema, shopperStoreCreditHistoryResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The shopper's store credit (`apps/api/src/routes/storeCredit.routes.js`). Issuing credit is admin only (2c);
// spending it is `orders.applyStoreCredit`.
export const storeCredit = {
  // GET /store-credit
  balance: defineEndpoint({ method: 'GET', path: '/store-credit', response: shopperStoreCreditBalanceResponseSchema.shape.data }),
  // GET /store-credit/history — newest first; no sort parameters.
  history: defineEndpoint({
    method: 'GET',
    path: '/store-credit/history',
    query: paginationQuerySchema.pick({ page: true, limit: true }),
    response: shopperStoreCreditHistoryResponseSchema.shape.data,
  }),
};
