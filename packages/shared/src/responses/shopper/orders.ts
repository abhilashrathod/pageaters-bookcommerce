import type { z } from 'zod';

import { orderSchema } from '../../commerce/order.ts';
import { populatedCustomerOrderSchema } from '../../populated.ts';
import { apiResponse } from '../../primitives.ts';

// GET /orders/retrieve: the shopper's open checkout (status attempted or created), the controller's `select` with
// the address and the book and bundle lines populated like the order page. No status, payment, box or add-on lines
// (the select misspells `boxes` as `boxed`).
export const shopperCheckoutOrderSchema = orderSchema
  .pick({
    _id: true,
    orderId: true,
    userId: true,
    orderDate: true,
    subTotal: true,
    shipping: true,
    storeCredit: true,
    total: true,
    giftOptions: true,
    deliveryInstructions: true,
    orderHistory: true,
  })
  .extend({
    deliveryAddress: populatedCustomerOrderSchema.shape.deliveryAddress,
    products: populatedCustomerOrderSchema.shape.products,
    bundles: populatedCustomerOrderSchema.shape.bundles,
  });
export type ShopperCheckoutOrder = z.infer<typeof shopperCheckoutOrderSchema>;
export const shopperCheckoutOrderResponseSchema = apiResponse(shopperCheckoutOrderSchema);

// POST /orders/create: the total to pay and the order's ID; for an online payment also the Razorpay order ID that
// opens the checkout. Cash on delivery confirms the order right away.
export const shopperOrderCreateResultSchema = orderSchema
  .pick({ orderId: true, total: true, razorOrderId: true })
  .partial({ razorOrderId: true });
export type ShopperOrderCreateResult = z.infer<typeof shopperOrderCreateResultSchema>;
export const shopperOrderCreateResponseSchema = apiResponse(shopperOrderCreateResultSchema);
