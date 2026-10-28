import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';
import { joiBoolean, joiNumber } from './convert.ts';

// Checkout payloads, ported from apps/api/src/validators/order.validator.js.

// How the shopper pays at checkout: cash on delivery, or online through Razorpay (the order's stored
// `payment.method` is then Razorpay's method name, see PaymentMethod).
export const CheckoutMethod = {
  COD: 'cod',
  ONLINE: 'online',
} as const;
export const checkoutMethodSchema = z.enum(CheckoutMethod);
export type CheckoutMethod = z.infer<typeof checkoutMethodSchema>;

// POST /order/attempt. `address` is optional because the Joi `objectId` was; kept for parity, to be tightened in
// Phase 4.
export const orderAttemptPayloadSchema = z.strictObject({
  address: objectIdFieldSchema.optional(),
});
export type OrderAttemptPayload = z.infer<typeof orderAttemptPayloadSchema>;

// The gift fields have no error codes in Joi (except `isGift`), so they fail with zod's default messages.
const optionalTrimmed = z.string().trim().optional();

// POST /order/create.
export const orderCreatePayloadSchema = z.strictObject({
  method: z
    .string({ error: 'INVALID_PAYMENT_METHOD' })
    .trim()
    .pipe(z.enum(CheckoutMethod, { error: 'INVALID_PAYMENT_METHOD' })),
  instructions: z.string({ error: 'INVALID_INSTRUCTIONS' }).trim().max(100).optional(),
  giftOptions: z
    .strictObject({
      // Joi reused the address `isDefault` code here.
      isGift: z.preprocess(joiBoolean, z.boolean({ error: 'INVALID_DEFAULT_SELECTION' })),
      details: z
        .strictObject({
          package: optionalTrimmed,
          from: optionalTrimmed,
          message: optionalTrimmed,
          cost: z.preprocess(joiNumber, z.number().int().min(0)).default(0),
        })
        .optional(),
    })
    .optional(),
});
export type OrderCreatePayload = z.infer<typeof orderCreatePayloadSchema>;
