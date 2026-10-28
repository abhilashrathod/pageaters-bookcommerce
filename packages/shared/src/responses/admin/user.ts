import { z } from 'zod';

import { cartAddOnItemSchema } from '../../commerce/cart.ts';
import { userSchema } from '../../commerce/user.ts';
import { populatedCartSchema, populatedCustomerOrderListItemSchema } from '../../populated.ts';
import { apiResponse, paginated } from '../../primitives.ts';
import { adminAddressSchema } from './common.ts';

// Customers as the admin routes send them (user.controller.js). Every user goes through `userSchema`: never a
// password, salt, OTP, token, rate-limit stamp or `razorPayCustId`. The legacy `getAll`, `getAllDetails` and `search`
// send whole user documents with all of those (Phase 4 fixes the API); parsing strips them.

// GET /users: customers (role USER) only, paged.
export const adminUserListResponseSchema = apiResponse(paginated(userSchema));

// GET /users/search?q=: users whose email matches, every role (admins included), not paged.
export const adminUserSearchResponseSchema = apiResponse(z.array(userSchema));

// GET /users/:id: the customer with their cart, address book and order history.
export const adminUserDetailsSchema = z.object({
  // null for an unknown id (the legacy route answers 200).
  user: userSchema.nullable(),
  // As the shopper's cart, except that add-on lines are not populated here; null when the user has no cart.
  cart: populatedCartSchema
    .omit({ isDeleted: true, deletedAt: true })
    .extend({ addOns: z.array(cartAddOnItemSchema) })
    .nullable(),
  // Every saved address. The legacy query includes soft-deleted ones (Phase 4 filters them).
  addresses: z.array(adminAddressSchema),
  // As the shopper's own order history (`GET /orders/list`), newest first, every status.
  orders: z.array(populatedCustomerOrderListItemSchema.extend({ deliveryAddress: adminAddressSchema })),
});
export type AdminUserDetails = z.infer<typeof adminUserDetailsSchema>;
export const adminUserDetailsResponseSchema = apiResponse(adminUserDetailsSchema);
