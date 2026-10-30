import { z } from 'zod';

import { orderRequestStatusSchema, orderRequestTypeSchema, orderStatusSchema, PaymentMethod } from '../enums.ts';
import { isoDateSchema, moneySchema, objectIdSchema } from '../primitives.ts';
import { cartBoxPreferencesSchema } from './cart.ts';

// An order (apps/api/src/models/order.model.js). References are IDs here; the order endpoints populate:
//   products[].product → book (store book: bookId title poster author{name avatar} currentDiscount price)
//   bundles[].bundle   → bundle (bundleId title poster bundledBooks currentDiscount price)
//   addOns[].addOn     → add-on (name poster currentDiscount price)
//   boxes[].box        → mystery box (boxId title images currentDiscount price [weight])
//   deliveryAddress    → address (addressSchema, whole document) — every order read populates it
//   userId             → user (fullName email contactNo), admin list, search and the request flows only
// Line prices are snapshots taken at checkout, so an order keeps its price when the catalog changes.

const quantity = z.number().int().positive();
// The catalog's `currentDiscount`: a percentage, not rupees.
const discountPercent = z.number().min(0).max(100);
// Shipping weight (the catalog's unit) × quantity.
const weight = z.number().nonnegative();

export const orderItemSchema = z.object({
  _id: objectIdSchema,
  product: objectIdSchema,
  quantity,
  price: moneySchema,
  discount: discountPercent,
  // quantity × discounted price (not floored, unlike the cart's subtotal).
  productTotal: moneySchema,
  weight,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderBundleItemSchema = z.object({
  _id: objectIdSchema,
  bundle: objectIdSchema,
  quantity,
  price: moneySchema,
  discount: discountPercent,
  total: moneySchema,
  weight,
});
export type OrderBundleItem = z.infer<typeof orderBundleItemSchema>;

// Add-ons carry no weight.
export const orderAddOnItemSchema = z.object({
  _id: objectIdSchema,
  addOn: objectIdSchema,
  quantity,
  price: moneySchema,
  discount: discountPercent,
  total: moneySchema,
});
export type OrderAddOnItem = z.infer<typeof orderAddOnItemSchema>;

export const orderBoxItemSchema = z.object({
  _id: objectIdSchema,
  box: objectIdSchema,
  quantity,
  price: moneySchema,
  discount: discountPercent,
  total: moneySchema,
  weight,
  preferences: cartBoxPreferencesSchema,
});
export type OrderBoxItem = z.infer<typeof orderBoxItemSchema>;

// Rentals exist in the model but no endpoint writes them (always []).
export const orderRentalItemSchema = z.object({
  _id: objectIdSchema,
  product: objectIdSchema,
  quantity,
});
export type OrderRentalItem = z.infer<typeof orderRentalItemSchema>;

// The timeline shown to the customer. `title` is usually an order status, but the return/replacement completion
// steps write 'Return Success' / 'Replacement Success', so it stays a string.
export const orderHistoryEntrySchema = z.object({
  _id: objectIdSchema,
  title: z.string(),
  description: z.string(),
  time: isoDateSchema,
});
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>;

// A customer's cancel / return / replace request on the order (`requests[]`). The model types `type` and `status`
// as free strings defaulting to ''; the API only writes the enum values.
export const orderCustomerRequestSchema = z.object({
  _id: objectIdSchema,
  type: orderRequestTypeSchema,
  date: isoDateSchema,
  info: z.object({ reason: z.string(), comments: z.string() }),
  status: orderRequestStatusSchema,
  // Return shipment tracking reference while in progress, '' otherwise.
  shipment: z.string(),
  // IDs of the books / bundles the request covers (stored as strings, never populated). Empty for a cancel.
  books: z.array(objectIdSchema),
  bundles: z.array(objectIdSchema),
});
export type OrderCustomerRequest = z.infer<typeof orderCustomerRequestSchema>;

// The payment as any client may see it: the per-method summary built by `orderPaymentInfo` (helpers/order.helper.js).
// This is the contract for every order response, owner and admin alike. Today the API stores the raw Razorpay
// `payment.entity` on the order (order.controller.js:299, :1184), and the admin GET /orders/getById/:id returns it
// raw (payer email, phone, card/bank/VPA details). This schema intentionally rejects that shape; Phase 4 fixes the
// API to map through `orderPaymentInfo` and store only the summary.
const emiDetail = z.union([z.string(), z.number()]);
export const orderPaymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal(PaymentMethod.CARD), name: z.string(), last4: z.string(), network: z.string() }),
  z.object({ method: z.literal(PaymentMethod.NET_BANKING), bank: z.string() }),
  z.object({ method: z.literal(PaymentMethod.UPI), upi_id: z.string() }),
  z.object({ method: z.literal(PaymentMethod.WALLET), wallet: z.string() }),
  // Legacy mapping kept as-is: name ← emi.issuer, last4 ← emi.rate, network ← emi.duration.
  z.object({ method: z.literal(PaymentMethod.EMI), name: z.string(), last4: emiDetail, network: emiDetail }),
  z.object({ method: z.literal(PaymentMethod.COD) }),
]);
export type OrderPayment = z.infer<typeof orderPaymentSchema>;

export const orderGiftOptionsSchema = z.object({
  isGift: z.boolean(),
  details: z.object({
    package: z.string(),
    // Gift wrapping charge in rupees, added to the total.
    cost: moneySchema,
    message: z.string(),
    from: z.string(),
  }),
});
export type OrderGiftOptions = z.infer<typeof orderGiftOptionsSchema>;

export const orderSchema = z.object({
  _id: objectIdSchema,
  // 'OD-' plus 10 digits; the ID customers see and the storefront's order URLs use.
  orderId: z.string().regex(/^OD-\d{10}$/),
  userId: objectIdSchema,
  // The model defaults it to '', but every write path sets a status before saving (checkout creates the order as
  // `attempted`), so a response never carries ''. The schema rejects '' instead of widening the enum for it.
  orderStatus: orderStatusSchema,
  // '' while the order is only attempted; set at checkout.
  orderDate: z.union([isoDateSchema, z.literal('')]),
  deliveryAddress: objectIdSchema,
  deliveryInstructions: z.string(),
  // '' until shipped, then the carrier's tracking URL.
  shipmentTrackingId: z.string(),

  products: z.array(orderItemSchema),
  bundles: z.array(orderBundleItemSchema),
  addOns: z.array(orderAddOnItemSchema),
  boxes: z.array(orderBoxItemSchema),
  rentals: z.array(orderRentalItemSchema),

  orderHistory: z.array(orderHistoryEntrySchema),
  requests: z.array(orderCustomerRequestSchema),
  giftOptions: orderGiftOptionsSchema,

  // Razorpay identifiers ('' for cash on delivery). Not secrets; no signature or key is stored on the order.
  razorOrderId: z.string(),
  razorPaymentId: z.string(),
  // null until checkout (cash on delivery) or payment capture (online); absent when `orderPaymentInfo` meets a method
  // outside the six it handles (it returns undefined).
  payment: orderPaymentSchema.nullish(),

  // Not implemented in the API: always null.
  giftCard: objectIdSchema.nullable(),
  discount: objectIdSchema.nullable(),
  // The DEBIT transaction when store credit was spent, else null.
  storeCreditTransaction: objectIdSchema.nullable(),
  // Admin view only (not in customerOrderSchema). The Razorpay refund ids (`rfnd_…`) the refund webhook recorded;
  // absent until the first refund.
  refundIds: z.array(z.string()).optional(),
  // Giving the spent store credit back after a full refund: `pending` (to do), `crediting` (the CREDIT transaction is
  // recorded; the balance step may still run), `returned`. Absent when nothing is to be given back.
  storeCreditReturn: z.enum(['pending', 'crediting', 'returned']).optional(),

  // Money, in rupees: total = subTotal + shipping + gift wrapping − storeCredit.
  subTotal: moneySchema,
  shipping: moneySchema,
  storeCredit: moneySchema,
  total: moneySchema,
  weight,

  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Order = z.infer<typeof orderSchema>;

// GET /orders/:uniqueId — the owner's order page. The API selects these fields only: no Razorpay IDs, no
// requests, and `payment` as the summary above (the same contract as orderSchema).
export const customerOrderSchema = orderSchema.pick({
  _id: true,
  orderId: true,
  orderDate: true,
  orderStatus: true,
  deliveryAddress: true,
  shipmentTrackingId: true,
  giftOptions: true,
  orderHistory: true,
  payment: true,
  products: true,
  addOns: true,
  bundles: true,
  boxes: true,
  subTotal: true,
  shipping: true,
  storeCredit: true,
  total: true,
});
export type CustomerOrder = z.infer<typeof customerOrderSchema>;

// GET /orders/list — the owner's order history (order.controller.js `getAllByUser` select).
// The admin list (`getAll`) and the attempted-order `retrieve` picks are added at merge.
export const customerOrderListItemSchema = orderSchema.pick({
  _id: true,
  orderId: true,
  orderDate: true,
  deliveryAddress: true,
  orderStatus: true,
  shipmentTrackingId: true,
  products: true,
  boxes: true,
  bundles: true,
  total: true,
});
export type CustomerOrderListItem = z.infer<typeof customerOrderListItemSchema>;
