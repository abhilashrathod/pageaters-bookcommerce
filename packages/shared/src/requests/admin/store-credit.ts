import { z } from 'zod';

import { moneySchema, objectIdSchema } from '../../primitives.ts';

// POST /store-credit (storeCredit.controller.js `issueCredit`): credit an active customer's balance and email them.
// Types first (see common.ts). The legacy route has no validator, so a negative or missing `credit` is accepted
// today (Phase 4); the contract requires a positive amount.
export const adminStoreCreditIssuePayloadSchema = z.object({
  userId: objectIdSchema,
  credit: moneySchema.positive(),
  // The order the credit compensates, if any (its `_id`).
  orderId: objectIdSchema.optional(),
});
export type AdminStoreCreditIssuePayload = z.infer<typeof adminStoreCreditIssuePayloadSchema>;
