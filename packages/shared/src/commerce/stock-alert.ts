import { z } from 'zod';

import { isoDateSchema, objectIdSchema } from '../primitives.ts';

// A "notify me when it's back in stock" request (apps/api/src/models/stockAlerts.modal.js). The admin's per-product
// list populates
//   user    → user (fullName email contactNo)
//   product → book (store book: title bookId poster price currentDiscount)
export const stockAlertSchema = z.object({
  _id: objectIdSchema,
  user: objectIdSchema,
  product: objectIdSchema,
  isDeleted: z.boolean(),
  // Legacy free-form string: '' or a `Date` cast to String by Mongoose, not ISO.
  deletedAt: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type StockAlert = z.infer<typeof stockAlertSchema>;

// GET /stock-alerts (admin): open alerts grouped by product (an aggregate, so `_id` is the product's ID).
export const stockAlertSummarySchema = z.object({
  _id: objectIdSchema,
  totalProducts: z.number().int().positive(),
});
export type StockAlertSummary = z.infer<typeof stockAlertSummarySchema>;
