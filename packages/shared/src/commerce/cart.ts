import { z } from 'zod';

import { isoDateSchema, moneySchema, objectIdSchema } from '../primitives.ts';

// A shopper's cart (apps/api/src/models/cart.model.js). Each line kind is its own array with its own reference
// field; references are IDs here. GET /cart (and the admin cart view) populate them:
//   products[].product    → book (store book: bookId title poster author{name avatar} currentDiscount availability price)
//   bundles[].bundle      → bundle (bundleId title poster bundledBooks currentDiscount price)
//   addOns[].addOn        → add-on (name poster currentDiscount price)
//   mysteryBoxes[].box    → mystery box (boxId title images currentDiscount price)
//   user                  → user (fullName email), admin cart list only
// GET /cart also adds computed line prices; they are not stored, hence optional. `price` is the catalog's
// undiscounted unit price (e.g. `book.product.price`); only `productTotal` / `total` are discounted (quantity × unit
// price after discount, floored to whole rupees).

const quantity = z.number().int().positive();
// Legacy: the controllers pass `new Date()` into a String field, so Mongoose stores Date#toString(), not ISO.
const addedOn = z.string();

export const cartItemSchema = z.object({
  _id: objectIdSchema,
  product: objectIdSchema,
  quantity,
  addedOn,
  price: moneySchema.optional(),
  productTotal: moneySchema.optional(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartBundleItemSchema = z.object({
  _id: objectIdSchema,
  bundle: objectIdSchema,
  quantity,
  addedOn,
  total: moneySchema.optional(),
});
export type CartBundleItem = z.infer<typeof cartBundleItemSchema>;

export const cartAddOnItemSchema = z.object({
  _id: objectIdSchema,
  addOn: objectIdSchema,
  quantity,
  addedOn,
  price: moneySchema.optional(),
  total: moneySchema.optional(),
});
export type CartAddOnItem = z.infer<typeof cartAddOnItemSchema>;

// What the shopper tells us when adding a mystery box; copied onto the order's box line at checkout.
export const cartBoxPreferencesSchema = z.object({
  preferredAuthors: z.string(),
  preferredGenres: z.string(),
  favoriteBooks: z.string(),
  ignoredBooks: z.string(),
});
export type CartBoxPreferences = z.infer<typeof cartBoxPreferencesSchema>;

export const cartMysteryBoxItemSchema = z.object({
  _id: objectIdSchema,
  box: objectIdSchema,
  quantity,
  addedOn,
  preferences: cartBoxPreferencesSchema,
  price: moneySchema.optional(),
  total: moneySchema.optional(),
});
export type CartMysteryBoxItem = z.infer<typeof cartMysteryBoxItemSchema>;

export const cartSchema = z.object({
  _id: objectIdSchema,
  user: objectIdSchema,
  products: z.array(cartItemSchema),
  bundles: z.array(cartBundleItemSchema),
  addOns: z.array(cartAddOnItemSchema),
  mysteryBoxes: z.array(cartMysteryBoxItemSchema),
  // GET /cart recomputes it from current prices; the stored value is only reset to 0 after checkout.
  subTotal: moneySchema,
  isDeleted: z.boolean(),
  // Legacy free-form string, never set by an endpoint ('').
  deletedAt: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Cart = z.infer<typeof cartSchema>;
