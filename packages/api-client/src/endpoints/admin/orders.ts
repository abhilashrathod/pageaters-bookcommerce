import {
  adminBestSellingResponseSchema,
  adminEmptyResponseSchema,
  adminOrderAnalyticsQuerySchema,
  adminOrderCancelPayloadSchema,
  adminOrderListQuerySchema,
  adminOrderListResponseSchema,
  adminOrderResponseSchema,
  adminOrderSearchResponseSchema,
  adminOrderShipPayloadSchema,
  adminOrderWithCustomerResponseSchema,
  adminReturnShipmentPayloadSchema,
  adminRevenueResponseSchema,
  adminSearchQuerySchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Admin order routes (`order.routes.js`, ADMIN and ANALYTICS sections). `id` is the order's `_id` unless noted;
// `requestId` is a customer request's `_id` (`order.requests[]`). Lifecycle: paid/confirmed -> ship -> shipped ->
// deliver -> fulfilled; returned/replacement -> alignReturnShipment -> in progress -> closeReturn / closeReplacement;
// paid/confirmed/shipped -> cancel. Each step emails the customer (mock outbox from Phase 5). The Razorpay webhooks
// (`POST /orders/confirm`, `/orders/refund/processed`) are not client calls and are excluded.
export const orders = {
  // GET /orders — newest update first; never attempted or created (unpaid) orders.
  list: defineEndpoint({
    method: 'GET',
    path: '/orders',
    query: adminOrderListQuerySchema,
    response: adminOrderListResponseSchema.shape.data,
  }),
  // GET /orders/getById/:id — the whole order, lines and address populated. The legacy API sends the raw Razorpay
  // payment here; the contract is the summary (Phase 4).
  detail: defineEndpoint({ method: 'GET', path: '/orders/getById/:id', response: adminOrderResponseSchema.shape.data }),
  // GET /orders/search?q= — orders whose `orderId` contains `q`; not paged.
  search: defineEndpoint({
    method: 'GET',
    path: '/orders/search',
    query: adminSearchQuerySchema,
    response: adminOrderSearchResponseSchema.shape.data,
  }),
  // POST /orders/ship — paid/confirmed -> shipped; body `orderId` is the `_id`.
  ship: defineEndpoint({
    method: 'POST',
    path: '/orders/ship',
    body: adminOrderShipPayloadSchema,
    response: adminOrderWithCustomerResponseSchema.shape.data,
  }),
  // PATCH /orders/ship/:id/complete — shipped -> fulfilled.
  deliver: defineEndpoint({
    method: 'PATCH',
    path: '/orders/ship/:id/complete',
    response: adminOrderWithCustomerResponseSchema.shape.data,
  }),
  // PATCH /orders/return/:id/shipment/:requestId — aligns the return pickup or the replacement shipment.
  alignReturnShipment: defineEndpoint({
    method: 'PATCH',
    path: '/orders/return/:id/shipment/:requestId',
    body: adminReturnShipmentPayloadSchema,
    response: adminEmptyResponseSchema.shape.data,
  }),
  // PATCH /orders/return/:id/shipment/:requestId/close — return in progress -> returned (refund follows).
  closeReturn: defineEndpoint({
    method: 'PATCH',
    path: '/orders/return/:id/shipment/:requestId/close',
    response: adminEmptyResponseSchema.shape.data,
  }),
  // PATCH /orders/replace/:id/shipment/:requestId/close — replacement in progress -> fulfilled.
  closeReplacement: defineEndpoint({
    method: 'PATCH',
    path: '/orders/replace/:id/shipment/:requestId/close',
    response: adminEmptyResponseSchema.shape.data,
  }),
  // POST /orders/admin-cancel/:id — here `id` is the order's `OD-…` id, and the legacy controller reads it from the
  // body's `uniqueId`, so send it in both (Phase 4: read the path). Restores stock; issues no refund.
  cancel: defineEndpoint({
    method: 'POST',
    path: '/orders/admin-cancel/:id',
    body: adminOrderCancelPayloadSchema,
    response: adminEmptyResponseSchema.shape.data,
  }),
  // GET /orders/analytics/best-selling — the legacy pipeline always answers [] (it matches a `status` field; Phase 4).
  bestSelling: defineEndpoint({
    method: 'GET',
    path: '/orders/analytics/best-selling',
    query: adminOrderAnalyticsQuerySchema,
    response: adminBestSellingResponseSchema.shape.data,
  }),
  // GET /orders/analytics/revenue — the legacy pipeline compares Date fields with the query strings, so it answers []
  // (Phase 4).
  revenue: defineEndpoint({
    method: 'GET',
    path: '/orders/analytics/revenue',
    query: adminOrderAnalyticsQuerySchema,
    response: adminRevenueResponseSchema.shape.data,
  }),
};
