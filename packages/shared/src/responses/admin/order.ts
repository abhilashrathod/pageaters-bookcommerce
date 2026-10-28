import { z } from 'zod';

import { addOnSchema } from '../../catalog/add-on.ts';
import { bookFieldsSchema } from '../../catalog/book.ts';
import { bundleFieldsSchema } from '../../catalog/bundle.ts';
import { mysteryBoxSchema } from '../../catalog/mystery-box.ts';
import { orderAddOnItemSchema, orderBoxItemSchema, orderBundleItemSchema, orderItemSchema, orderSchema } from '../../commerce/order.ts';
import { populatedCustomerOrderSchema } from '../../populated.ts';
import { apiResponse, objectIdSchema, paginated } from '../../primitives.ts';
import { adminAddressSchema, adminCustomerSchema } from './common.ts';

// Orders as the admin routes send them (order.controller.js). `payment` is always the per-method summary
// (`orderPaymentSchema`): the legacy API sends the raw Razorpay entity (payer contact, card/bank/VPA details) on the
// routes that return the whole document (detail, search, ship, deliver); the contract rejects it and Phase 4 maps it
// through `orderPaymentInfo`.

// Lines as the list and search populate them (no posters or authors on books and bundles).
const listLines = {
  products: z.array(
    orderItemSchema.extend({
      product: bookFieldsSchema.pick({ _id: true, bookId: true, title: true, currentDiscount: true, price: true }),
    }),
  ),
  bundles: z.array(
    orderBundleItemSchema.extend({
      bundle: bundleFieldsSchema
        .pick({ _id: true, bundleId: true, title: true, currentDiscount: true, price: true })
        .extend({ bundledBooks: z.array(objectIdSchema) }),
    }),
  ),
  addOns: z.array(
    orderAddOnItemSchema.extend({
      addOn: addOnSchema.pick({ _id: true, name: true, poster: true, currentDiscount: true, price: true }),
    }),
  ),
  boxes: z.array(
    orderBoxItemSchema.extend({
      box: mysteryBoxSchema.pick({ _id: true, boxId: true, title: true, images: true, currentDiscount: true, price: true }),
    }),
  ),
};

// GET /orders: the controller's `select`, customer, address and lines populated. Attempted/created orders excluded.
export const adminOrderListItemSchema = orderSchema
  .pick({
    _id: true,
    orderId: true,
    orderDate: true,
    orderStatus: true,
    total: true,
  })
  .extend({
    userId: adminCustomerSchema,
    deliveryAddress: adminAddressSchema,
    ...listLines,
  });
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;
export const adminOrderListResponseSchema = apiResponse(paginated(adminOrderListItemSchema));

// GET /orders/search?q=: whole orders whose `orderId` matches, not paged; add-on lines stay ids.
export const adminOrderSearchItemSchema = orderSchema.extend({
  userId: adminCustomerSchema,
  deliveryAddress: adminAddressSchema,
  products: listLines.products,
  bundles: listLines.bundles,
  boxes: listLines.boxes,
});
export type AdminOrderSearchItem = z.infer<typeof adminOrderSearchItemSchema>;
export const adminOrderSearchResponseSchema = apiResponse(z.array(adminOrderSearchItemSchema));

// GET /orders/getById/:id: the whole order, lines populated as on the customer's order page; the customer stays an id.
export const adminOrderSchema = orderSchema.extend({
  deliveryAddress: adminAddressSchema,
  products: populatedCustomerOrderSchema.shape.products,
  bundles: populatedCustomerOrderSchema.shape.bundles,
  addOns: populatedCustomerOrderSchema.shape.addOns,
  boxes: populatedCustomerOrderSchema.shape.boxes,
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;
export const adminOrderResponseSchema = apiResponse(adminOrderSchema);

// POST /orders/ship and PATCH /orders/ship/:id/complete: the updated order with its customer and address populated
// (lines as ids).
export const adminOrderWithCustomerSchema = orderSchema.extend({
  userId: adminCustomerSchema,
  deliveryAddress: adminAddressSchema,
});
export type AdminOrderWithCustomer = z.infer<typeof adminOrderWithCustomerSchema>;
export const adminOrderWithCustomerResponseSchema = apiResponse(adminOrderWithCustomerSchema);

// GET /orders/analytics/best-selling: the ten books sold most, by quantity. `bookDetails` is empty when the book no
// longer exists. (The legacy pipeline matches a `status` field orders don't have, so it always answers [].)
export const adminBestSellingItemSchema = z.object({
  totalQuantity: z.number().int().nonnegative(),
  bookDetails: z.object({
    _id: objectIdSchema.optional(),
    title: z.string().optional(),
    author: objectIdSchema.nullish(),
  }),
});
export type AdminBestSellingItem = z.infer<typeof adminBestSellingItemSchema>;
export const adminBestSellingResponseSchema = apiResponse(z.array(adminBestSellingItemSchema));

// GET /orders/analytics/revenue: the sum of fulfilled orders' totals, as a one-element array ([] when none).
export const adminRevenueSchema = z.object({ totalRevenue: z.number().nonnegative() });
export type AdminRevenue = z.infer<typeof adminRevenueSchema>;
export const adminRevenueResponseSchema = apiResponse(z.array(adminRevenueSchema).max(1));

// POST /orders/create-shipment/:orderId: the carrier's booking result. The legacy API forwards Delhivery's whole
// create.json response; the contract keeps only the outcome and the waybill (the order's tracking URL is built from
// it), so vendor fields never reach a client. Phase 4 answers through the shipping adapter.
export const adminShipmentCreateResultSchema = z.object({
  success: z.literal(true),
  packages: z.array(z.object({ waybill: z.string().min(1) })).min(1),
});
export type AdminShipmentCreateResult = z.infer<typeof adminShipmentCreateResultSchema>;
export const adminShipmentCreateResponseSchema = apiResponse(adminShipmentCreateResultSchema);
