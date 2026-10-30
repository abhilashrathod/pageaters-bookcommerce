import { z } from 'zod';
import {
  cartAddOnAddPayloadSchema,
  cartBoxPreferencesSchema,
  cartItemAddPayloadSchema,
  cartResponseSchema,
  objectIdSchema,
  shopperCartWriteResponseSchema,
  shopperEmptyResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The shopper's cart (`apps/api/src/routes/cart.routes.js`). Every route needs the session and the cart cookies
// (no cart cookie → 400 `CART_NOT_EXIST`). Every write answers `true`, so read the cart again for prices. Items are
// addressed by the catalog ObjectId (never the public `bookId`…); the path params are named after the item kind
// here, whatever the route calls them. The admin cart views are 2c's.
//
// Payloads without a shared schema (bundle and box lines, quantity updates) are typed here from the API's
// controllers and listed for Phase 4. Quantity limits: 2 per book, 1 per bundle or box, 5 per add-on.
const write = shopperCartWriteResponseSchema.shape.data;
const quantity = z.number().int().min(1);

export const cart = {
  // GET /cart/retrieve — populated, with current line prices and `subTotal` recomputed. Also refreshes the cookie.
  detail: defineEndpoint({ method: 'GET', path: '/cart/retrieve', response: cartResponseSchema.shape.data }),
  // POST /cart/add — a book. `product` is required here: the shared schema keeps the legacy validator's optional
  // id, but the controller fails without one.
  add: defineEndpoint({
    method: 'POST',
    path: '/cart/add',
    body: cartItemAddPayloadSchema.required({ product: true }),
    response: write,
  }),
  // POST /cart/add/bundle — no validator in the legacy API; `quantity` defaults to 1, the only allowed value.
  addBundle: defineEndpoint({
    method: 'POST',
    path: '/cart/add/bundle',
    body: z.strictObject({ bundle: objectIdSchema, quantity: z.literal(1).optional() }),
    response: write,
  }),
  // POST /cart/add/box — a mystery box with the shopper's reading preferences (each '' by default).
  addBox: defineEndpoint({
    method: 'POST',
    path: '/cart/add/box',
    body: z.strictObject({
      box: objectIdSchema,
      preferences: cartBoxPreferencesSchema.partial().optional(),
      quantity: z.literal(1).optional(),
    }),
    response: write,
  }),
  // POST /cart/add/addOn — `quantity` defaults to 1; adding an add-on already in the cart adds to its quantity.
  addAddOn: defineEndpoint({
    method: 'POST',
    path: '/cart/add/addOn',
    body: cartAddOnAddPayloadSchema,
    response: write,
  }),
  // PUT /cart/update/:product — sets a book line's quantity.
  updateQuantity: defineEndpoint({
    method: 'PUT',
    path: '/cart/update/:product',
    body: z.strictObject({ quantity }),
    response: write,
  }),
  // PUT /cart/update/addOn/:addOn — sets an add-on line's quantity.
  updateAddOnQuantity: defineEndpoint({
    method: 'PUT',
    path: '/cart/update/addOn/:addOn',
    body: z.strictObject({ quantity }),
    response: write,
  }),
  // DELETE /cart/remove/:product
  remove: defineEndpoint({ method: 'DELETE', path: '/cart/remove/:product', response: write }),
  // DELETE /cart/remove/bundle/:bundle
  removeBundle: defineEndpoint({ method: 'DELETE', path: '/cart/remove/bundle/:bundle', response: write }),
  // DELETE /cart/remove/box/:box
  removeBox: defineEndpoint({ method: 'DELETE', path: '/cart/remove/box/:box', response: write }),
  // DELETE /cart/remove/addOn/:addOn
  removeAddOn: defineEndpoint({ method: 'DELETE', path: '/cart/remove/addOn/:addOn', response: write }),
  // DELETE /cart/empty — removes every line: books, bundles, mystery boxes and add-ons (the cart itself stays).
  empty: defineEndpoint({ method: 'DELETE', path: '/cart/empty', response: write }),
  // DELETE /cart/clear — clears the cart cookie (the cart itself stays); answers `{}`.
  clear: defineEndpoint({ method: 'DELETE', path: '/cart/clear', response: shopperEmptyResponseSchema.shape.data }),
};
