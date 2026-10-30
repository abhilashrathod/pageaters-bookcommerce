import { z } from 'zod';
import { orderSchema } from '../commerce/order.ts';
import { OrderRequestType } from '../enums.ts';
import { hasAtMostTwoDecimals } from '../primitives.ts';
import { objectIdFieldSchema } from './common.ts';
import { joiBoolean, joiNumber } from './convert.ts';

// Checkout payloads, ported from apps/api/src/validators/order.validator.js.

// How the shopper pays at checkout: cash on delivery, or online through Razorpay (the order's stored
// `payment.method` is then Razorpay's method name, see PaymentMethod).
export const CheckoutMethod = {
  COD: 'cod',
  ONLINE: 'online',
} as const;
export const checkoutMethodSchema = z.enum(CheckoutMethod, { error: 'INVALID_PAYMENT_METHOD' });
export type CheckoutMethod = z.infer<typeof checkoutMethodSchema>;

// POST /order/attempt. `address` is required since Phase 4 (Joi's `objectId` was optional, so a missing address
// reached the controller).
export const orderAttemptPayloadSchema = z.strictObject({
  address: objectIdFieldSchema,
});
export type OrderAttemptPayload = z.infer<typeof orderAttemptPayloadSchema>;

// The gift fields have no error codes in Joi (except `isGift`), so they fail with zod's default messages. Their
// maximum lengths (GIFT_LIMITS, after trimming) and the cap on the gift-wrap cost (whole rupees; the API adds it to
// the order total) date from Phase 4.
export const GIFT_LIMITS = { package: 100, from: 100, message: 500, cost: 1000 } as const;
const optionalTrimmed = (max: number) => z.string().trim().max(max).optional();

// POST /order/create.
export const orderCreatePayloadSchema = z.strictObject({
  // Trimmed first, as Joi did (' cod ' passes).
  method: z.string({ error: 'INVALID_PAYMENT_METHOD' }).trim().pipe(checkoutMethodSchema),
  instructions: z.string({ error: 'INVALID_INSTRUCTIONS' }).trim().max(100).optional(),
  giftOptions: z
    .strictObject({
      // Joi reused the address `isDefault` code here.
      isGift: z.preprocess(joiBoolean, z.boolean({ error: 'INVALID_DEFAULT_SELECTION' })),
      details: z
        .strictObject({
          package: optionalTrimmed(GIFT_LIMITS.package),
          from: optionalTrimmed(GIFT_LIMITS.from),
          message: optionalTrimmed(GIFT_LIMITS.message),
          cost: z.preprocess(joiNumber, z.number().int().min(0).max(GIFT_LIMITS.cost)).default(0),
        })
        .optional(),
    })
    .optional(),
});
export type OrderCreatePayload = z.infer<typeof orderCreatePayloadSchema>;

// The shopper's order routes below had no validator in the legacy API (Phase 4). `uniqueId` is the public order id
// (`orderSchema.shape.orderId`); a malformed one fails with the code the API answers for an unknown order.
const uniqueIdFieldSchema = z
  .string({ error: 'ORDER_INFO_ATTEMPT_FAILED' })
  .refine((value) => orderSchema.shape.orderId.safeParse(value).success);
const requestTextSchema = (max: number) => z.string({ error: 'ORDER_INFO_ATTEMPT_FAILED' }).trim().max(max).optional();
export const ORDER_REQUEST_LIMITS = { reason: 500, comments: 1000, items: 100 } as const;

export const STORE_CREDIT_AMOUNT_MAX = 100_000;

// PATCH /order/credit: how much of the shopper's store credit the order uses: rupees ≥ 0 with at most two decimals,
// up to STORE_CREDIT_AMOUNT_MAX (the API then checks it against the balance and the order total).
export const orderStoreCreditPayloadSchema = z.strictObject({
  uniqueId: uniqueIdFieldSchema,
  amount: z
    .number({ error: 'INVALID_AMOUNT' })
    .min(0, { error: 'STORE_CREDIT_NEGATIVE' })
    .max(STORE_CREDIT_AMOUNT_MAX)
    .refine(hasAtMostTwoDecimals),
});
export type OrderStoreCreditPayload = z.infer<typeof orderStoreCreditPayloadSchema>;

// POST /order/return/:uniqueId: a return or replacement request for a delivered order. `books` and `bundles` are the
// ids of the order lines it concerns.
export const orderReturnPayloadSchema = z.strictObject({
  uniqueId: uniqueIdFieldSchema,
  type: z.enum([OrderRequestType.RETURN, OrderRequestType.REPLACE], { error: 'ORDER_INFO_ATTEMPT_FAILED' }),
  reason: requestTextSchema(ORDER_REQUEST_LIMITS.reason),
  comments: requestTextSchema(ORDER_REQUEST_LIMITS.comments),
  books: z.array(objectIdFieldSchema).max(ORDER_REQUEST_LIMITS.items).optional(),
  bundles: z.array(objectIdFieldSchema).max(ORDER_REQUEST_LIMITS.items).optional(),
});
export type OrderReturnPayload = z.infer<typeof orderReturnPayloadSchema>;

// POST /order/cancel/:uniqueId: the shopper cancels a paid or confirmed order.
export const orderCancelPayloadSchema = z.strictObject({
  uniqueId: uniqueIdFieldSchema,
  reason: requestTextSchema(ORDER_REQUEST_LIMITS.reason),
  comments: requestTextSchema(ORDER_REQUEST_LIMITS.comments),
});
export type OrderCancelPayload = z.infer<typeof orderCancelPayloadSchema>;
