import { z } from 'zod';

import { orderStatusSchema } from '../../enums.ts';
import { apiResponse, isoDateSchema, objectIdSchema } from '../../primitives.ts';

// Admin analytics (GET /analytics/*, ADMIN only). A "sale" is an order whose status is paid, confirmed, shipped or
// fulfilled (`ANALYTICS_SALE_STATUSES`); revenue and units count sales only. Money is rupees. Days and months are
// Asia/Kolkata calendar days/months, oldest first, with zero-filled gaps.

export const ANALYTICS_SALE_STATUSES = ['paid', 'confirmed', 'shipped', 'fulfilled'] as const;

const count = z.number().int().nonnegative();
const amount = z.number().nonnegative();

export const analyticsDayPointSchema = z.object({ date: z.string(), orders: count, revenue: amount }); // YYYY-MM-DD
export const analyticsMonthPointSchema = z.object({ month: z.string(), units: count, revenue: amount }); // YYYY-MM

// One order in a short "recent" list.
export const analyticsRecentOrderSchema = z.object({
  _id: objectIdSchema,
  uniqueId: z.string(),
  status: orderStatusSchema,
  total: amount,
  createdAt: isoDateSchema,
  customerName: z.string(), // '' when unknown
});

// GET /analytics/summary — the dashboard.
export const adminStoreSummarySchema = z.object({
  orders: z.object({
    total: count, // every order, any status
    today: count,
    last30Days: count,
    byStatus: z.record(z.string(), count), // status → count, statuses with no orders left out
  }),
  revenue: z.object({ total: amount, last30Days: amount, today: amount }),
  customers: z.object({ total: count, newLast30Days: count }), // users with role USER
  catalog: z.object({ books: count, outOfStock: count, bundles: count, authors: count }), // non-deleted
  salesByDay: z.array(analyticsDayPointSchema), // the last 30 days incl. today, sales only
  bestSellers: z.array(z.object({ _id: objectIdSchema, title: z.string(), poster: z.string(), units: count, revenue: amount })), // top 5 books by units, all time
  recentOrders: z.array(analyticsRecentOrderSchema), // newest 5, any status
});
export type AdminStoreSummary = z.infer<typeof adminStoreSummarySchema>;
export const adminStoreSummaryResponseSchema = apiResponse(adminStoreSummarySchema);

// GET /analytics/books/:id — one store book (404 BOOK_NOT_EXIST when it doesn't exist).
export const adminBookAnalyticsSchema = z.object({
  unitsSold: count,
  orderCount: count, // sales containing the book
  revenue: amount, // its line totals in sales
  averageSellingPrice: amount, // revenue / unitsSold, 0 when none
  firstSoldAt: isoDateSchema.nullable(),
  lastSoldAt: isoDateSchema.nullable(),
  cancelledOrReturned: count, // orders with the book that were cancelled or returned
  inCarts: count, // carts holding it now
  inFavourites: count,
  pendingStockAlerts: count,
  salesByMonth: z.array(analyticsMonthPointSchema), // the last 12 months incl. this one
});
export type AdminBookAnalytics = z.infer<typeof adminBookAnalyticsSchema>;
export const adminBookAnalyticsResponseSchema = apiResponse(adminBookAnalyticsSchema);

// GET /analytics/customers/:id — one customer (404 USER_NOT_FOUND when they don't exist).
export const adminCustomerAnalyticsSchema = z.object({
  orderCount: count, // every order, any status
  saleCount: count,
  totalSpent: amount, // sales only
  averageOrderValue: amount, // totalSpent / saleCount, 0 when none
  itemsBought: count, // units across sales
  firstOrderAt: isoDateSchema.nullable(),
  lastOrderAt: isoDateSchema.nullable(),
  ordersByStatus: z.record(z.string(), count),
  favouritesCount: count,
  storeCreditBalance: amount,
  recentOrders: z.array(analyticsRecentOrderSchema), // newest 5
});
export type AdminCustomerAnalytics = z.infer<typeof adminCustomerAnalyticsSchema>;
export const adminCustomerAnalyticsResponseSchema = apiResponse(adminCustomerAnalyticsSchema);
