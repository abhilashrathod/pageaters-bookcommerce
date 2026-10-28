import { z } from 'zod';

import { cartSchema } from '../../commerce/cart.ts';
import { apiResponse } from '../../primitives.ts';

// Cart writes answer `true`, except POST /cart/add and /cart/add/addOn when the line is already in the cart: they
// raise its quantity and answer the updated cart document, unpopulated, with the stored (stale) `subTotal`.
// Re-read GET /cart/retrieve for prices either way.
export const shopperCartWriteSchema = z.literal(true);
export const shopperCartWriteResponseSchema = apiResponse(shopperCartWriteSchema);

export const shopperCartAddSchema = z.union([z.literal(true), cartSchema]);
export type ShopperCartAdd = z.infer<typeof shopperCartAddSchema>;
export const shopperCartAddResponseSchema = apiResponse(shopperCartAddSchema);
