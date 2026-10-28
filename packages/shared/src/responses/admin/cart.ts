import type { z } from 'zod';

import { cartSchema } from '../../commerce/cart.ts';
import { userSchema } from '../../commerce/user.ts';
import { populatedCartSchema } from '../../populated.ts';
import { apiResponse, paginated } from '../../primitives.ts';

// Carts as the admin routes send them (cart.controller.js `getAll`, `view`), without the soft-delete flags.

// GET /cart: every cart (the legacy query has no filter, soft-deleted carts included), lines as ids, the owner
// populated (`select: 'fullName email'`; null if the user document is gone).
export const adminCartListItemSchema = cartSchema.omit({ isDeleted: true, deletedAt: true }).extend({
  user: userSchema.pick({ _id: true, fullName: true, email: true }).nullable(),
});
export type AdminCartListItem = z.infer<typeof adminCartListItemSchema>;
export const adminCartListResponseSchema = apiResponse(paginated(adminCartListItemSchema));

// GET /cart/:id: populated as the shopper's own cart, `subTotal` recomputed from current prices.
export const adminCartSchema = populatedCartSchema.omit({ isDeleted: true, deletedAt: true });
export type AdminCart = z.infer<typeof adminCartSchema>;
export const adminCartResponseSchema = apiResponse(adminCartSchema);
