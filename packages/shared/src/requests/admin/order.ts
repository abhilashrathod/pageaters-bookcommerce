import { z } from 'zod';

import { orderSchema } from '../../commerce/order.ts';
import { orderStatusSchema } from '../../enums.ts';
import { objectIdSchema } from '../../primitives.ts';
import { adminPageQuerySchema } from './common.ts';

// Order admin requests (order.controller.js, admin routes). Types first (see common.ts): no admin order route has a
// validator today.

// GET /orders: paged, newest update first, optionally one status. Attempted and created (unpaid) orders are never
// listed.
export const adminOrderListQuerySchema = adminPageQuerySchema.extend({
  status: orderStatusSchema.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

// POST /orders/ship: a paid or confirmed order → shipped. `orderId` is the order's `_id` (not `OD-…`);
// `shipmentTrackingId` is the carrier's tracking URL or number.
export const adminOrderShipPayloadSchema = z.object({
  orderId: objectIdSchema,
  shipmentTrackingId: z.string().trim().min(1).max(500),
});
export type AdminOrderShipPayload = z.infer<typeof adminOrderShipPayloadSchema>;

// PATCH /orders/return/:id/shipment/:requestId: the reverse (return) or replacement shipment's tracking reference.
export const adminReturnShipmentPayloadSchema = z.object({
  shipment: z.string().trim().min(1).max(500),
});
export type AdminReturnShipmentPayload = z.infer<typeof adminReturnShipmentPayloadSchema>;

// What the API validates for that route: the body plus the path ids. The API merges path, query and body, so a body or
// query value could replace a path id; checking the merged ids keeps an operator object (`?id[$ne]=x`) out of the query.
export const adminReturnShipmentRequestSchema = adminReturnShipmentPayloadSchema.extend({
  id: objectIdSchema,
  requestId: objectIdSchema,
});
export type AdminReturnShipmentRequest = z.infer<typeof adminReturnShipmentRequestSchema>;

// POST /orders/create-shipment/:orderId: books the parcel with the carrier (Delhivery today, the mock shipping
// adapter from Phase 4) for a paid or confirmed order, which becomes shipped. Centimetres and grams.
export const adminShipmentCreatePayloadSchema = z.object({
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    weight: z.number().positive(),
  }),
});
export type AdminShipmentCreatePayload = z.infer<typeof adminShipmentCreatePayloadSchema>;

// What the API validates for that route: the body plus the path's `orderId` (see adminReturnShipmentRequestSchema).
export const adminShipmentCreateRequestSchema = adminShipmentCreatePayloadSchema.extend({
  orderId: objectIdSchema,
});
export type AdminShipmentCreateRequest = z.infer<typeof adminShipmentCreateRequestSchema>;

// POST /orders/admin-cancel/:id. The legacy controller ignores the path and finds the order by `uniqueId` (its
// `OD-…` id) and `userId` from the body, so the admin sends the `OD-…` id in both (Phase 4: read it from the path).
// `reason` becomes the timeline entry and the email text; `notify` emails the customer (production only). Only a paid
// or confirmed order can be cancelled (a shipped or later one answers 400 ORDER_CANCEL_INVALID); the store credit it
// spent stays spent.
export const adminOrderCancelPayloadSchema = z.object({
  uniqueId: orderSchema.shape.orderId,
  userId: objectIdSchema,
  reason: z.string().trim().min(1).max(500),
  notify: z.boolean().optional(),
});
export type AdminOrderCancelPayload = z.infer<typeof adminOrderCancelPayloadSchema>;

// GET /orders/analytics/best-selling and /orders/analytics/revenue: orders created in [startDate, endDate). Both are
// required ISO date-times with an offset, startDate strictly before endDate (Phase 4: the API turns them into dates
// for an aggregation, which nothing else sanitises, so anything else is refused with ORDER_ANALYTICS_INVALID_RANGE).
const analyticsDateSchema = z.iso.datetime({ offset: true, error: 'ORDER_ANALYTICS_INVALID_RANGE' });
export const adminOrderAnalyticsQuerySchema = z
  .strictObject({
    startDate: analyticsDateSchema,
    endDate: analyticsDateSchema,
  })
  .refine(({ startDate, endDate }) => Date.parse(startDate) < Date.parse(endDate), { error: 'ORDER_ANALYTICS_INVALID_RANGE' });
export type AdminOrderAnalyticsQuery = z.infer<typeof adminOrderAnalyticsQuerySchema>;
