import { z } from 'zod';

import { isoDateSchema, moneySchema, objectIdSchema } from '../primitives.ts';

// StoreCreditTransaction.action. The model types it as a free string; the API only ever writes these two
// (admin issue and cancel/refund return → CREDIT, checkout spend → DEBIT). Same convention as ../enums.ts.
export const StoreCreditAction = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;
export const storeCreditActionSchema = z.enum(StoreCreditAction);
export type StoreCreditAction = z.infer<typeof storeCreditActionSchema>;

// One store-credit transaction (apps/api/src/models/storeCredit.model.js), as GET /store-credit/history pages them.
// The running balance lives on the user (`User.storeCredit`).
export const storeCreditSchema = z.object({
  _id: objectIdSchema,
  // 'CR-' (issued by an admin) or 'SC-' (spent at checkout) plus 10 digits, or 'RF-' plus the order's `_id`: the
  // credit a cancel or a full refund gives back (one per order).
  creditId: z.string().regex(/^(?:(?:CR|SC)-\d{10}|RF-[0-9a-f]{24})$/),
  userId: objectIdSchema,
  // The order it was issued for or spent on. Optional: an admin may issue credit without one.
  orderId: objectIdSchema.optional(),
  // Always positive; `action` says which way it moved the balance.
  amount: moneySchema,
  action: storeCreditActionSchema,
  // No endpoint expires credit yet: false and ''.
  expired: z.boolean(),
  expiredAt: z.union([isoDateSchema, z.literal('')]),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type StoreCredit = z.infer<typeof storeCreditSchema>;

// GET /store-credit: the user document selected down to its balance.
export const storeCreditBalanceSchema = z.object({
  _id: objectIdSchema,
  storeCredit: moneySchema,
});
export type StoreCreditBalance = z.infer<typeof storeCreditBalanceSchema>;
