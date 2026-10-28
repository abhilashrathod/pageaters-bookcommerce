import { z } from 'zod';

import { authorFieldsSchema } from './catalog/author.ts';
import { bookFieldsSchema } from './catalog/book.ts';
import { bundleFieldsSchema } from './catalog/bundle.ts';
import { addOnSchema } from './catalog/add-on.ts';
import { mysteryBoxSchema } from './catalog/mystery-box.ts';
import { addressSchema } from './commerce/address.ts';
import { cartAddOnItemSchema, cartBundleItemSchema, cartItemSchema, cartMysteryBoxItemSchema, cartSchema } from './commerce/cart.ts';
import { favoritesResponseSchema } from './commerce/favorites.ts';
import {
  customerOrderListItemSchema,
  customerOrderSchema,
  orderAddOnItemSchema,
  orderBoxItemSchema,
  orderBundleItemSchema,
  orderItemSchema,
} from './commerce/order.ts';
import { apiResponse, objectIdSchema } from './primitives.ts';

// Cart, order and favourites as the shopper's endpoints send them: references populated with the exact `select`
// of each controller (cart.controller.js `populateOptions`, order.controller.js `orderPopulateOptions`,
// favorites.controller.js `getAll`). Kept out of `commerce/` so commerce never imports the catalog.

const populatedAuthorSchema = authorFieldsSchema.pick({ _id: true, name: true, avatar: true });

// `select: 'bookId title poster author currentDiscount price'` (+ `availability` in the cart), author populated.
const orderBookSchema = bookFieldsSchema
  .pick({ _id: true, bookId: true, title: true, poster: true, currentDiscount: true, price: true })
  .extend({ author: populatedAuthorSchema.nullish() });
const cartBookSchema = orderBookSchema.extend({ availability: bookFieldsSchema.shape.availability });

// `select: 'bundleId title poster bundledBooks currentDiscount price'`; the bundled books stay ids.
const populatedBundleSchema = bundleFieldsSchema
  .pick({ _id: true, bundleId: true, title: true, poster: true, currentDiscount: true, price: true })
  .extend({ bundledBooks: z.array(objectIdSchema) });

const populatedAddOnSchema = addOnSchema.pick({
  _id: true,
  name: true,
  poster: true,
  currentDiscount: true,
  price: true,
});

const populatedMysteryBoxSchema = mysteryBoxSchema.pick({
  _id: true,
  boxId: true,
  title: true,
  images: true,
  currentDiscount: true,
  price: true,
});

// GET /cart.
export const populatedCartSchema = cartSchema.extend({
  products: z.array(cartItemSchema.extend({ product: cartBookSchema })),
  bundles: z.array(cartBundleItemSchema.extend({ bundle: populatedBundleSchema })),
  addOns: z.array(cartAddOnItemSchema.extend({ addOn: populatedAddOnSchema })),
  mysteryBoxes: z.array(cartMysteryBoxItemSchema.extend({ box: populatedMysteryBoxSchema })),
});
export type PopulatedCart = z.infer<typeof populatedCartSchema>;
export const cartResponseSchema = apiResponse(populatedCartSchema);

const populatedOrderLines = {
  deliveryAddress: addressSchema,
  products: z.array(orderItemSchema.extend({ product: orderBookSchema })),
  bundles: z.array(orderBundleItemSchema.extend({ bundle: populatedBundleSchema })),
  addOns: z.array(orderAddOnItemSchema.extend({ addOn: populatedAddOnSchema })),
  boxes: z.array(orderBoxItemSchema.extend({ box: populatedMysteryBoxSchema })),
};

// GET /orders/:uniqueId.
export const populatedCustomerOrderSchema = customerOrderSchema.extend(populatedOrderLines);
export type PopulatedCustomerOrder = z.infer<typeof populatedCustomerOrderSchema>;
export const customerOrderResponseSchema = apiResponse(populatedCustomerOrderSchema);

// GET /orders/list (its select has no add-on lines).
export const populatedCustomerOrderListItemSchema = customerOrderListItemSchema.extend({
  deliveryAddress: populatedOrderLines.deliveryAddress,
  products: populatedOrderLines.products,
  bundles: populatedOrderLines.bundles,
  boxes: populatedOrderLines.boxes,
});
export type PopulatedCustomerOrderListItem = z.infer<typeof populatedCustomerOrderListItemSchema>;

// GET /favorites: `wishlist` populated with the controller's select; the book's author stays an id.
export const populatedFavoritesSchema = favoritesResponseSchema.extend({
  wishlist: z.array(
    bookFieldsSchema
      .pick({
        _id: true,
        title: true,
        bookId: true,
        ISBN: true,
        inventory: true,
        poster: true,
        price: true,
        popularity: true,
        editorsPick: true,
        currentDiscount: true,
        newRelease: true,
        preOrder: true,
        bestSeller: true,
      })
      .extend({ author: objectIdSchema.nullish() }),
  ),
});
export type PopulatedFavorites = z.infer<typeof populatedFavoritesSchema>;
export const favoritesListResponseSchema = apiResponse(populatedFavoritesSchema);
