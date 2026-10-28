import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';
import { joiNumber } from './convert.ts';

// Cart payloads, ported from apps/api/src/validators/cart.validator.js.

// POST /cart/add. `product` is optional because the Joi `objectId` was (the controller then fails on a missing
// product); kept for parity, to be tightened in Phase 4. `quantity` accepts numeric strings and defaults to 1.
export const cartItemAddPayloadSchema = z.strictObject({
  product: objectIdFieldSchema.optional(),
  quantity: z.preprocess(joiNumber, z.number({ error: 'REQUIRED_QUANTITY' }).int().min(1)).default(1),
});
export type CartItemAddPayload = z.infer<typeof cartItemAddPayloadSchema>;
