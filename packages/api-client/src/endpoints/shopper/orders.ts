import { z } from 'zod';
import {
  customerOrderListResponseSchema,
  customerOrderResponseSchema,
  moneySchema,
  objectIdSchema,
  orderAttemptPayloadSchema,
  orderCreatePayloadSchema,
  orderCustomerRequestSchema,
  orderRequestTypeSchema,
  orderSchema,
  shopperCheckoutOrderResponseSchema,
  shopperEmptyResponseSchema,
  shopperOrderCreateResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The shopper's checkout and orders (`apps/api/src/routes/order.routes.js`, mounted at /orders). `uniqueId` is the
// public `orderId` (`OD-…`). Checkout: `attempt` (address) → optional `applyStoreCredit` → `create` (pay) → for an
// online payment, Razorpay's checkout, which the API confirms through its webhook (not part of this client).
//
// Payloads without a shared schema (store credit, return and cancel requests) are typed here from the controllers
// and listed for Phase 4; the legacy API has no validator for them.
const empty = shopperEmptyResponseSchema.shape.data;
const requestInfo = orderCustomerRequestSchema.shape.info.shape;

export const orders = {
  // GET /orders/getByUniqueId/:uniqueId — the order page; `payment` is the per-method summary.
  detail: defineEndpoint({
    method: 'GET',
    path: '/orders/getByUniqueId/:uniqueId',
    response: customerOrderResponseSchema.shape.data,
  }),
  // GET /orders/list — every placed order, newest first (not paginated; open checkouts left out).
  list: defineEndpoint({ method: 'GET', path: '/orders/list', response: customerOrderListResponseSchema.shape.data }),
  // POST /orders/attempt — opens (or refreshes) the checkout for the cart with this address and prices it.
  // `address` is required here: the shared schema keeps the legacy validator's optional id.
  attempt: defineEndpoint({
    method: 'POST',
    path: '/orders/attempt',
    body: orderAttemptPayloadSchema.required({ address: true }),
    response: empty,
  }),
  // GET /orders/retrieve — the open checkout (attempted or awaiting payment); 400 `ORDER_INFO_ATTEMPT_FAILED` if none.
  checkout: defineEndpoint({ method: 'GET', path: '/orders/retrieve', response: shopperCheckoutOrderResponseSchema.shape.data }),
  // PATCH /orders/credit — applies `amount` rupees of store credit to the open checkout; must not exceed the balance
  // or the order total.
  applyStoreCredit: defineEndpoint({
    method: 'PATCH',
    path: '/orders/credit',
    body: z.strictObject({ uniqueId: orderSchema.shape.orderId, amount: moneySchema }),
    response: empty,
  }),
  // POST /orders/create — places the order. `giftOptions` is required here: the legacy controller reads
  // `giftOptions.isGift` unguarded and answers 500 without it. Cash on delivery confirms the order and empties the
  // cart; online returns the Razorpay order to open the payment with.
  create: defineEndpoint({
    method: 'POST',
    path: '/orders/create',
    body: orderCreatePayloadSchema.required({ giftOptions: true }),
    response: shopperOrderCreateResponseSchema.shape.data,
  }),
  // POST /orders/return/:uniqueId — a return or replacement request for a fulfilled order, within 7 days of
  // delivery. Quirk: past that window the legacy API still answers 200 (status `ORDER_RETURN_PERIOD_LAPSED`, data
  // `{}`), indistinguishable here from success (Phase 4).
  requestReturn: defineEndpoint({
    method: 'POST',
    path: '/orders/return/:uniqueId',
    body: z.strictObject({
      ...requestInfo,
      type: orderRequestTypeSchema.exclude(['CANCEL']),
      // ObjectIds of the books and bundles concerned.
      books: z.array(objectIdSchema).optional(),
      bundles: z.array(objectIdSchema).optional(),
    }),
    response: empty,
  }),
  // POST /orders/cancel/:uniqueId — only while paid or confirmed (not yet shipped); restores the stock.
  cancel: defineEndpoint({
    method: 'POST',
    path: '/orders/cancel/:uniqueId',
    body: z.strictObject(requestInfo),
    response: empty,
  }),
};
