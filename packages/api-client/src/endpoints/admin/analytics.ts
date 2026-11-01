import { adminBookAnalyticsResponseSchema, adminCustomerAnalyticsResponseSchema, adminStoreSummaryResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin analytics (`analytics.routes.js`, ADMIN only). Shapes and the "sale" rule: `responses/admin/analytics.ts`.
export const analytics = {
  // GET /analytics/summary — the dashboard's numbers.
  summary: defineEndpoint({ method: 'GET', path: '/analytics/summary', response: adminStoreSummaryResponseSchema.shape.data }),
  // GET /analytics/books/:id — one store book's sales.
  book: defineEndpoint({ method: 'GET', path: '/analytics/books/:id', response: adminBookAnalyticsResponseSchema.shape.data }),
  // GET /analytics/customers/:id — one customer's orders and spend.
  customer: defineEndpoint({
    method: 'GET',
    path: '/analytics/customers/:id',
    response: adminCustomerAnalyticsResponseSchema.shape.data,
  }),
};
