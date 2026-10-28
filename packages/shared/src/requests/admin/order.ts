import { z } from 'zod';

import { orderSchema } from '../../commerce/order.ts';
import { orderStatusSchema } from '../../enums.ts';
import { isoDateSchema, objectIdSchema } from '../../primitives.ts';
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

// POST /orders/admin-cancel/:id. The legacy controller ignores the path and finds the order by `uniqueId` (its
// `OD-…` id) and `userId` from the body, so the admin sends the `OD-…` id in both (Phase 4: read it from the path).
// `reason` becomes the timeline entry and the email text; `notify` emails the customer (production only).
export const adminOrderCancelPayloadSchema = z.object({
  uniqueId: orderSchema.shape.orderId,
  userId: objectIdSchema,
  reason: z.string().trim().min(1).max(500),
  notify: z.boolean().optional(),
});
export type AdminOrderCancelPayload = z.infer<typeof adminOrderCancelPayloadSchema>;

// GET /orders/analytics/best-selling and /orders/analytics/revenue: orders created in [startDate, endDate).
export const adminOrderAnalyticsQuerySchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});
export type AdminOrderAnalyticsQuery = z.infer<typeof adminOrderAnalyticsQuerySchema>;
