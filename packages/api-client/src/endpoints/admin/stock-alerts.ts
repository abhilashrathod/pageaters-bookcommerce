import {
  adminPageQuerySchema,
  adminStockAlertListResponseSchema,
  adminStockAlertNotifyResponseSchema,
  adminStockAlertSubscribersResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin stock-alert routes (`stockAlert.routes.js` "For Admin"). `product` is the store book's `_id`. The shopper's
// subscribe/check/unsubscribe are 2b's.
export const stockAlerts = {
  // GET /stock-alerts — open alerts counted per product.
  list: defineEndpoint({
    method: 'GET',
    path: '/stock-alerts',
    query: adminPageQuerySchema,
    response: adminStockAlertListResponseSchema.shape.data,
  }),
  // GET /stock-alerts/:product/users — who is waiting for this book.
  subscribers: defineEndpoint({
    method: 'GET',
    path: '/stock-alerts/:product/users',
    response: adminStockAlertSubscribersResponseSchema.shape.data,
  }),
  // POST /stock-alerts/:product/users — emails every subscriber that the book is back and closes their alerts.
  notify: defineEndpoint({
    method: 'POST',
    path: '/stock-alerts/:product/users',
    response: adminStockAlertNotifyResponseSchema.shape.data,
  }),
};
