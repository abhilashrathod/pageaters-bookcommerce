import { z } from 'zod';
import { objectIdSchema, shopperCheckResponseSchema, shopperEmptyResponseSchema, shopperStockAlertResponseSchema } from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// "Notify me when it's back in stock" (`apps/api/src/routes/stockAlert.routes.js`). `product` is the book's
// ObjectId. The legacy API has no validator here; the payload is typed from the controller (Phase 4). The admin
// routes are 2c's.
export const stockAlerts = {
  // GET /stock-alerts/:product — whether the shopper has an open alert for the book.
  check: defineEndpoint({ method: 'GET', path: '/stock-alerts/:product', response: shopperCheckResponseSchema.shape.data }),
  // POST /stock-alerts — a second alert for the same book is a 400 `STOCK_ALERT_EXISTS`.
  subscribe: defineEndpoint({
    method: 'POST',
    path: '/stock-alerts',
    body: z.strictObject({ product: objectIdSchema }),
    response: shopperStockAlertResponseSchema.shape.data,
  }),
  // DELETE /stock-alerts/:product — with no open alert it answers 400 `STOCK_ALERT_NOT_EXIST`.
  unsubscribe: defineEndpoint({ method: 'DELETE', path: '/stock-alerts/:product', response: shopperEmptyResponseSchema.shape.data }),
};
