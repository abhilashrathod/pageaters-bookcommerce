import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';
import { joiNumber } from './convert.ts';

// Cart payloads, ported from apps/api/src/validators/cart.validator.js.

// POST /cart/add. `product` is required since Phase 4 (Joi's `objectId` was optional, so a missing product reached
// the controller). `quantity` accepts numeric strings and defaults to 1. CART_QUANTITY_MAX only bounds the number:
// the API's own per-title limit (2, QUANTITY_LIMIT) is far below it and still answers for 3 and up.
export const CART_QUANTITY_MAX = 100;
export const cartItemAddPayloadSchema = z.strictObject({
  product: objectIdFieldSchema,
  quantity: z.preprocess(joiNumber, z.number({ error: 'REQUIRED_QUANTITY' }).int().min(1).max(CART_QUANTITY_MAX)).default(1),
});
export type CartItemAddPayload = z.infer<typeof cartItemAddPayloadSchema>;
