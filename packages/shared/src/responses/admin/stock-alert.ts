import { z } from 'zod';

import { bookFieldsSchema } from '../../catalog/book.ts';
import { stockAlertSchema, stockAlertSummarySchema } from '../../commerce/stock-alert.ts';
import { apiResponse, paginated } from '../../primitives.ts';
import { adminCustomerSchema } from './common.ts';

// Stock alerts as the admin routes send them (stockAlert.controller.js).

// GET /stock-alerts: open alerts grouped per product, paged (`stockAlertSummarySchema`).
export const adminStockAlertListResponseSchema = apiResponse(paginated(stockAlertSummarySchema));

// GET /stock-alerts/:product/users: the open alerts on one product, customer and book populated (null if either
// document is gone). Not paged.
export const adminStockAlertSubscriberSchema = stockAlertSchema.omit({ isDeleted: true, deletedAt: true }).extend({
  user: adminCustomerSchema.nullable(),
  product: bookFieldsSchema.pick({ _id: true, title: true, bookId: true, poster: true, price: true, currentDiscount: true }).nullable(),
});
export type AdminStockAlertSubscriber = z.infer<typeof adminStockAlertSubscriberSchema>;
export const adminStockAlertSubscribersResponseSchema = apiResponse(z.array(adminStockAlertSubscriberSchema));

// POST /stock-alerts/:product/users: emails every subscriber that the book is back and closes their alerts.
export const adminStockAlertNotifyResultSchema = z.object({
  success: z.literal(true),
  // How many customers were emailed.
  subscribers: z.number().int().nonnegative(),
});
export type AdminStockAlertNotifyResult = z.infer<typeof adminStockAlertNotifyResultSchema>;
export const adminStockAlertNotifyResponseSchema = apiResponse(adminStockAlertNotifyResultSchema);
